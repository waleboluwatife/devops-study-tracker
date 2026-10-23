import { CertEditor, MockScoreForm } from '@/components/cert-forms';
import { shortDate } from '@/lib/format';
import { activeMembers, daysUntil, meetingDate } from '@/lib/rules';
import { prisma } from '@/server/db';
import { getRoundContext } from '@/server/context';
import { isoDate } from '@/server/viewer';

const tone = (r: number) => (r >= 70 ? 'bg-pass' : r >= 40 ? 'bg-wait' : 'bg-fail');

export default async function CertsPage() {
  const c = await getRoundContext();
  const { v, data, today } = c;
  const certs = await prisma.cert.findMany({
    where: { groupId: v.group.id },
    include: { scores: { where: { roundMember: { roundId: v.round.id } }, orderBy: { takenAt: 'desc' } } },
  });
  const dateOf = (cert: (typeof certs)[number]) => cert.examDate ? isoDate(cert.examDate) : cert.week ? meetingDate(cert.week, v.startDate) : null;
  const sorted = [...certs].sort((a, b) => (dateOf(a) ?? '9999').localeCompare(dateOf(b) ?? '9999'));
  const nextId = sorted.find(cert => { const d = dateOf(cert); return d && d >= today; })?.id;
  const people = activeMembers(data.members, Math.max(1, v.week));

  return (
    <>
      <div>
        <h1 className="page-title">Cert tracker</h1>
        <p className="lede">Exam dates and each person&apos;s readiness from their latest mock exam.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map(cert => {
          const date = dateOf(cert);
          const days = date ? daysUntil(date, today) : null;
          const latest = new Map<string, number>();
          for (const s of cert.scores) if (!latest.has(s.roundMemberId)) latest.set(s.roundMemberId, s.score);
          return (
            <section key={cert.id} className={`card space-y-2.5 ${cert.id === nextId ? 'border-[#E8D27B] bg-[#FFFDF0]' : ''}`}>
              <h2 className="font-semibold">🏅 {cert.name}</h2>
              <p className="text-sm text-sub">
                {cert.week ? `Week ${cert.week}` : 'Week not set'}{date && ` · ${shortDate(date)}`}
                {days !== null && <span className="font-mono"> · {days >= 0 ? `${days} days` : 'done'}</span>}
              </p>
              {latest.size === 0 ? <p className="text-sm text-sub">Readiness shows once someone logs a mock exam.</p> : (
                <div className="grid gap-1.5">
                  {people.map(m => {
                    const r = latest.get(m.id);
                    return (
                      <div key={m.id} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2 text-xs">
                        <span className="truncate">{c.name(m.id)}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-slate-100">{r !== undefined && <span className={`block h-full ${tone(r)}`} style={{ width: `${r}%` }} />}</span>
                        <span className="num">{r !== undefined ? `${r}%` : '—'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {cert.notes && <p className="text-sm text-sub">{cert.notes}</p>}
              {c.me && <MockScoreForm certId={cert.id} certName={cert.name} />}
              {v.isAdmin && (
                <details><summary className="cursor-pointer text-sm font-semibold text-accent">Edit</summary>
                  <div className="mt-2"><CertEditor cert={{ id: cert.id, name: cert.name, week: cert.week, examDate: cert.examDate ? isoDate(cert.examDate) : null, notes: cert.notes }} /></div>
                </details>
              )}
            </section>
          );
        })}
      </div>
      {certs.length === 0 && <p className="card text-sm text-sub">No certs yet.</p>}
      {v.isAdmin && <section className="card"><h2 className="card-title">Add a cert</h2><CertEditor /></section>}
    </>
  );
}
