import { CoveredToggle, WeekEditor } from '@/components/admin-forms';
import { shortDate } from '@/lib/format';
import { weekRange } from '@/lib/rules';
import { prisma } from '@/server/db';
import { getViewer } from '@/server/viewer';

export default async function SyllabusPage() {
  const v = await getViewer();
  const weeks = await prisma.syllabusWeek.findMany({ where: { roundId: v.round.id }, orderBy: { weekNumber: 'asc' } });
  const covered = weeks.filter(w => w.covered).length;

  return (
    <section className="card">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Syllabus</h1>
          <p className="text-sm text-slate-600">{weeks.length} weeks · {covered} covered · 🏅 = cert week</p>
        </div>
      </div>
      <ol className="relative space-y-2 border-l-2 border-slate-200 pl-4">
        {weeks.map(w => {
          const range = weekRange(w.weekNumber, v.startDate);
          const now = w.weekNumber === v.week && v.rawWeek >= 1;
          return (
            <li key={w.id} id={`week-${w.weekNumber}`}>
              <span className={`absolute -left-[7px] mt-4 h-3 w-3 rounded-full border-2 border-white ${w.covered ? 'bg-emerald-500' : now ? 'bg-sky-500' : 'bg-slate-300'}`} aria-hidden />
              <details open={now} className={`rounded-xl border p-3 ${now ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-100' : w.isCertWeek ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="w-14 shrink-0 text-xs font-bold text-slate-500">WEEK {w.weekNumber}</span>
                  <span className="min-w-0 flex-1 font-semibold">{w.isCertWeek && '🏅 '}{w.title}</span>
                  {now && <span className="pill bg-sky-600 text-white">This week</span>}
                  {w.covered && <span className="pill bg-emerald-100 text-emerald-800">✔ Covered</span>}
                  <span className="text-xs text-slate-500">{shortDate(range.start)} – {shortDate(range.end)}</span>
                </summary>
                <div className="mt-3 space-y-1 text-sm">
                  {w.isCertWeek && w.certName && <p><span className="font-semibold">Cert:</span> {w.certName}</p>}
                  {w.courses.length > 0 && <p><span className="font-semibold">Courses:</span> {w.courses.join(' · ')}</p>}
                  <p><span className="font-semibold">Video hours:</span> {w.videoHours ?? '—'}</p>
                  <p><span className="font-semibold">Deliverable:</span> {w.deliverable || '—'}</p>
                  {w.description && <p className="text-slate-600">{w.description}</p>}
                  {w.notes && <p className="text-slate-500">📝 {w.notes}</p>}
                  {v.isAdmin && (
                    <div className="pt-2">
                      <CoveredToggle id={w.id} covered={w.covered} />
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-semibold text-brand-700">Edit week</summary>
                        <WeekEditor week={w} />
                      </details>
                    </div>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
