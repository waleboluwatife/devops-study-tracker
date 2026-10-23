'use client';
import { useActionState, useState, useTransition } from 'react';
import { coursePercent, currentPosition, nextStatus, overallPercent, type ProgressCourse, type ProgressStatus } from '@/lib/rules';
import { saveCourseModules, setModuleStatus } from '@/server/actions/accountability';
import type { ActionState } from '@/server/actions/logs';
import { FormMessage, SubmitButton } from './form';

const DOT: Record<ProgressStatus, string> = {
  NOT_STARTED: 'border-2 border-slate-400',
  IN_PROGRESS: 'border-2 border-wait bg-[radial-gradient(circle,var(--color-wait)_0_40%,transparent_42%)]',
  DONE: 'border-2 border-pass bg-pass',
};
const WORD: Record<ProgressStatus, string> = { NOT_STARTED: 'not started', IN_PROGRESS: 'in progress', DONE: 'done' };

function ModulesEditor({ course }: { course: ProgressCourse }) {
  const [state, action] = useActionState<ActionState, FormData>(saveCourseModules, {});
  return (
    <form action={action} className="mt-3 grid gap-2 rounded-lg bg-base p-3">
      <input type="hidden" name="courseId" value={course.id} />
      <label className="label" htmlFor={`m-${course.id}`}>Modules, one per line</label>
      <textarea id={`m-${course.id}`} name="modules" rows={6} defaultValue={course.modules.map(m => m.name).join('\n')} className="input" />
      <div className="flex items-center gap-3"><SubmitButton className="btn btn-sm">Save modules</SubmitButton><FormMessage state={state} /></div>
    </form>
  );
}

export function ProgressList({ courses, initial, isAdmin }: { courses: ProgressCourse[]; initial: Record<string, ProgressStatus>; isAdmin: boolean }) {
  const [status, setStatus] = useState(initial);
  const [, start] = useTransition();
  const map = new Map(Object.entries(status));
  const path = courses.filter(c => c.kind === 'PATH');
  const addOns = courses.filter(c => c.kind === 'ADD_ON');
  const here = currentPosition(path, map);
  const firstOpen = here ? courses.find(c => c.name === here.course)?.id : undefined;

  const tap = (moduleId: string) => {
    const next = nextStatus(status[moduleId]);
    setStatus(s => ({ ...s, [moduleId]: next }));
    start(async () => { const r = await setModuleStatus(moduleId, next); if (r.error) setStatus(s => ({ ...s, [moduleId]: status[moduleId] })); });
  };

  const group = (title: string, list: ProgressCourse[]) => (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">{title} <span className="font-mono text-sm font-normal text-sub">{overallPercent(list, map)}%</span></h2>
      {list.map(c => {
        const pct = coursePercent(c, map);
        return (
          <details key={c.id} className="rounded-[10px] border border-rule bg-white" open={c.id === firstOpen}>
            <summary className="grid cursor-pointer list-none grid-cols-[1fr_minmax(80px,140px)_44px] items-center gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
              <b className="min-w-0">{c.name}{c.videoHours ? <span className="ml-2 text-xs font-normal text-sub">{c.videoHours}h of video</span> : null}</b>
              <span className="h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full bg-pass" style={{ width: `${pct}%` }} /></span>
              <span className="num text-sm">{pct}%</span>
            </summary>
            <div className="grid gap-1.5 px-3 pb-3 sm:grid-cols-2 lg:grid-cols-3">
              {c.modules.length === 0 && <p className="text-sm text-sub">No modules listed yet.</p>}
              {c.modules.map(m => {
                const s = status[m.id] ?? 'NOT_STARTED';
                return (
                  <button key={m.id} type="button" onClick={() => tap(m.id)} aria-label={`${m.name}: ${WORD[s]}. Tap to change.`}
                    className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-left text-sm hover:bg-base">
                    <span className={`h-4 w-4 shrink-0 rounded-full ${DOT[s]}`} aria-hidden />{m.name}
                  </button>
                );
              })}
            </div>
            {isAdmin && <details className="px-3 pb-3"><summary className="cursor-pointer text-sm font-semibold text-accent">Edit modules</summary><ModulesEditor course={c} /></details>}
          </details>
        );
      })}
    </section>
  );

  return (
    <>
      <p className="rounded-md border-l-4 border-accent bg-accent-bg px-4 py-3">
        {here ? <><b>You are here:</b> {here.course} › {here.module}</> : <b>Path complete. Time for the cert weeks.</b>}
      </p>
      {group('KodeKloud DevOps Engineer path', path)}
      {addOns.length > 0 && group('Add-ons and certs', addOns)}
    </>
  );
}
