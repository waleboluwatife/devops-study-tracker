'use server';
// Weekly scoreboard, peer-review sign-off, fines pool, course progress and rounds.
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { activeMembers, balance, computeFines, reviewerFor } from '@/lib/rules';
import { prisma } from '../db';
import { loadRoundData } from '../round-data';
import { dbDate, getViewer, requireAdmin } from '../viewer';
import type { ActionState } from './logs';

const fail = (e: unknown): ActionState => ({ error: e instanceof z.ZodError ? e.issues[0].message : (e as Error).message });
const done = (ok: string): ActionState => { revalidatePath('/', 'layout'); return { ok }; };

// ── Weekly scoreboard (admin) ───────────────────────────────────────────────

const ScoreRow = z.object({
  roundMemberId: z.string(),
  attended: z.boolean(),
  late15Plus: z.boolean(),
  studiedAndPresented: z.boolean(),
  githubPushed: z.boolean(),
  githubLink: z.string().trim().max(300).default(''),
  linkedinPosted: z.boolean(),
  linkedinLink: z.string().trim().max(300).default(''),
  waiverRequested48h: z.boolean(),
  notes: z.string().trim().max(500).default(''),
});

export async function saveScores(week: number, rows: unknown): Promise<ActionState> {
  try {
    const v = await requireAdmin();
    if (!Number.isInteger(week) || week < 1 || week > Math.min(v.rawWeek, v.round.totalWeeks)) return { error: 'You can only score weeks that have started.' };
    const parsed = z.array(ScoreRow).parse(rows);
    const members = await prisma.roundMember.findMany({ where: { roundId: v.round.id } });
    const active = new Set(activeMembers(members, week).map(m => m.id));
    if (parsed.some(r => !active.has(r.roundMemberId))) return { error: 'Only members active that week can be scored.' };

    await prisma.$transaction(parsed.map(({ roundMemberId, githubLink, linkedinLink, ...flags }) => {
      const data = { ...flags, githubLink: githubLink || null, linkedinLink: linkedinLink || null };
      return prisma.weeklyScore.upsert({
        where: { roundMemberId_week: { roundMemberId, week } },
        update: data,
        create: { roundId: v.round.id, roundMemberId, week, ...data },
      });
    }));
    return done(`Week ${week} saved.`);
  } catch (e) { return fail(e); }
}

// ── Peer review sign-off (assigned reviewer only) ───────────────────────────

export async function signOffReview(week: number, revieweeId: string, signedOff: boolean, comment: string): Promise<ActionState> {
  try {
    const v = await getViewer();
    if (!v.roundMember) return { error: 'You are not part of this round.' };
    if (!Number.isInteger(week) || week < 1 || week > Math.min(v.rawWeek, v.round.totalWeeks)) return { error: 'That week hasn’t started.' };
    const existing = await prisma.peerReview.findUnique({ where: { roundId_week_revieweeId: { roundId: v.round.id, week, revieweeId } } });
    const members = await prisma.roundMember.findMany({ where: { roundId: v.round.id } });
    // The reviewer is fixed when the review is first recorded.
    const reviewerId = existing?.reviewerId ?? reviewerFor(members, week, revieweeId);
    if (!reviewerId || reviewerId !== v.roundMember.id) return { error: 'Only the assigned reviewer can sign this off.' };
    const data = { signedOff, comment: comment.trim().slice(0, 1000), signedOffAt: signedOff ? new Date() : null };
    await prisma.peerReview.upsert({
      where: { roundId_week_revieweeId: { roundId: v.round.id, week, revieweeId } },
      update: data,
      create: { roundId: v.round.id, week, revieweeId, reviewerId, ...data },
    });
    return done(signedOff ? 'Signed off ✔' : 'Sign-off removed.');
  } catch (e) { return fail(e); }
}

// ── Fines pool (admin) ──────────────────────────────────────────────────────

const Money = z.object({
  roundMemberId: z.string().min(1, 'Pick a member.'),
  amount: z.coerce.number().int('Whole naira only.').min(1, 'Amount must be more than 0.').max(10_000_000),
  note: z.string().trim().max(200).default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

async function checkMember(roundId: string, roundMemberId: string) {
  const rm = await prisma.roundMember.findFirst({ where: { id: roundMemberId, roundId } });
  if (!rm) throw new Error('Member not found.');
}

export async function addPayment(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const v = await requireAdmin();
    const input = Money.parse(Object.fromEntries(form));
    await checkMember(v.round.id, input.roundMemberId);
    await prisma.payment.create({ data: { roundId: v.round.id, roundMemberId: input.roundMemberId, amount: input.amount, note: input.note, date: dbDate(input.date ?? new Date().toISOString().slice(0, 10)) } });
    return done('Payment recorded.');
  } catch (e) { return fail(e); }
}

export async function addCarryOver(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const v = await requireAdmin();
    const input = Money.parse(Object.fromEntries(form));
    await checkMember(v.round.id, input.roundMemberId);
    await prisma.fineCarryOver.create({ data: { roundId: v.round.id, roundMemberId: input.roundMemberId, amount: input.amount, note: input.note } });
    return done('Carry-over added.');
  } catch (e) { return fail(e); }
}

export async function deleteMoney(kind: 'payment' | 'carryOver', id: string): Promise<ActionState> {
  try {
    const v = await requireAdmin();
    const res = kind === 'payment'
      ? await prisma.payment.deleteMany({ where: { id, roundId: v.round.id } })
      : await prisma.fineCarryOver.deleteMany({ where: { id, roundId: v.round.id } });
    return res.count ? done('Deleted.') : { error: 'Not found.' };
  } catch (e) { return fail(e); }
}

// ── Course progress ─────────────────────────────────────────────────────────

const STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'DONE'] as const;

export async function setModuleStatus(moduleId: string, status: (typeof STATUSES)[number]): Promise<ActionState> {
  try {
    const v = await getViewer();
    if (!STATUSES.includes(status)) return { error: 'Unknown status.' };
    const mod = await prisma.module.findFirst({ where: { id: moduleId, course: { groupId: v.group.id } } });
    if (!mod) return { error: 'Module not found.' };
    const completedAt = status === 'DONE' ? new Date() : null;
    await prisma.memberModuleProgress.upsert({
      where: { memberId_moduleId: { memberId: v.member.id, moduleId } },
      update: { status, completedAt },
      create: { memberId: v.member.id, moduleId, status, completedAt },
    });
    revalidatePath('/progress');
    revalidatePath('/');
    return { ok: 'Saved.' };
  } catch (e) { return fail(e); }
}

/** Admin: replace a course's module list (one per line). Progress on kept modules is preserved. */
export async function saveCourseModules(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const v = await requireAdmin();
    const courseId = String(form.get('courseId') ?? '');
    const names = [...new Set(String(form.get('modules') ?? '').split('\n').map(s => s.trim()).filter(Boolean))].slice(0, 100);
    const course = await prisma.course.findFirst({ where: { id: courseId, groupId: v.group.id }, include: { modules: true } });
    if (!course) return { error: 'Course not found.' };
    const byName = new Map(course.modules.map(m => [m.name, m]));
    await prisma.$transaction(async tx => {
      await tx.module.deleteMany({ where: { courseId, name: { notIn: names } } });
      // Park orders out of the way so the unique (course, order) constraint holds while renumbering.
      await tx.module.updateMany({ where: { courseId }, data: { order: { increment: 10_000 } } });
      for (const [i, name] of names.entries()) {
        const existing = byName.get(name);
        if (existing) await tx.module.update({ where: { id: existing.id }, data: { order: i + 1 } });
        else await tx.module.create({ data: { courseId, name, order: i + 1 } });
      }
    });
    return done(`${course.name}: ${names.length} modules saved.`);
  } catch (e) { return fail(e); }
}

// ── Rounds (admin) ──────────────────────────────────────────────────────────

const NewRound = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a start date.')
    .refine(d => new Date(`${d}T00:00:00Z`).getUTCDay() === 0, 'The round must start on a Sunday.'),
  totalWeeks: z.coerce.number().int().min(1).max(104),
  carryBalances: z.preprocess(v => v === 'on', z.boolean()),
  confirm: z.literal('NEW ROUND', { errorMap: () => ({ message: 'Type NEW ROUND to confirm.' }) }),
});

/**
 * Archives the current round and starts the next one: same members (join week 1,
 * same order), the syllabus copied as a template (covered reset), and optionally
 * everyone's unpaid balance carried over.
 */
export async function startNewRound(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const v = await requireAdmin();
    const input = NewRound.parse(Object.fromEntries(form));
    const old = v.round;
    if (input.startDate <= old.startDate.toISOString().slice(0, 10)) return { error: 'The new round must start after the current one.' };
    const data = await loadRoundData(prisma, old.id);
    const fines = computeFines(data.settings, data.members, data.scores, data.logs);
    const [roundMembers, syllabus] = await Promise.all([
      prisma.roundMember.findMany({ where: { roundId: old.id }, orderBy: { joinOrder: 'asc' } }),
      prisma.syllabusWeek.findMany({ where: { roundId: old.id }, orderBy: { weekNumber: 'asc' } }),
    ]);
    const end = new Date(`${input.startDate}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + input.totalWeeks * 7 - 1);

    await prisma.$transaction(async tx => {
      await tx.round.update({ where: { id: old.id }, data: { status: 'ARCHIVED' } });
      const round = await tx.round.create({
        data: { groupId: v.group.id, number: old.number + 1, startDate: dbDate(input.startDate), totalWeeks: input.totalWeeks, targetFinishDate: end },
      });
      for (const [i, rm] of roundMembers.entries()) {
        const next = await tx.roundMember.create({ data: { roundId: round.id, memberId: rm.memberId, joinedWeek: 1, joinOrder: i + 1 } });
        const owed = balance(fines, data.carryOvers, data.payments, rm.id).outstanding;
        if (input.carryBalances && owed > 0) {
          await tx.fineCarryOver.create({ data: { roundId: round.id, roundMemberId: next.id, amount: owed, note: `Unpaid from Round ${old.number}` } });
        }
      }
      await tx.syllabusWeek.createMany({
        data: Array.from({ length: input.totalWeeks }, (_, i) => {
          const w = syllabus.find(s => s.weekNumber === i + 1);
          return {
            roundId: round.id, weekNumber: i + 1, title: w?.title ?? `Week ${i + 1} — topic to be set`,
            description: w?.description ?? '', courses: w?.courses ?? [], videoHours: w?.videoHours ?? null,
            deliverable: w?.deliverable ?? '', isCertWeek: w?.isCertWeek ?? false, certName: w?.certName ?? null,
            notes: w?.notes ?? '', covered: false,
          };
        }),
      });
    });
    return done(`Round ${old.number + 1} started. Round ${old.number} is in the Archive.`);
  } catch (e) { return fail(e); }
}
