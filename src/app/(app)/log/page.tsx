import { AddLogForm, EditLogForm, VerifyButton, type CourseOption } from '@/components/log-forms';
import { shortDate } from '@/lib/format';
import { isVerified, todayIn, weekNumber, weekRange } from '@/lib/rules';
import { prisma } from '@/server/db';
import { dbDate, getViewer, isoDate, roundMemberNames } from '@/server/viewer';

export default async function LogPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const v = await getViewer();
  const showAll = (await searchParams).show === 'all';
  const me = v.roundMember?.id;
  const [courses, logs, names] = await Promise.all([
    prisma.course.findMany({ where: { groupId: v.group.id }, orderBy: { order: 'asc' }, include: { modules: { orderBy: { order: 'asc' } } } }),
    prisma.studyLog.findMany({
      where: { roundId: v.round.id, ...(showAll ? {} : { date: { gte: dbDate(weekRange(Math.max(1, v.week - 1), v.startDate).start) } }) },
      include: { module: { include: { course: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
    roundMemberNames(v.round.id),
  ]);
  const options: CourseOption[] = courses.map(c => ({ id: c.id, name: c.name, modules: c.modules.map(m => ({ id: m.id, name: m.name })) }));
  const today = todayIn(v.group.timezone);
  const plain = (l: (typeof logs)[number]) => ({ id: l.id, memberId: l.roundMemberId, date: isoDate(l.date), hours: l.hours, labs: l.labsDone, screenshotUrl: l.screenshotUrl, verifiedById: l.verifiedById });
  const queue = logs.filter(l => me && l.roundMemberId !== me && l.screenshotUrl && !l.verifiedById);
  const pendingTotal = me ? await prisma.studyLog.count({ where: { roundId: v.round.id, verifiedById: null, screenshotUrl: { not: null }, NOT: { roundMemberId: me } } }) : 0;

  return (
    <>
      {me ? (
        <section className="card">
          <h1 className="card-title">Log a study session</h1>
          <AddLogForm courses={options} today={today} minDate={v.startDate} />
        </section>
      ) : (
        <p className="card text-sm">You’re not part of this round, so you can’t log study.</p>
      )}

      <section id="verify" className="card">
        <h2 className="card-title">Needs my verification ({pendingTotal})</h2>
        {queue.length === 0 ? (
          <p className="text-sm text-slate-500">{pendingTotal ? 'Older logs are waiting — show all logs below.' : 'Nothing to verify. 🎉'}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {queue.map(l => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 py-3">
                <a href={l.screenshotUrl!} target="_blank" rel="noreferrer" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.screenshotUrl!} alt={`Screenshot from ${names.get(l.roundMemberId)}`} className="h-16 w-24 rounded-lg border border-slate-200 object-cover" />
                </a>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">{names.get(l.roundMemberId)} · {l.hours}h · {l.labsDone} labs</p>
                  <p className="truncate text-slate-600">{shortDate(isoDate(l.date))} · {l.module ? `${l.module.course.name} → ${l.module.name}` : 'No module'}{l.whatCovered && ` · ${l.whatCovered}`}</p>
                </div>
                <VerifyButton id={l.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="card-title mb-0">{showAll ? 'All logs this round' : 'Logs — this week and last'}</h2>
          <a href={showAll ? '/log' : '/log?show=all'} className="text-sm font-semibold text-brand-700">{showAll ? 'Recent only' : 'Show all'}</a>
        </div>
        {logs.length === 0 ? <p className="text-sm text-slate-500">No logs yet.</p> : (
          <ul className="space-y-2">
            {logs.map(l => {
              const p = plain(l);
              const verified = isVerified(p);
              const noProof = !l.screenshotUrl;
              const mine = l.roundMemberId === me;
              return (
                <li key={l.id} className={`rounded-xl border p-3 text-sm ${noProof ? 'border-rose-300 bg-rose-50' : 'border-slate-200'}`}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold">{names.get(l.roundMemberId)}</span>
                    <span className="text-slate-500">{shortDate(p.date)} · W{weekNumber(p.date, v.startDate)}</span>
                    <span className="tabular-nums">{l.hours}h · {l.labsDone} labs</span>
                    {verified
                      ? <span className="pill bg-emerald-100 text-emerald-800">✔ Verified by {names.get(l.verifiedById!)}</span>
                      : noProof
                        ? <span className="pill bg-rose-100 text-rose-700">⚠ Missing proof</span>
                        : <span className="pill bg-amber-100 text-amber-800">Awaiting verification</span>}
                    {l.screenshotUrl && <a href={l.screenshotUrl} target="_blank" rel="noreferrer" className="text-brand-700 underline">screenshot</a>}
                  </div>
                  {(l.module || l.whatCovered) && (
                    <p className="mt-1 text-slate-600">{l.module && <span className="font-medium">{l.module.course.name} → {l.module.name}. </span>}{l.whatCovered}</p>
                  )}
                  {mine && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-semibold text-brand-700">Edit</summary>
                      <div className="mt-2">
                        <EditLogForm id={l.id} courses={options} today={today} minDate={v.startDate} verified={verified}
                          values={{ date: p.date, hours: l.hours, labs: l.labsDone, whatCovered: l.whatCovered, moduleId: l.moduleId }} />
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
