// Who is looking at the page: their member record, group and active round.
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { auth, normalizeEmail } from '@/auth';
import { currentWeek } from '@/lib/rules';
import { prisma } from './db';

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
export const dbDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

export const getViewer = cache(async () => {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!email) redirect('/signin');

  // One active group in the UI; a person may belong to several (first joined wins).
  const member = await prisma.member.findFirst({
    where: { email },
    orderBy: { createdAt: 'asc' },
    include: { group: true },
  });
  if (!member) redirect('/signin?error=not-invited');

  if (!member.userId && session?.user?.id) {
    await prisma.member.update({ where: { id: member.id }, data: { userId: session.user.id } }).catch(() => {});
  }

  const round = await prisma.round.findFirst({
    where: { groupId: member.groupId, status: 'ACTIVE' },
    orderBy: { number: 'desc' },
  });
  if (!round) throw new Error('This group has no active round.');

  const roundMember = await prisma.roundMember.findUnique({
    where: { roundId_memberId: { roundId: round.id, memberId: member.id } },
  });
  const startDate = isoDate(round.startDate);
  const week = currentWeek(startDate, member.group.timezone);

  return {
    email,
    member,
    group: member.group,
    round,
    roundMember,
    startDate,
    /** Week of the round today, clamped to the round. */
    week: Math.min(Math.max(week, 1), round.totalWeeks),
    rawWeek: week,
    isAdmin: member.isAdmin,
  };
});

export type Viewer = Awaited<ReturnType<typeof getViewer>>;

export async function requireAdmin() {
  const viewer = await getViewer();
  if (!viewer.isAdmin) throw new Error('Only admins can do that.');
  return viewer;
}

/** Display names for the round's members, keyed by round-member id. */
export async function roundMemberNames(roundId: string) {
  const rms = await prisma.roundMember.findMany({
    where: { roundId },
    include: { member: true },
    orderBy: { joinOrder: 'asc' },
  });
  return new Map(rms.map(rm => [rm.id, rm.member.displayName]));
}
