// Everything most pages need about the current round, loaded once per request.
import { cache } from 'react';
import { meetingStart, todayIn } from '@/lib/rules';
import { prisma } from './db';
import { loadRoundData } from './round-data';
import { getViewer, roundMemberNames } from './viewer';

export const getRoundContext = cache(async () => {
  const v = await getViewer();
  const [data, names] = await Promise.all([loadRoundData(prisma, v.round.id), roundMemberNames(v.round.id)]);
  const tz = v.group.timezone;
  const me = v.roundMember?.id ?? null;
  const meMember = data.members.find(m => m.id === me) ?? null;
  return {
    v, data, names, me, meMember,
    today: todayIn(tz),
    name: (id: string | null | undefined) => (id ? names.get(id) ?? '?' : '—'),
    meeting: {
      start: meetingStart(v.week, v.startDate, v.group.meetingTime, tz),
      minutes: v.group.meetingMinutes,
      link: v.group.meetingLink,
    },
  };
});

export type RoundContext = Awaited<ReturnType<typeof getRoundContext>>;
