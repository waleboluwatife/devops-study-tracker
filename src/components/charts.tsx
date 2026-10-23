// Small dependency-free charts (plain HTML), readable on phones.

/** Verified hours per member, with a line at the weekly minimum. */
export function HoursBars({ rows, min }: { rows: { name: string; hours: number }[]; min: number }) {
  const scale = Math.max(min * 1.35, ...rows.map(r => r.hours), 1);
  return (
    <div className="grid gap-2" role="list" aria-label="Verified hours per member">
      {rows.map(r => (
        <div key={r.name} role="listitem" className="grid grid-cols-[6rem_1fr_3rem] items-center gap-2 text-sm">
          <span className="truncate">{r.name}</span>
          <span className="relative h-2.5 rounded-full bg-slate-100">
            <span className={`absolute inset-y-0 left-0 rounded-full ${r.hours >= min ? 'bg-pass' : 'bg-wait'}`} style={{ width: `${Math.min(100, (r.hours / scale) * 100)}%` }} />
            <span className="absolute -inset-y-1 w-0.5 bg-ink" style={{ left: `${(min / scale) * 100}%` }} aria-hidden />
          </span>
          <span className="num">{r.hours}h</span>
        </div>
      ))}
      <p className="text-xs text-sub">The line marks the {min}-hour minimum.</p>
    </div>
  );
}

export function WeeklyColumns({ weeks }: { weeks: { week: number; hours: number }[] }) {
  const max = Math.max(1, ...weeks.map(w => w.hours));
  return (
    <div className="flex h-36 items-end gap-2.5 overflow-x-auto pt-3" role="list" aria-label="Group verified hours per week">
      {weeks.map(w => (
        <div key={w.week} role="listitem" className="grid min-w-8 flex-1 justify-items-center gap-1 text-xs text-sub">
          <span className="font-mono">{w.hours}h</span>
          <span className="w-full max-w-11 rounded-t bg-accent" style={{ height: `${Math.max(2, (w.hours / max) * 90)}px` }} />
          W{w.week}
        </div>
      ))}
    </div>
  );
}
