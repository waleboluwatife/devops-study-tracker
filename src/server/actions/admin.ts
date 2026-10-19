'use server';
// Admin-only actions: group settings, members, syllabus.
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { normalizeEmail } from '@/auth';
import { prisma } from '../db';
import { requireAdmin } from '../viewer';
import type { ActionState } from './logs';

const fail = (e: unknown): ActionState => ({ error: e instanceof z.ZodError ? e.issues[0].message : (e as Error).message });
const checkbox = z.preprocess(v => v === 'on' || v === 'true' || v === true, z.boolean());

const Settings = z.object({
  name: z.string().trim().min(1, 'Group name is required.').max(80),
  fineMissedPerMember: z.coerce.number().int().min(0).max(1_000_000),
  fineLateFlat: z.coerce.number().int().min(0).max(1_000_000),
  minVerifiedHoursPerWeek: z.coerce.number().min(0).max(80),
  shortHoursFineEnabled: checkbox,
  shortHoursFine: z.coerce.number().int().min(0).max(1_000_000),
  targetFinishDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a target date.'),
});

export async function saveSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const v = await requireAdmin();
    const { targetFinishDate, ...group } = Settings.parse(Object.fromEntries(form));
    await prisma.$transaction([
      prisma.group.update({ where: { id: v.group.id }, data: group }),
      prisma.round.update({ where: { id: v.round.id }, data: { targetFinishDate: new Date(`${targetFinishDate}T00:00:00Z`) } }),
    ]);
    revalidatePath('/', 'layout');
    return { ok: 'Settings saved.' };
  } catch (e) { return fail(e); }
}

const MemberInput = z.object({
  memberId: z.string().optional(),
  displayName: z.string().trim().min(1, 'Name is required.').max(60),
  email: z.string().trim().transform(normalizeEmail).pipe(z.union([z.literal(''), z.string().email('That email doesn’t look right.')])),
  joinedWeek: z.coerce.number().int().min(1).max(200),
  isAdmin: checkbox,
});

export async function saveMember(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const v = await requireAdmin();
    const input = MemberInput.parse(Object.fromEntries(form));
    const email = input.email || null;
    if (email) {
      const clash = await prisma.member.findFirst({ where: { groupId: v.group.id, email, NOT: input.memberId ? { id: input.memberId } : undefined } });
      if (clash) return { error: `${email} is already used by ${clash.displayName}.` };
    }

    if (input.memberId) {
      const member = await prisma.member.findFirst({ where: { id: input.memberId, groupId: v.group.id } });
      if (!member) return { error: 'Member not found.' };
      if (member.id === v.member.id && !input.isAdmin) return { error: 'You can’t remove your own admin rights.' };
      await prisma.$transaction([
        prisma.member.update({ where: { id: member.id }, data: { displayName: input.displayName, email, isAdmin: input.isAdmin } }),
        prisma.roundMember.update({ where: { roundId_memberId: { roundId: v.round.id, memberId: member.id } }, data: { joinedWeek: input.joinedWeek } }),
      ]);
      revalidatePath('/', 'layout');
      return { ok: `${input.displayName} saved.` };
    }

    const last = await prisma.roundMember.aggregate({ where: { roundId: v.round.id }, _max: { joinOrder: true } });
    await prisma.member.create({
      data: {
        groupId: v.group.id, displayName: input.displayName, email, isAdmin: input.isAdmin,
        rounds: { create: { roundId: v.round.id, joinedWeek: input.joinedWeek, joinOrder: (last._max.joinOrder ?? 0) + 1 } },
      },
    });
    revalidatePath('/', 'layout');
    return { ok: `${input.displayName} added. They can sign in with ${email ?? 'their email once you add it'}.` };
  } catch (e) { return fail(e); }
}

const WeekInput = z.object({
  id: z.string(),
  title: z.string().trim().min(1, 'Title is required.').max(200),
  description: z.string().trim().max(2000).default(''),
  courses: z.string().default('').transform(s => s.split('\n').map(x => x.trim()).filter(Boolean)),
  videoHours: z.string().default('').transform(s => (s.trim() === '' ? null : Number(s))).pipe(z.number().min(0).max(200).nullable()),
  deliverable: z.string().trim().max(1000).default(''),
  isCertWeek: checkbox,
  certName: z.string().trim().max(120).default('').transform(s => s || null),
  notes: z.string().trim().max(2000).default(''),
  covered: checkbox,
});

export async function saveSyllabusWeek(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const v = await requireAdmin();
    const { id, ...data } = WeekInput.parse(Object.fromEntries(form));
    const res = await prisma.syllabusWeek.updateMany({ where: { id, roundId: v.round.id }, data });
    if (!res.count) return { error: 'Week not found.' };
    revalidatePath('/', 'layout');
    return { ok: 'Week saved.' };
  } catch (e) { return fail(e); }
}

export async function setWeekCovered(id: string, covered: boolean): Promise<ActionState> {
  try {
    const v = await requireAdmin();
    await prisma.syllabusWeek.updateMany({ where: { id, roundId: v.round.id }, data: { covered } });
    revalidatePath('/', 'layout');
    return { ok: covered ? 'Marked covered.' : 'Marked not covered.' };
  } catch (e) { return fail(e); }
}
