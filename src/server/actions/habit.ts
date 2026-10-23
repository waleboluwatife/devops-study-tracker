'use server';
// Focus sessions ("studying now") and nudges.
import { revalidatePath } from 'next/cache';
import { canNudge } from '@/lib/rules';
import { prisma } from '../db';
import { logActivity } from '../activity';
import { getViewer, roundMemberNames } from '../viewer';
import type { ActionState } from './logs';

const MAX_SESSION_MIN = 8 * 60;

export async function startFocus(): Promise<ActionState> {
  const v = await getViewer();
  if (!v.roundMember) return { error: 'You are not part of this round.' };
  const open = await prisma.focusSession.findFirst({ where: { roundMemberId: v.roundMember.id, endedAt: null } });
  if (!open) await prisma.focusSession.create({ data: { roundMemberId: v.roundMember.id } });
  revalidatePath('/', 'layout');
  return { ok: 'Focus session started.' };
}

/** Ends the open session and returns its length in hours (rounded to 15 minutes) for the log form. */
export async function stopFocus(): Promise<ActionState & { hours?: number }> {
  const v = await getViewer();
  if (!v.roundMember) return { error: 'You are not part of this round.' };
  const open = await prisma.focusSession.findFirst({ where: { roundMemberId: v.roundMember.id, endedAt: null } });
  if (!open) return { error: 'No session is running.' };
  const now = new Date();
  const minutes = Math.min(MAX_SESSION_MIN, Math.max(1, Math.round((now.getTime() - open.startedAt.getTime()) / 60_000)));
  await prisma.focusSession.update({ where: { id: open.id }, data: { endedAt: now } });
  revalidatePath('/', 'layout');
  return { ok: `Session ended after ${minutes} min.`, hours: Math.max(0.25, Math.round((minutes / 60) * 4) / 4) };
}

export async function nudge(toId: string): Promise<ActionState> {
  const v = await getViewer();
  if (!v.roundMember) return { error: 'You are not part of this round.' };
  if (toId === v.roundMember.id) return { error: 'You cannot nudge yourself.' };
  const target = await prisma.roundMember.findFirst({ where: { id: toId, roundId: v.round.id } });
  if (!target) return { error: 'Member not found.' };
  const previous = await prisma.nudge.findMany({ where: { fromId: v.roundMember.id, toId }, orderBy: { createdAt: 'desc' }, take: 1 });
  if (!canNudge(previous.map(n => n.createdAt), new Date())) return { error: 'You already nudged them today.' };
  await prisma.nudge.create({ data: { roundId: v.round.id, fromId: v.roundMember.id, toId } });
  const names = await roundMemberNames(v.round.id);
  await logActivity(v.round.id, '👋', `${v.member.displayName} nudged ${names.get(toId)}`);
  revalidatePath('/', 'layout');
  return { ok: `${names.get(toId)} will see your nudge.` };
}
