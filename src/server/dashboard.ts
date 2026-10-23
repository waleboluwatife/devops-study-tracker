// Everything the dashboard shows, computed from the rules engine.
import {
  activeMembers, dailyStreak, daysUntil, isVerified, meetingLead, reviewerAssignments, standings,
  verifiedHours, weekNumber, weekPace, weekRange,
} from '@/lib/rules';
import { prisma } from './db';
import { getRoundContext } from './context';
import { isoDate } from './viewer';

export type Stage = 'pass' | 'fail' | 'wait';

export async function getDashboard() {
  const c = await getRoundContext();
  const { v, data, me, meMember, today, name } = c;
  const { settings, members, logs } = data;
  const week = v.week;
  const [syllabusWeek, reviewRows, open] = await Promise.all([
    prisma.syllabusWeek.findUnique({ where: { roundId_weekNumber: { roundId: v.round.id, weekNumber: week } } }),
    prisma.peerReview.findMany({ where: { roundId: v.round.id, week } }),
    prisma.focusSession.findMany({
      where: { endedAt: null, startedAt: { gte: new Date(Date.now() - 8 * 3_600_000) }, roundMember: { roundId: v.round.id } },
    }),
  ]);
  const pairs = reviewerAssignments(members, week);
  const iReview = me ? [...pairs].find(([, reviewer]) => reviewer === me)?.[0] ?? null : null;
  const scored = (id: string) => data.scores.find(s => s.memberId === id && s.week === week);
  const meetingOver = Date.now() > c.meeting.start.getTime() + c.meeting.minutes * 60_000;

  // Each member's week as a CI pipeline.
  const pipelines = activeMembers(members, week).map(m => {
    const hours = verifiedHours(logs, m, week, settings.startDate);
    const s = scored(m.id);
    const review = reviewRows.find(r => r.revieweeId === m.id);
    const flag = (ok: boolean | undefined): Stage => (ok ? 'pass' : s && meetingOver ? 'fail' : 'wait');
    const stages: { label: string; state: Stage; detail: string }[] = [
      { label: 'Study', state: hours >= settings.minVerifiedHoursPerWeek ? 'pass' : v.rawWeek > week ? 'fail' : 'wait', detail: `${hours} of ${settings.minVerifiedHoursPerWeek} verified hours` },
      { label: 'Presented', state: flag(s?.studiedAndPresented), detail: 'Presented at the Saturday meeting' },
      { label: 'GitHub push', state: s?.githubPushed ? 'pass' : flag(false), detail: 'Deliverable pushed to GitHub' },
      { label: 'LinkedIn', state: flag(s?.linkedinPosted), detail: 'Posted on LinkedIn' },
      { label: 'Peer review', state: review?.signedOff ? 'pass' : flag(false), detail: 'Signed off by the reviewer' },
    ];
    return {
      id: m.id, name: name(m.id), reviewer: name(pairs.get(m.id)), hours,
      short: Math.max(0, Math.round((settings.minVerifiedHoursPerWeek - hours) * 100) / 100),
      waiting: logs.filter(l => l.memberId === m.id && l.screenshotUrl && !isVerified(l)).length,
      stages,
    };
  });

  const board = standings(data, week)
    .map(s => ({ ...s, name: name(s.memberId), streak: dailyStreak(logs, members.find(m => m.id === s.memberId)!, settings.startDate, today) }))
    .sort((a, b) => b.verifiedHours - a.verifiedHours || b.perfectWeeks - a.perfectWeeks || a.name.localeCompare(b.name));

  const perWeek = Array.from({ length: week }, (_, i) => {
    const w = i + 1;
    return { week: w, hours: Math.round(activeMembers(members, w).reduce((sum, m) => sum + verifiedHours(logs, m, w, settings.startDate), 0) * 100) / 100 };
  });

  const myHours = meMember ? verifiedHours(logs, meMember, week, settings.startDate) : 0;
  const myOpen = open.find(o => o.roundMemberId === me) ?? null;
  return {
    week, range: weekRange(week, settings.startDate), syllabusWeek,
    lead: name(meetingLead(members, week)),
    iReview: iReview ? name(iReview) : null,
    reviewedBy: me ? name(pairs.get(me)) : null,
    daysLeft: daysUntil(isoDate(v.round.targetFinishDate), today),
    minHours: settings.minVerifiedHoursPerWeek,
    myHours,
    pace: weekPace(myHours, settings.minVerifiedHoursPerWeek, today, week, settings.startDate),
    myStreak: meMember ? dailyStreak(logs, meMember, settings.startDate, today) : 0,
    studiedToday: logs.some(l => l.memberId === me && l.date === today),
    todayHours: Math.round(logs.filter(l => l.memberId === me && l.date === today).reduce((s, l) => s + l.hours, 0) * 100) / 100,
    studyingNow: open.filter(o => o.roundMemberId !== me).map(o => ({ name: name(o.roundMemberId), minutes: Math.round((Date.now() - o.startedAt.getTime()) / 60_000) })),
    myFocusStartedAt: myOpen ? myOpen.startedAt.toISOString() : null,
    meeting: { start: c.meeting.start.toISOString(), link: c.meeting.link },
    pipelines, board, perWeek,
    toVerify: me ? logs.filter(l => l.memberId !== me && l.screenshotUrl && !isVerified(l)).length : 0,
    weekOf: (date: string) => weekNumber(date, settings.startDate),
    today,
    timezone: v.group.timezone,
  };
}
