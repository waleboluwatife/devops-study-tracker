'use client';
import { useActionState } from 'react';
import { addMockScore, saveCert } from '@/server/actions/certs';
import type { ActionState } from '@/server/actions/logs';
import { FormMessage, SubmitButton } from './form';

export function MockScoreForm({ certId, certName }: { certId: string; certName: string }) {
  const [state, action] = useActionState<ActionState, FormData>(addMockScore, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="certId" value={certId} />
      <input name="score" type="number" min="0" max="100" required placeholder="Mock %" aria-label={`Mock exam score for ${certName}`} className="input w-24 font-mono" />
      <SubmitButton className="btn btn-sm">Log mock score</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function CertEditor({ cert }: { cert?: { id: string; name: string; week: number | null; examDate: string | null; notes: string } }) {
  const [state, action] = useActionState<ActionState, FormData>(saveCert, {});
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-2">
      {cert && <input type="hidden" name="certId" value={cert.id} />}
      <div className="sm:col-span-2"><label className="label">Cert</label><input name="name" required defaultValue={cert?.name} className="input" /></div>
      <div><label className="label">Syllabus week</label><input name="week" type="number" min="1" max="200" defaultValue={cert?.week ?? ''} className="input" /></div>
      <div><label className="label">Exam date</label><input name="examDate" type="date" defaultValue={cert?.examDate ?? ''} className="input" /></div>
      <div className="sm:col-span-2"><label className="label">Notes (price, voucher…)</label><input name="notes" defaultValue={cert?.notes} className="input" /></div>
      <div className="flex items-center gap-3 sm:col-span-2"><SubmitButton className="btn btn-sm">{cert ? 'Save' : 'Add cert'}</SubmitButton><FormMessage state={state} /></div>
    </form>
  );
}
