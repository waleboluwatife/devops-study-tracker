'use client';
import { useActionState, useTransition } from 'react';
import { addCarryOver, addPayment, deleteMoney } from '@/server/actions/accountability';
import type { ActionState } from '@/server/actions/logs';
import { FormMessage, SubmitButton } from './form';

export function MoneyForm({ kind, members, today }: { kind: 'payment' | 'carryOver'; members: { id: string; name: string }[]; today: string }) {
  const [state, action] = useActionState<ActionState, FormData>(kind === 'payment' ? addPayment : addCarryOver, {});
  return (
    <form action={action} className="grid gap-2">
      <select name="roundMemberId" className="input" aria-label="Member" required defaultValue="">
        <option value="" disabled>Member…</option>
        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <input name="amount" type="number" min="1" step="500" required placeholder="Amount in ₦" className="input font-mono" aria-label="Amount" />
      {kind === 'payment' && <input name="date" type="date" defaultValue={today} max={today} className="input" aria-label="Date paid" />}
      <input name="note" placeholder={kind === 'payment' ? 'Note (optional), e.g. bank transfer' : 'Why, e.g. unpaid from Round 1'} className="input" aria-label="Note" />
      <div className="flex items-center gap-3"><SubmitButton>{kind === 'payment' ? 'Record payment' : 'Add carry-over'}</SubmitButton><FormMessage state={state} /></div>
    </form>
  );
}

export function DeleteMoney({ kind, id }: { kind: 'payment' | 'carryOver'; id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="text-xs text-fail underline" disabled={pending}
      onClick={() => { if (confirm('Delete this entry?')) start(async () => { await deleteMoney(kind, id); }); }}>
      {pending ? '…' : 'Delete'}
    </button>
  );
}
