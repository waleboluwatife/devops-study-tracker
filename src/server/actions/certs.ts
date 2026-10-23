'use server';
// Cert tracker: mock-exam scores (anyone, for themselves) and exam dates (admin).
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '../db';
import { logActivity } from '../activity';
import { getViewer, requireAdmin } from '../viewer';
import type { ActionState } from './logs';

const fail = (e: unknown): ActionState => ({ error: e instanceof z.ZodError ? e.issues[0].message : (e as Error).message });

export async function addMockScore(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const v = await getViewer();
    if (!v.roundMember) return { error: 'You are not part of this round.' };
    const certId = String(form.get('certId') ?? '');
    const score = z.coerce.number().int().min(0, 'Score is 0–100.').max(100, 'Score is 0–100.').parse(form.get('score'));
    const cert = await prisma.cert.findFirst({ where: { id: certId, groupId: v.group.id } });
    if (!cert) return { error: 'Cert not found.' };
    await prisma.mockScore.create({ data: { certId, roundMemberId: v.roundMember.id, score } });
    await logActivity(v.round.id, score >= 70 ? '🎯' : '📚', `${v.member.displayName} scored ${score}% on a ${cert.name} mock exam`);
    revalidatePath('/certs');
    return { ok: `Saved ${score}%.` };
  } catch (e) { return fail(e); }
}

const CertInput = z.object({
  certId: z.string().optional(),
  name: z.string().trim().min(1, 'Name is required.').max(80),
  week: z.string().optional().transform(s => (s ? Number(s) : null)).pipe(z.number().int().min(1).max(200).nullable()),
  examDate: z.string().optional().transform(s => s || null).pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()),
  notes: z.string().trim().max(300).default(''),
});

export async function saveCert(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const v = await requireAdmin();
    const { certId, examDate, ...rest } = CertInput.parse(Object.fromEntries(form));
    const data = { ...rest, examDate: examDate ? new Date(`${examDate}T00:00:00Z`) : null };
    if (certId) await prisma.cert.updateMany({ where: { id: certId, groupId: v.group.id }, data });
    else await prisma.cert.create({ data: { ...data, groupId: v.group.id } });
    revalidatePath('/certs');
    return { ok: 'Saved.' };
  } catch (e) { return fail(e); }
}
