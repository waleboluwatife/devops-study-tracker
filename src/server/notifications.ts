// The signed-in member's notifications (also the count on the 🔔).
import { cache } from 'react';
import { isVerified, notificationsFor, revieweeOf, verifiedHours, weekPace } from '@/lib/rules';
import { prisma } from './db';
import { getRoundContext } from './context';

export const getNotifications = cache(async () => {
  const c = await getRoundContext();
  if (!c.me || !c.meMember) return { list: [], toVerify: 0 };
  const { v, data, me, meMember, today } = c;
  const now = new Date();
  const [rsvp, score, nudges, reviews] = await Promise.all([
    prisma.meetingRsvp.findUnique({ where: { roundMemberId_week: { roundMemberId: me, week: v.week } } }),
    prisma.weeklyScore.findUnique({ where: { roundMemberId_week: { roundMemberId: me, week: v.week } } }),
    prisma.nudge.findMany({ where: { toId: me, createdAt: { gte: new Date(now.getTime() - 24 * 3_600_000) } } }),
    prisma.peerReview.findMany({ where: { roundId: v.round.id, week: v.week, reviewerId: me } }),
  ]);
  const toVerify = data.logs.filter(l => l.memberId !== me && l.screenshotUrl && !isVerified(l)).length;
  const pace = weekPace(verifiedHours(data.logs, meMember, v.week, v.startDate), v.group.minVerifiedHoursPerWeek, today, v.week, v.startDate);
  const msToMeeting = c.meeting.start.getTime() - now.getTime();
  const reviewee = revieweeOf(data.members, v.week, me);
  const reviewDone = reviews.some(r => r.revieweeId === reviewee && r.signedOff);
  const list = notificationsFor({
    toVerify,
    msToMeeting,
    meetingMinutes: c.meeting.minutes,
    rsvpGiven: Boolean(rsvp),
    checkedIn: Boolean(score?.checkedInAt),
    hoursLeft: v.rawWeek >= 1 ? pace.left : 0,
    daysLeft: pace.daysLeft,
    reviewToSign: reviewee && !reviewDone && msToMeeting < 24 * 3_600_000 ? c.name(reviewee) : null,
    deliverablePushed: Boolean(score?.githubLink || score?.githubPushed),
    nudgedBy: [...new Set(nudges.map(n => c.name(n.fromId)))],
    studiedToday: data.logs.some(l => l.memberId === me && l.date === today),
  });
  return { list, toVerify };
});
