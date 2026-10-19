'use client';
import { useActionState, useTransition } from 'react';
import { saveMember, saveSettings, saveSyllabusWeek, setWeekCovered } from '@/server/actions/admin';
import type { ActionState } from '@/server/actions/logs';
import { FormMessage, SubmitButton } from './form';

type Week = {
  id: string; title: string; description: string; courses: string[]; videoHours: number | null;
  deliverable: string; isCertWeek: boolean; certName: string | null; notes: string; covered: boolean;
};

export function WeekEditor({ week }: { week: Week }) {
  const [state, action] = useActionState<ActionState, FormData>(saveSyllabusWeek, {});
  return (
    <form action={action} className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={week.id} />
      <div className="sm:col-span-2"><label className="label">Title</label><input name="title" required defaultValue={week.title} className="input" /></div>
      <div><label className="label">Video hours</label><input name="videoHours" type="number" step="0.25" min="0" defaultValue={week.videoHours ?? ''} className="input" /></div>
      <div><label className="label">Cert name (if cert week)</label><input name="certName" defaultValue={week.certName ?? ''} className="input" /></div>
      <div className="sm:col-span-2"><label className="label">Deliverable</label><input name="deliverable" defaultValue={week.deliverable} className="input" /></div>
      <div className="sm:col-span-2"><label className="label">KodeKloud courses (one per line)</label><textarea name="courses" rows={2} defaultValue={week.courses.join('\n')} className="input" /></div>
      <div className="sm:col-span-2"><label className="label">Description</label><textarea name="description" rows={2} defaultValue={week.description} className="input" /></div>
      <div className="sm:col-span-2"><label className="label">Notes</label><textarea name="notes" rows={2} defaultValue={week.notes} className="input" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isCertWeek" defaultChecked={week.isCertWeek} /> Cert week</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="covered" defaultChecked={week.covered} /> Covered</label>
      <div className="flex items-center gap-3 sm:col-span-2"><SubmitButton>Save week</SubmitButton><FormMessage state={state} /></div>
    </form>
  );
}

export function CoveredToggle({ id, covered }: { id: string; covered: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => { await setWeekCovered(id, !covered); })}
      className={`pill ${covered ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'} hover:ring-2 hover:ring-emerald-200`}>
      {pending ? '…' : covered ? '✔ Covered' : 'Mark covered'}
    </button>
  );
}

type GroupValues = {
  name: string; fineMissedPerMember: number; fineLateFlat: number; minVerifiedHoursPerWeek: number;
  shortHoursFineEnabled: boolean; shortHoursFine: number; targetFinishDate: string;
};

export function SettingsForm({ values, disabled }: { values: GroupValues; disabled: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(saveSettings, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <fieldset disabled={disabled} className="contents">
        <div className="sm:col-span-2"><label className="label">Group name</label><input name="name" required defaultValue={values.name} className="input" /></div>
        <div><label className="label">Missed session fine (₦ × active members)</label><input name="fineMissedPerMember" type="number" min="0" step="500" defaultValue={values.fineMissedPerMember} className="input" /></div>
        <div><label className="label">Late 15+ min fine (₦ flat)</label><input name="fineLateFlat" type="number" min="0" step="500" defaultValue={values.fineLateFlat} className="input" /></div>
        <div><label className="label">Minimum verified hours per week</label><input name="minVerifiedHoursPerWeek" type="number" min="0" step="0.5" defaultValue={values.minVerifiedHoursPerWeek} className="input" /></div>
        <div><label className="label">Target finish date</label><input name="targetFinishDate" type="date" required defaultValue={values.targetFinishDate} className="input" /></div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="shortHoursFineEnabled" defaultChecked={values.shortHoursFineEnabled} /> Fine people who are short on verified hours</label>
        <div><label className="label">Short-hours fine (₦ flat per person)</label><input name="shortHoursFine" type="number" min="0" step="500" defaultValue={values.shortHoursFine} className="input" /></div>
        {!disabled && <div className="flex items-center gap-3 sm:col-span-2"><SubmitButton>Save settings</SubmitButton><FormMessage state={state} /></div>}
      </fieldset>
    </form>
  );
}

type MemberValues = { memberId?: string; displayName: string; email: string; joinedWeek: number; isAdmin: boolean };

export function MemberForm({ values, isNew = false }: { values: MemberValues; isNew?: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(saveMember, {});
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_6rem_auto_auto] sm:items-end">
      {values.memberId && <input type="hidden" name="memberId" value={values.memberId} />}
      <div><label className="label">Name</label><input name="displayName" required defaultValue={values.displayName} className="input" /></div>
      <div><label className="label">Google email (to sign in)</label><input name="email" type="email" defaultValue={values.email} placeholder="name@gmail.com" className="input" /></div>
      <div><label className="label">Join week</label><input name="joinedWeek" type="number" min="1" defaultValue={values.joinedWeek} className="input" /></div>
      <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" name="isAdmin" defaultChecked={values.isAdmin} /> Admin</label>
      <SubmitButton className="btn btn-ghost">{isNew ? 'Add member' : 'Save'}</SubmitButton>
      <div className="sm:col-span-5"><FormMessage state={state} /></div>
    </form>
  );
}
