'use server';
// Study log actions: add, edit (clears verification), delete, verify.
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { applyLogEdit, canVerify, todayIn } from '@/lib/rules';
import { prisma } from '../db';
import { saveScreenshot, uploadProblem } from '../storage';
import { dbDate, getViewer, isoDate, roundMemberNames } from '../viewer';
import { logActivity } from '../activity';

export type ActionState = { ok?: string; error?: string };

const LogInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date.'),
  hours: z.coerce.number().min(0.25, 'At least 15 minutes (0.25 h).').max(16, 'Max 16 hours in one log.'),
  labs: z.coerce.number().int().min(0).max(100),
  whatCovered: z.string().trim().max(1000).default(''),
  moduleId: z.string().optional().transform(v => v || null),
});

function screenshotFrom(form: FormData): File | null {
  const f = form.get('screenshot');
  return f instanceof File && f.size > 0 ? f : null;
}

async function checkDate(date: string) {
  const v = await getViewer();
  if (date < v.startDate) return `The round starts on ${v.startDate}.`;
  if (date > todayIn(v.group.timezone)) return 'You can’t log a future date.';
  return null;
}

export async function addLog(_prev: ActionState, form: FormData): Promise<ActionState> {
  const v = await getViewer();
  if (!v.roundMember) return { error: 'You are not part of this round.' };
  const parsed = LogInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const dateProblem = await checkDate(parsed.data.date);
  if (dateProblem) return { error: dateProblem };
  const shot = screenshotFrom(form);
  if (shot && uploadProblem(shot)) return { error: uploadProblem(shot)! };

  await prisma.studyLog.create({
    data: {
      roundId: v.round.id,
      roundMemberId: v.roundMember.id,
      date: dbDate(parsed.data.date),
      hours: parsed.data.hours,
      labsDone: parsed.data.labs,
      whatCovered: parsed.data.whatCovered,
      moduleId: parsed.data.moduleId,
      screenshotUrl: shot ? await saveScreenshot(shot) : null,
    },
  });
  await logActivity(v.round.id, '📝', `${v.member.displayName} logged ${parsed.data.hours}h${parsed.data.labs ? ` and ${parsed.data.labs} lab${parsed.data.labs > 1 ? 's' : ''}` : ''}${shot ? '' : ' — no screenshot yet'}`);
  revalidatePath('/', 'layout');
  return { ok: shot ? 'Logged! Waiting for someone to verify it.' : 'Logged — add a screenshot so it can be verified.' };
}

async function ownLog(id: string) {
  const v = await getViewer();
  const log = await prisma.studyLog.findUnique({ where: { id } });
  if (!log || !v.roundMember || log.roundMemberId !== v.roundMember.id) throw new Error('You can only change your own logs.');
  return log;
}

export async function updateLog(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get('id') ?? '');
  let log;
  try { log = await ownLog(id); } catch (e) { return { error: (e as Error).message }; }
  const parsed = LogInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const dateProblem = await checkDate(parsed.data.date);
  if (dateProblem) return { error: dateProblem };
  const shot = screenshotFrom(form);
  if (shot && uploadProblem(shot)) return { error: uploadProblem(shot)! };

  const current = {
    id: log.id, memberId: log.roundMemberId, date: isoDate(log.date), hours: log.hours, labs: log.labsDone,
    screenshotUrl: log.screenshotUrl, verifiedById: log.verifiedById, verifiedAt: log.verifiedAt,
    whatCovered: log.whatCovered, moduleId: log.moduleId,
  };
  const next = applyLogEdit(current, {
    date: parsed.data.date, hours: parsed.data.hours, labs: parsed.data.labs,
    whatCovered: parsed.data.whatCovered, moduleId: parsed.data.moduleId,
    ...(shot ? { screenshotUrl: await saveScreenshot(shot) } : {}),
  });
  if (next === current) return { ok: 'No changes.' };

  await prisma.studyLog.update({
    where: { id },
    data: {
      date: dbDate(next.date), hours: next.hours, labsDone: next.labs, whatCovered: next.whatCovered,
      moduleId: next.moduleId, screenshotUrl: next.screenshotUrl,
      verifiedById: next.verifiedById, verifiedAt: next.verifiedAt instanceof Date ? next.verifiedAt : null,
    },
  });
  revalidatePath('/', 'layout');
  return { ok: log.verifiedById ? 'Saved. It needs to be verified again.' : 'Saved.' };
}

export async function deleteLog(id: string): Promise<ActionState> {
  try { await ownLog(id); } catch (e) { return { error: (e as Error).message }; }
  await prisma.studyLog.delete({ where: { id } });
  revalidatePath('/', 'layout');
  return { ok: 'Deleted.' };
}

export async function verifyLog(id: string): Promise<ActionState> {
  const v = await getViewer();
  if (!v.roundMember || v.roundMember.joinedWeek > v.rawWeek) return { error: 'You can verify logs once you have joined the round.' };
  const log = await prisma.studyLog.findUnique({ where: { id } });
  if (!log || log.roundId !== v.round.id) return { error: 'Log not found.' };
  const ok = canVerify(
    { id: log.id, memberId: log.roundMemberId, date: isoDate(log.date), hours: log.hours, labs: log.labsDone, screenshotUrl: log.screenshotUrl, verifiedById: log.verifiedById },
    v.roundMember.id,
  );
  if (!ok) return { error: log.roundMemberId === v.roundMember.id ? 'You can’t verify your own log.' : 'This log can’t be verified (no screenshot, or already verified).' };
  // Only succeeds if nobody verified it in the meantime.
  const res = await prisma.studyLog.updateMany({
    where: { id, verifiedById: null, screenshotUrl: { not: null } },
    data: { verifiedById: v.roundMember.id, verifiedAt: new Date() },
  });
  if (res.count) {
    const names = await roundMemberNames(v.round.id);
    await logActivity(v.round.id, '✅', `${v.member.displayName} verified ${names.get(log.roundMemberId)}'s ${log.hours}h session`);
  }
  revalidatePath('/', 'layout');
  return res.count ? { ok: 'Verified ✔' } : { error: 'Someone else just verified it.' };
}
