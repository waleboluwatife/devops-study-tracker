import Link from 'next/link';
import { HoursBars, WeeklyColumns } from '@/components/charts';
import { naira, shortDate } from '@/lib/format';
import { statusLabel } from '@/lib/rules';
import { getDashboard } from '@/server/dashboard';
import { getViewer } from '@/server/viewer';

export default async function DashboardPage() {
  const v = await getViewer();
  const d = await getDashboard(v);
  const sw = d.syllabusWeek;
  const pct = Math.min(100, (d.myHours / Math.max(d.minHours, 0.01)) * 100);

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-3">
        <div className={`card lg:col-span-2 ${sw?.isCertWeek ? 'border-amber-300 bg-amber-50' : ''}`}>
          <p className="card-title">Week {d.week} · {shortDate(d.range.start)} – {shortDate(d.range.end)}{sw?.isCertWeek && ' · 🏅 Cert week'}</p>
          <h1 className="text-xl font-bold sm:text-2xl">{sw?.title ?? 'No topic set'}</h1>
          {sw?.deliverable && <p className="mt-2 text-sm"><span className="font-semibold">Deliverable:</span> {sw.deliverable}</p>}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Fact label="Meeting lead" value={d.lead} />
            <Fact label="You review" value={d.iReview ?? '—'} />
            <Fact label="Reviewed by" value={d.reviewedBy ?? '—'} />
            <Fact label="Days to finish" value={d.daysLeft >= 0 ? `${d.daysLeft} days` : 'Finished'} hint={shortDate(d.targetFinishDate)} />
          </dl>
        </div>

        <div className="card">
          <p className="card-title">My week</p>
          <p className="text-3xl font-bold tabular-nums">{d.myHours}<span className="text-base font-medium text-slate-500"> / {d.minHours}h verified</span></p>
          <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} /></div>
          <p className="mt-2 text-sm text-slate-600">{d.myHours >= d.minHours ? 'On track ✅' : `${Math.round((d.minHours - d.myHours) * 10) / 10} hrs short`}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/log" className="btn btn-primary">Log study</Link>
            {d.toVerify > 0 && <Link href="/log#verify" className="btn btn-ghost">Verify {d.toVerify} log{d.toVerify > 1 ? 's' : ''}</Link>}
          </div>
        </div>
      </section>

      <section className="card">
        <p className="card-title">Leaderboard</p>
        <div className="-mx-2 overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>#</th><th>Member</th><th>Hours</th><th>Labs</th><th>Meetings</th><th>GitHub</th><th>LinkedIn</th><th>Perfect</th><th>Streak</th><th>Fines owed</th></tr>
            </thead>
            <tbody>
              {d.board.map((s, i) => (
                <tr key={s.memberId}>
                  <td className="text-slate-400">{i + 1}</td>
                  <td className="font-semibold">{s.name}</td>
                  <td className="tabular-nums">{s.verifiedHours}</td>
                  <td className="tabular-nums">{s.labs}</td>
                  <td className="tabular-nums">{s.meetingsAttended}</td>
                  <td className="tabular-nums">{s.githubWeeks}</td>
                  <td className="tabular-nums">{s.linkedinPosts}</td>
                  <td className="tabular-nums">{s.perfectWeeks}</td>
                  <td className="tabular-nums">{s.streak > 0 ? `🔥 ${s.streak}` : '0'}</td>
                  <td className={`tabular-nums ${s.finesOwed > 0 ? 'font-semibold text-rose-600' : ''}`}>{naira(s.finesOwed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <p className="card-title">Accountability · Week {d.week}</p>
        <div className="-mx-2 overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>Member</th><th>Verified</th><th>Status</th><th>Reviews</th><th>Reviewed by</th><th>Awaiting verification</th></tr>
            </thead>
            <tbody>
              {d.accountability.map(a => (
                <tr key={a.memberId}>
                  <td className="font-semibold">{a.name}</td>
                  <td className="tabular-nums">{a.hours}h</td>
                  <td><span className={`pill ${a.status.onTrack ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{statusLabel(a.status)}</span></td>
                  <td>{a.reviews} {a.reviewGiven && '✔'}</td>
                  <td>{a.reviewedBy} {a.reviewReceived && '✔'}</td>
                  <td>
                    {a.waitingVerification > 0 ? `${a.waitingVerification} log${a.waitingVerification > 1 ? 's' : ''}` : '—'}
                    {a.noProof > 0 && <span className="pill ml-1 bg-rose-100 text-rose-700">{a.noProof} without proof</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <p className="card-title">Verified hours per member</p>
          <HoursBars rows={d.board.map(s => ({ name: s.name, hours: s.verifiedHours }))} />
        </div>
        <div className="card">
          <p className="card-title">Group hours per week</p>
          <WeeklyColumns weeks={d.perWeek} />
        </div>
      </section>
    </>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="font-semibold">{value}</dd>
      {hint && <dd className="text-xs text-slate-500">{hint}</dd>}
    </div>
  );
}
