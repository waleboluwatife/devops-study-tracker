// Loads a round from the database and maps it into the rules engine's plain shapes.
import type { PrismaClient } from '@prisma/client';
import { meetingStart, type RoundData } from '@/lib/rules';

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export async function loadRoundData(prisma: PrismaClient, roundId: string): Promise<RoundData> {
  const round = await prisma.round.findUniqueOrThrow({
    where: { id: roundId },
    include: { group: true, roundMembers: true, logs: true, scores: true, reviews: true, payments: true, carryOvers: true },
  });
  const g = round.group;
  const now = Date.now();
  const meetingOpen = (week: number) =>
    meetingStart(week, isoDate(round.startDate), g.meetingTime, g.timezone).getTime() + g.meetingMinutes * 60_000 > now;
  return {
    settings: {
      startDate: isoDate(round.startDate),
      totalWeeks: round.totalWeeks,
      timezone: g.timezone,
      fineMissedPerMember: g.fineMissedPerMember,
      fineLateFlat: g.fineLateFlat,
      minVerifiedHoursPerWeek: g.minVerifiedHoursPerWeek,
      shortHoursFineEnabled: g.shortHoursFineEnabled,
      shortHoursFine: g.shortHoursFine,
    },
    // Rules work on round-member ids.
    members: round.roundMembers.map(m => ({ id: m.id, joinedWeek: m.joinedWeek, joinOrder: m.joinOrder })),
    logs: round.logs.map(l => ({
      id: l.id, memberId: l.roundMemberId, date: isoDate(l.date), hours: l.hours, labs: l.labsDone,
      screenshotUrl: l.screenshotUrl, verifiedById: l.verifiedById,
    })),
    scores: round.scores.map(s => ({
      memberId: s.roundMemberId, week: s.week, attended: s.attended, late15Plus: s.late15Plus,
      studiedAndPresented: s.studiedAndPresented, githubPushed: s.githubPushed,
      linkedinPosted: s.linkedinPosted, waiverRequested48h: s.waiverRequested48h,
      meetingOpen: meetingOpen(s.week),
    })),
    reviews: round.reviews.map(r => ({ week: r.week, revieweeId: r.revieweeId, reviewerId: r.reviewerId, signedOff: r.signedOff })),
    payments: round.payments.map(p => ({ memberId: p.roundMemberId, amount: p.amount })),
    carryOvers: round.carryOvers.map(c => ({ memberId: c.roundMemberId, amount: c.amount })),
  };
}
