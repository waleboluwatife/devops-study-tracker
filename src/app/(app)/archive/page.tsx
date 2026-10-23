import Link from 'next/link';
import { NewRoundForm } from '@/components/new-round-form';
import { naira, shortDate } from '@/lib/format';
import { addDays, standings, weekRange } from '@/lib/rules';
import { prisma } from '@/server/db';
import { loadRoundData } from '@/server/round-data';
import { getViewer, isoDate, roundMemberNames } from '@/server/viewer';

export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ round?: string }> }) {
  const v = await getViewer();
  const rounds = await prisma.round.findMany({ where: { groupId: v.group.id }, orderBy: { number: 'desc' } });
  const wanted = (await searchParams).round;
  const pick = rounds.find(r => r.id === wanted && r.status === 'ARCHIVED');
  const detail = pick ? { data: await loadRoundData(prisma, pick.id), names: await roundMemberNames(pick.id) } : null;
  const nextSunday = addDays(weekRange(v.round.totalWeeks, isoDate(v.round.startDate)).end, 1);

  return (
    <>
      <div>
        <h1 className="page-title">Archive</h1>
        <p className="lede">Finished rounds stay readable. Starting a new round keeps everything from this one.</p>
      </div>
      <section className="card">
        <ul className="divide-y divide-slate-100">
          {rounds.map(r => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span><b>Round {r.number}</b> · {shortDate(isoDate(r.startDate))} – {shortDate(isoDate(r.targetFinishDate))} · {r.totalWeeks} weeks</span>
              {r.status === 'ACTIVE' ? <span className="pill pill-info">In progress</span> : <Link className="btn btn-sm" href={`/archive?round=${r.id}`}>View results</Link>}
            </li>
          ))}
        </ul>
      </section>
      {pick && detail && (
        <section className="card">
          <h2 className="card-title">Round {pick.number} final standings</h2>
          <div className="-mx-2 overflow-x-auto">
            <table className="table">
              <thead><tr><th>#</th><th>Member</th><th className="num">Hours</th><th className="num">Labs</th><th className="num">Meetings</th><th className="num">GitHub</th><th className="num">Perfect weeks</th><th className="num">Still owed</th></tr></thead>
              <tbody>
                {standings(detail.data, pick.totalWeeks).sort((a, b) => b.verifiedHours - a.verifiedHours).map((s, i) => (
                  <tr key={s.memberId}><td>{i + 1}</td><td className="font-semibold">{detail.names.get(s.memberId)}</td><td className="num">{s.verifiedHours}</td><td className="num">{s.labs}</td><td className="num">{s.meetingsAttended}</td><td className="num">{s.githubWeeks}</td><td className="num">{s.perfectWeeks}</td><td className="num">{naira(s.finesOwed)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {v.isAdmin && (
        <section className="card">
          <h2 className="card-title">Start round {v.round.number + 1}</h2>
          <p className="mb-3 text-sm text-sub">Copies the members (all joining in week 1) and the syllabus as a template. The current round becomes read-only here.</p>
          <NewRoundForm suggestedStart={nextSunday} />
        </section>
      )}
    </>
  );
}
