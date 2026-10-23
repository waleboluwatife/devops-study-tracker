import { prisma } from '@/server/db';
import { getViewer } from '@/server/viewer';

function ago(d: Date, tz: string) {
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz });
}

export default async function ActivityPage() {
  const v = await getViewer();
  const items = await prisma.activity.findMany({ where: { roundId: v.round.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  return (
    <>
      <div>
        <h1 className="page-title">Activity</h1>
        <p className="lede">Everything that happens in the group, newest first.</p>
      </div>
      <section className="card">
        {items.length === 0 ? <p className="text-sm text-sub">Nothing yet. Log a study session to get things going.</p> : (
          <ul className="divide-y divide-slate-100">
            {items.map(a => (
              <li key={a.id} className="grid grid-cols-[1.75rem_1fr_auto] items-start gap-2.5 py-2.5 text-sm">
                <span className="text-center" aria-hidden>{a.icon}</span>
                <span>{a.text}</span>
                <small className="whitespace-nowrap text-sub">{ago(a.createdAt, v.group.timezone)}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
