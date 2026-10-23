'use client';
import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { compressImage } from '@/lib/compress-image';
import { addLog, deleteLog, updateLog, verifyLog, type ActionState } from '@/server/actions/logs';
import { FormMessage } from './form';

export type CourseOption = { id: string; name: string; modules: { id: string; name: string }[] };

/**
 * Submits a log form: compresses the screenshot first, keeps what was typed if
 * the server says no, and (optionally) clears the form on success.
 */
function useLogForm(serverAction: (prev: ActionState, form: FormData) => Promise<ActionState>, resetOnSuccess: boolean) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(serverAction, {});
  const [compressing, setCompressing] = useState(false);
  useEffect(() => { if (resetOnSuccess && state.ok) ref.current?.reset(); }, [state, resetOnSuccess]);
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const shot = form.get('screenshot');
    if (shot instanceof File && shot.size > 0) {
      setCompressing(true);
      form.set('screenshot', await compressImage(shot));
      setCompressing(false);
    }
    startTransition(() => action(form));
  };
  return { ref, state, onSubmit, busy: pending || compressing };
}

function ModuleSelect({ courses, value }: { courses: CourseOption[]; value?: string | null }) {
  return (
    <select name="moduleId" defaultValue={value ?? ''} className="input">
      <option value="">— Not linked to a module —</option>
      {courses.map(c => (
        <optgroup key={c.id} label={c.name}>
          {c.modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

type LogValues = { date: string; hours: number; labs: number; whatCovered: string; moduleId: string | null };

function LogFields({ courses, values, today, minDate }: { courses: CourseOption[]; values?: LogValues; today: string; minDate: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <div><label className="label">Date</label><input name="date" type="date" required defaultValue={values?.date ?? today} min={minDate} max={today} className="input" /></div>
      <div><label className="label">Hours</label><input name="hours" type="number" inputMode="decimal" step="0.25" min="0.25" max="16" required defaultValue={values?.hours ?? ''} placeholder="e.g. 1.5" className="input" /></div>
      <div><label className="label">Labs done</label><input name="labs" type="number" inputMode="numeric" min="0" max="100" defaultValue={values?.labs ?? 0} className="input" /></div>
      <div><label className="label">Course / module</label><ModuleSelect courses={courses} value={values?.moduleId} /></div>
      <div className="sm:col-span-4"><label className="label">What I covered</label><textarea name="whatCovered" rows={2} maxLength={1000} defaultValue={values?.whatCovered ?? ''} placeholder="e.g. Docker volumes + 2 labs on bind mounts" className="input" /></div>
    </div>
  );
}

export function AddLogForm({ courses, today, minDate, hours }: { courses: CourseOption[]; today: string; minDate: string; hours?: number }) {
  const { ref, state, onSubmit, busy } = useLogForm(addLog, true);
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-3">
      <LogFields courses={courses} today={today} minDate={minDate} values={hours ? { date: today, hours, labs: 0, whatCovered: '', moduleId: null } : undefined} />
      <div>
        <label className="label">Screenshot (proof — your terminal / lab, not just a progress %)</label>
        <input name="screenshot" type="file" accept="image/*" className="input file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:font-semibold file:text-emerald-700" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Uploading…' : 'Add log'}</button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function EditLogForm({ id, courses, values, today, minDate, verified }: { id: string; courses: CourseOption[]; values: LogValues; today: string; minDate: string; verified: boolean }) {
  const { ref, state, onSubmit, busy } = useLogForm(updateLog, false);
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-3 rounded-xl bg-slate-50 p-3">
      <input type="hidden" name="id" value={id} />
      <LogFields courses={courses} values={values} today={today} minDate={minDate} />
      <div><label className="label">Replace screenshot</label><input name="screenshot" type="file" accept="image/*" className="input" /></div>
      {verified && <p className="text-xs text-amber-700">Saving changes clears the verification — someone will need to verify it again.</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        <DeleteButton id={id} />
        <FormMessage state={state} />
      </div>
    </form>
  );
}

function DeleteButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn btn-danger" disabled={pending}
      onClick={() => { if (confirm('Delete this log?')) start(async () => { await deleteLog(id); }); }}>
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  );
}

export function VerifyButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionState>({});
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className="btn btn-primary" disabled={pending} onClick={() => start(async () => setMsg(await verifyLog(id)))}>
        {pending ? 'Verifying…' : 'Verify ✔'}
      </button>
      {msg.error && <span className="text-xs text-rose-600">{msg.error}</span>}
    </span>
  );
}
