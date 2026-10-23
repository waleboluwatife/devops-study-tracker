import Link from 'next/link';
import { HoursBars, WeeklyColumns } from '@/components/charts';
import { FocusTimer } from '@/components/focus-timer';
import { Pipelines } from '@/components/pipelines';
import { naira, shortDate } from '@/lib/format';
import { getDashboard } from '@/server/dashboard';

export default async function DashboardPage() {
  const d = await getDashboard();
  const sw = d.syllabusWeek;
  const meetAt = new Date(d.meeting.start);
  const meetWhen = meetAt.toLocaleString('en-GB', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: d.timezone });
  const todayLabel = new Date(`${d.today}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' });

  return (
    <>
      <div>
        <h1 className="page-title">Week {d.week}: {sw?.title ?? 'topic to be set'}</h1>
        <p className="lede">{shortDate(d.range.start)} – {shortDate(d.range.end)}{sw?.description ? `. ${sw.description}` : ''}{sw?.isCertWeek ? ' · 🏅 Cert week' : ''}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="card min-w-0">
          <h2 className="card-title">This week&apos;s pipelines</h2>
          <Pipelines items={d.pipelines} />
        </section>

        <div className="min-w-0 space-y-4">
          <section className="card space-y-3">
            <h2 className="card-title mb-0">Today, {todayLabel}</h2>
            <div className="flex flex-wrap items-baseline gap-3">
              <b className="text-2xl">{d.studiedToday ? `${d.todayHours}h logged today` : 'Not studied yet today'}</b>
              <span className="pill pill-pass">🔥 {d.myStreak}-day streak</span>
            </div>
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-pass" style={{ width: `${Math.min(100, (d.myHours / d.minHours) * 100)}%` }} /></div>
              <p className="mt-1.5 text-sm text-sub">
                {d.pace.onTrack ? 'On track for the week. Keep the daily streak going.'
                  : `${d.pace.left}h left this week${d.pace.daysLeft > 1 ? ` — about ${d.pace.perDay}h a day for ${d.pace.daysLeft} days.` : '. Today is the last day.'}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <FocusTimer startedAt={d.myFocusStartedAt} />
              <Link href="/meetings" className="btn">Meeting {meetWhen}</Link>
            </div>
            <div>
              <p className="text-xs text-sub">Studying now</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {d.studyingNow.length === 0 ? <span className="text-sm text-sub">Nobody right now.</span> : d.studyingNow.map(s => (
                  <span key={s.name} className="pill pill-pass"><span className="h-2 w-2 rounded-full bg-pass motion-safe:animate-pulse" aria-hidden />{s.name} · {s.minutes} min</span>
                ))}
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">Your week</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-sub">Meeting lead</dt><dd className="font-semibold">{d.lead}</dd></div>
              <div><dt className="text-xs text-sub">You review</dt><dd className="font-semibold">{d.iReview ?? '—'}</dd></div>
              <div><dt className="text-xs text-sub">Reviewed by</dt><dd className="font-semibold">{d.reviewedBy ?? '—'}</dd></div>
              <div><dt className="text-xs text-sub">Deliverable</dt><dd className="font-semibold">{sw?.deliverable || '—'}</dd></div>
              <div><dt className="text-xs text-sub">Verified</dt><dd className="font-mono font-semibold">{d.myHours} / {d.minHours}h</dd></div>
              <div><dt className="text-xs text-sub">To the finish</dt><dd className="font-mono font-semibold">{d.daysLeft >= 0 ? `${d.daysLeft} days` : 'Finished'}</dd></div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/log#add" className="btn btn-primary">Log study</Link>
              {d.toVerify > 0 && <Link href="/log#verify" className="btn">Verify {d.toVerify} log{d.toVerify > 1 ? 's' : ''}</Link>}
            </div>
          </section>

          <section className="card"><h2 className="card-title">Verified hours this week</h2><HoursBars rows={d.pipelines.map(p => ({ name: p.name, hours: p.hours }))} min={d.minHours} /></section>
          <section className="card"><h2 className="card-title">Group hours per week</h2><WeeklyColumns weeks={d.perWeek} /></section>
        </div>
      </div>

      <section className="card">
        <h2 className="card-title">Leaderboard</h2>
        <div className="-mx-2 overflow-x-auto">
          <table className="table">
            <thead><tr><th>#</th><th>Member</th><th className="num">Hours</th><th className="num">Labs</th><th className="num">Meetings</th><th className="num">GitHub</th><th className="num">LinkedIn</th><th className="num">Perfect</th><th className="num">Daily streak</th><th className="num">Owes</th></tr></thead>
            <tbody>
              {d.board.map((s, i) => (
                <tr key={s.memberId}>
                  <td className="text-sub">{i + 1}</td><td className="font-semibold">{s.name}</td>
                  <td className="num">{s.verifiedHours}</td><td className="num">{s.labs}</td><td className="num">{s.meetingsAttended}</td>
                  <td className="num">{s.githubWeeks}</td><td className="num">{s.linkedinPosts}</td><td className="num">{s.perfectWeeks}</td>
                  <td className="num">{s.streak > 0 ? `🔥 ${s.streak}` : '0'}</td>
                  <td className={`num ${s.finesOwed > 0 ? 'font-semibold text-fail' : ''}`}>{naira(s.finesOwed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
