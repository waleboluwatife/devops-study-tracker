// Everything the dashboard shows, computed from the rules engine.
import {
  activeMembers, daysUntil, isVerified, meetingLead, reviewerAssignments, standings,
  todayIn, verifiedHours, weekNumber, weekRange, weekStatus,
} from '@/lib/rules';
import { prisma } from './db';
import { loadRoundData } from './round-data';
import { isoDate, roundMemberNames, type Viewer } from './viewer';

export async function getDashboard(v: Viewer) {
  const [data, names, syllabusWeek, reviewRows] = await Promise.all([
    loadRoundData(prisma, v.round.id),
    roundMemberNames(v.round.id),
    prisma.syllabusWeek.findUnique({ where: { roundId_weekNumber: { roundId: v.round.id, weekNumber: v.week } } }),
    prisma.peerReview.findMany({ where: { roundId: v.round.id, week: v.week } }),
  ]);
  const { settings, members, logs } = data;
  const week = v.week;
  const me = v.roundMember?.id ?? null;
  const name = (id: string | null | undefined) => (id ? names.get(id) ?? '?' : '—');
  const pairs = reviewerAssignments(members, week);
  const iReview = me ? [...pairs].find(([, reviewer]) => reviewer === me)?.[0] ?? null : null;
  const today = todayIn(settings.timezone);

  const board = standings(data, week)
    .map(s => ({ ...s, name: name(s.memberId) }))
    .sort((a, b) => b.verifiedHours - a.verifiedHours || b.perfectWeeks - a.perfectWeeks || a.name.localeCompare(b.name));

  const accountability = activeMembers(members, week).map(m => {
    const hours = verifiedHours(logs, m, week, settings.startDate);
    const reviewer = pairs.get(m.id) ?? null;
    const reviewee = [...pairs].find(([, r]) => r === m.id)?.[0] ?? null;
    const received = reviewRows.find(r => r.revieweeId === m.id);
    const given = reviewee ? reviewRows.find(r => r.revieweeId === reviewee) : undefined;
    const waiting = logs.filter(l => l.memberId === m.id && l.screenshotUrl && !isVerified(l)).length;
    const noProof = logs.filter(l => l.memberId === m.id && !l.screenshotUrl && weekNumber(l.date, settings.startDate) === week).length;
    return {
      memberId: m.id, name: name(m.id), hours,
      status: weekStatus(hours, settings.minVerifiedHoursPerWeek),
      reviews: name(reviewee), reviewedBy: name(reviewer),
      reviewGiven: Boolean(given?.signedOff), reviewReceived: Boolean(received?.signedOff),
      waitingVerification: waiting, noProof,
    };
  });

  // Group verified hours for each week so far.
  const perWeek = Array.from({ length: week }, (_, i) => {
    const w = i + 1;
    return { week: w, hours: Math.round(activeMembers(members, w).reduce((s, m) => s + verifiedHours(logs, m, w, settings.startDate), 0) * 100) / 100 };
  });

  const toVerify = me ? logs.filter(l => l.memberId !== me && l.screenshotUrl && !isVerified(l)).length : 0;

  return {
    week, totalWeeks: v.round.totalWeeks, range: weekRange(week, settings.startDate),
    syllabusWeek,
    lead: name(meetingLead(members, week)),
    iReview: iReview ? name(iReview) : null,
    reviewedBy: me ? name(pairs.get(me)) : null,
    daysLeft: daysUntil(isoDate(v.round.targetFinishDate), today),
    targetFinishDate: isoDate(v.round.targetFinishDate),
    minHours: settings.minVerifiedHoursPerWeek,
    myHours: me ? verifiedHours(logs, members.find(m => m.id === me)!, week, settings.startDate) : 0,
    board, accountability, perWeek, toVerify,
  };
}
