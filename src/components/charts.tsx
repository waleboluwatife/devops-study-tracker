// Small dependency-free charts (plain HTML/SVG), readable on phones.

export function HoursBars({ rows, min }: { rows: { name: string; hours: number }[]; min?: number }) {
  const max = Math.max(1, ...rows.map(r => r.hours));
  return (
    <ul className="space-y-2" aria-label="Verified hours per member">
      {rows.map(r => (
        <li key={r.name} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-2 text-sm">
          <span className="truncate font-medium">{r.name}</span>
          <span className="h-3 overflow-hidden rounded-full bg-slate-100">
            <span className="block h-full rounded-full bg-brand-500" style={{ width: `${(r.hours / max) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums text-slate-600">{r.hours}h</span>
        </li>
      ))}
      {min !== undefined && <li className="text-xs text-slate-500">Target: {min}h verified per person per week.</li>}
    </ul>
  );
}

export function WeeklyColumns({ weeks }: { weeks: { week: number; hours: number }[] }) {
  const max = Math.max(1, ...weeks.map(w => w.hours));
  const H = 120;
  const barW = 22; const gap = 8;
  const width = Math.max(weeks.length * (barW + gap), 200);
  return (
    <div className="overflow-x-auto">
      <svg width={width} height={H + 34} role="img" aria-label="Group verified hours per week">
        {weeks.map((w, i) => {
          const h = (w.hours / max) * H;
          const x = i * (barW + gap);
          return (
            <g key={w.week}>
              <rect x={x} y={H - h + 14} width={barW} height={Math.max(h, 1)} rx={4} className="fill-emerald-500" />
              <text x={x + barW / 2} y={H - h + 10} textAnchor="middle" className="fill-slate-600 text-[10px]">{w.hours || ''}</text>
              <text x={x + barW / 2} y={H + 28} textAnchor="middle" className="fill-slate-500 text-[10px]">W{w.week}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
