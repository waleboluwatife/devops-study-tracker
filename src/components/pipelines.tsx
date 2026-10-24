// Each member's week as a CI pipeline: green passed, red failed, amber pending.
import type { Stage } from '@/server/dashboard';

type Pipeline = { id: string; name: string; reviewer: string; short: number; waiting: number; stages: { label: string; state: Stage; detail: string }[] };

const DOT: Record<Stage, string> = {
  pass: 'bg-pass text-white',
  fail: 'bg-fail text-white',
  wait: 'border-2 border-wait bg-white',
};
const WORD: Record<Stage, string> = { pass: 'passed', fail: 'failed', wait: 'pending' };

export function Pipelines({ items }: { items: Pipeline[] }) {
  const labels = items[0]?.stages.map(s => s.label) ?? [];
  const cols = 'grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 md:grid-cols-[150px_1fr_120px] md:items-center';
  return (
    <div className="grid gap-2.5">
      <div className={`${cols} px-3`} aria-hidden>
        <span className="hidden md:block" />
        <span className="col-span-2 grid grid-cols-5 text-center text-xs leading-tight text-sub md:col-span-1">{labels.map(l => <span key={l}>{l}</span>)}</span>
        <span className="hidden md:block" />
      </div>
      {items.map(p => (
        <div key={p.id} className={`${cols} rounded-[10px] border border-rule bg-white px-3 py-2.5`}>
          <div className="col-start-1 row-start-1 md:col-start-auto md:row-start-auto"><b className="block">{p.name}</b><small className="text-sub">reviewed by {p.reviewer}</small></div>
          <ol className="col-span-2 row-start-2 grid grid-cols-5 md:col-span-1 md:row-start-auto" aria-label={`${p.name}'s week`}>
            {p.stages.map((s, i) => (
              <li key={s.label} className="relative grid place-items-center" title={s.detail}>
                {i > 0 && <span className="absolute right-1/2 top-1/2 h-0.5 w-full -translate-y-1/2 bg-rule" aria-hidden />}
                <span className={`relative z-10 grid h-[22px] w-[22px] place-items-center rounded-full text-xs font-bold ${DOT[s.state]}`} aria-label={`${s.label}: ${WORD[s.state]}`}>
                  {s.state === 'pass' ? '✓' : s.state === 'fail' ? '✕' : <span className="h-[7px] w-[7px] rounded-full bg-wait motion-safe:animate-pulse" />}
                </span>
              </li>
            ))}
          </ol>
          <div className="col-start-2 row-start-1 text-right md:col-start-auto md:row-start-auto">
            {p.short > 0 ? <span className="pill pill-wait font-mono">{p.short}h short</span> : <span className="pill pill-pass font-mono">On track</span>}
            {p.waiting > 0 && <small className="block font-mono text-xs text-sub">{p.waiting} awaiting check</small>}
          </div>
        </div>
      ))}
    </div>
  );
}
