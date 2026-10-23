'use server';
// Weekly meeting: RSVP (with the 48-hour waiver rule), check-in, deliverable
// link, notes, and the admin's meeting settings.
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { checkinState, waiverAllowed } from '@/lib/rules';
import { prisma } from '../db';
import { logActivity } from '../activity';
import { getRoundContext } from '../context';
import { requireAdmin } from '../viewer';
import type { ActionState } from './logs';

const fail = (e: unknown): ActionState => ({ error: e instanceof z.ZodError ? e.issues[0].message : (e as Error).message });

async function mine() {
  const c = await getRoundContext();
  if (!c.me) throw new Error('You are not part of this round.');
  if (c.v.rawWeek < 1) throw new Error('The round has not started yet.');
  return { ...c, me: c.me };
}

/** Score row for me this week (created on first use). */
function myScore(roundId: string, roundMemberId: string, week: number) {
  return prisma.weeklyScore.upsert({
    where: { roundMemberId_week: { roundMemberId, week } },
    update: {},
    create: { roundId, roundMemberId, week },
  });
}

export async function rsvp(status: 'GOING' | 'LATE' | 'CANT'): Promise<ActionState & { waiver?: boolean }> {
  try {
    if (!['GOING', 'LATE', 'CANT'].includes(status)) return { error: 'Unknown answer.' };
    const c = await mine();
    const week = c.v.week;
    await prisma.meetingRsvp.upsert({
      where: { roundMemberId_week: { roundMemberId: c.me, week } },
      update: { status }, create: { roundId: c.v.round.id, roundMemberId: c.me, week, status },
    });
    // "Can't make it" 48h+ ahead is the waiver request; it only counts if early enough.
    const waiver = status === 'CANT' && waiverAllowed(new Date(), c.meeting.start);
    await myScore(c.v.round.id, c.me, week);
    await prisma.weeklyScore.update({ where: { roundMemberId_week: { roundMemberId: c.me, week } }, data: { waiverRequested48h: waiver } });
    await logActivity(c.v.round.id, status === 'CANT' ? '🙅' : '🙋', `${c.v.member.displayName} ${status === 'GOING' ? 'is coming to' : status === 'LATE' ? 'will be late to' : "can't make"} the week ${week} meeting${status === 'CANT' ? (waiver ? ' (waiver requested in time)' : ' (too late for a waiver)') : ''}`);
    revalidatePath('/', 'layout');
    return { ok: 'Saved.', waiver };
  } catch (e) { return fail(e); }
}

export async function checkIn(): Promise<ActionState> {
  try {
    const c = await mine();
    const state = checkinState(new Date(), c.meeting.start, c.meeting.minutes);
    if (!state.open) return { error: state.reason === 'early' ? 'Check-in opens 15 minutes before the meeting.' : 'This meeting is over.' };
    const score = await myScore(c.v.round.id, c.me, c.v.week);
    if (score.checkedInAt) return { ok: 'You are already checked in.' };
    await prisma.weeklyScore.update({ where: { id: score.id }, data: { checkedInAt: new Date(), attended: true, late15Plus: state.late } });
    await logActivity(c.v.round.id, state.late ? '⏰' : '✋', `${c.v.member.displayName} checked in${state.late ? ' late' : ''}`);
    revalidatePath('/', 'layout');
    return { ok: state.late ? 'Checked in — marked late (more than 15 minutes).' : 'Checked in. You are marked present.' };
  } catch (e) { return fail(e); }
}

const Link = z.string().trim().max(300).refine(s => s === '' || /^https?:\/\//.test(s), 'Paste a full link starting with https://');

export async function setDeliverable(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const c = await mine();
    const link = Link.parse(String(form.get('link') ?? ''));
    const score = await myScore(c.v.round.id, c.me, c.v.week);
    await prisma.weeklyScore.update({ where: { id: score.id }, data: { githubLink: link || null, githubPushed: Boolean(link) || score.githubPushed } });
    if (link) await logActivity(c.v.round.id, '📦', `${c.v.member.displayName} shared their week ${c.v.week} deliverable`);
    revalidatePath('/', 'layout');
    return { ok: link ? 'Deliverable link saved.' : 'Link removed.' };
  } catch (e) { return fail(e); }
}

export async function saveMeetingNotes(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const v = await requireAdmin();
    const week = Number(form.get('week'));
    if (!Number.isInteger(week) || week < 1 || week > v.round.totalWeeks) return { error: 'Pick a week.' };
    const notes = String(form.get('notes') ?? '').trim().slice(0, 4000);
    const recordingUrl = Link.parse(String(form.get('recordingUrl') ?? '')) || null;
    await prisma.meeting.upsert({
      where: { roundId_week: { roundId: v.round.id, week } },
      update: { notes, recordingUrl }, create: { roundId: v.round.id, week, notes, recordingUrl },
    });
    revalidatePath('/meetings');
    return { ok: 'Notes saved.' };
  } catch (e) { return fail(e); }
}

const MeetingSettings = z.object({
  meetingLink: Link,
  meetingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a time like 19:00.'),
  meetingMinutes: z.coerce.number().int().min(15).max(300),
});

export async function saveMeetingSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const v = await requireAdmin();
    const input = MeetingSettings.parse(Object.fromEntries(form));
    await prisma.group.update({ where: { id: v.group.id }, data: { ...input, meetingLink: input.meetingLink || null } });
    revalidatePath('/', 'layout');
    return { ok: 'Meeting settings saved.' };
  } catch (e) { return fail(e); }
}
