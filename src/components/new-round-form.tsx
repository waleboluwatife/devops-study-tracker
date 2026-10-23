'use client';
import { useActionState } from 'react';
import { startNewRound } from '@/server/actions/accountability';
import type { ActionState } from '@/server/actions/logs';
import { FormMessage, SubmitButton } from './form';

export function NewRoundForm({ suggestedStart }: { suggestedStart: string }) {
  const [state, action] = useActionState<ActionState, FormData>(startNewRound, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div><label className="label" htmlFor="nr-start">First day (a Sunday)</label><input id="nr-start" name="startDate" type="date" required defaultValue={suggestedStart} className="input" /></div>
      <div><label className="label" htmlFor="nr-weeks">Weeks</label><input id="nr-weeks" name="totalWeeks" type="number" min="1" max="104" defaultValue={40} className="input" /></div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="carryBalances" defaultChecked /> Carry everyone&apos;s unpaid fines into the new round</label>
      <div className="sm:col-span-2"><label className="label" htmlFor="nr-confirm">Type NEW ROUND to confirm. The current round moves to the archive.</label><input id="nr-confirm" name="confirm" required className="input" autoComplete="off" /></div>
      <div className="flex items-center gap-3 sm:col-span-2"><SubmitButton className="btn btn-danger">Start the new round</SubmitButton><FormMessage state={state} /></div>
    </form>
  );
}
