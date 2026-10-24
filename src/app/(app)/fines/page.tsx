import { DeleteMoney, MoneyForm } from '@/components/money-forms';
import { naira, shortDate } from '@/lib/format';
import { activeMembers, balance, computeFines, poolBalance, waiverMonth, waiversUsed } from '@/lib/rules';
import { prisma } from '@/server/db';
import { getRoundContext } from '@/server/context';
import { isoDate } from '@/server/viewer';

export default async function FinesPage() {
  const c = await getRoundContext();
  const { v, data } = c;
  const fines = computeFines(data.settings, data.members, data.scores, data.logs);
  const month = waiverMonth(v.week, v.startDate);
  const monthName = new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
  const [payments, carryOvers] = await Promise.all([
    prisma.payment.findMany({ where: { roundId: v.round.id }, orderBy: { date: 'desc' } }),
    prisma.fineCarryOver.findMany({ where: { roundId: v.round.id }, orderBy: { createdAt: 'desc' } }),
  ]);
  const people = activeMembers(data.members, Math.max(1, v.week)).map(m => ({ id: m.id, name: c.name(m.id) }));
  const fineLines = fines.filter(f => f.total > 0).sort((a, b) => b.week - a.week);

  return (
    <>
      <div>
        <h1 className="page-title">Fines and pool</h1>
        <p className="lede">Outstanding = fines + carried over − paid. Everything here is calculated from the scoreboard.</p>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <section className="card">
            <div className="-mx-2 overflow-x-auto">
              <table className="table">
                <thead><tr><th>Member</th><th className="num">Fined</th><th className="num">Carried over</th><th className="num">Paid</th><th className="num">Outstanding</th><th>Waivers in {monthName}</th></tr></thead>
                <tbody>
                  {people.map(p => {
                    const b = balance(fines, data.carryOvers, data.payments, p.id);
                    return (
                      <tr key={p.id}>
                        <td className="font-semibold">{p.name}</td>
                        <td className="num">{naira(b.fined)}</td><td className="num">{naira(b.carriedOver)}</td><td className="num">{naira(b.paid)}</td>
                        <td className={`num font-semibold ${b.outstanding > 0 ? 'text-fail' : 'text-pass'}`}>{naira(b.outstanding)}</td>
                        <td>{waiversUsed(fines, p.id, month, v.startDate)} of 1 used</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <section className="card">
            <h2 className="card-title">Fine history</h2>
            {fineLines.length === 0 ? <p className="text-sm text-sub">No fines yet. Keep it that way.</p> : (
              <ul className="divide-y divide-slate-100 text-sm">
                {fineLines.map(f => (
                  <li key={`${f.memberId}-${f.week}`} className="flex flex-wrap justify-between gap-2 py-2">
                    <span><b>{c.name(f.memberId)}</b> · week {f.week}: {[f.missed && 'missed session', f.late && 'late', f.shortHours && 'short on hours'].filter(Boolean).join(', ')}{f.waiverRefused && ' (second waiver this month didn’t count)'}</span>
                    <span className="font-mono font-semibold text-fail">{naira(f.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card">
            <h2 className="card-title">Payments and carry-overs</h2>
            {payments.length + carryOvers.length === 0 ? <p className="text-sm text-sub">Nothing recorded yet.</p> : (
              <ul className="divide-y divide-slate-100 text-sm">
                {payments.map(p => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>💸 <b>{c.name(p.roundMemberId)}</b> paid · {shortDate(isoDate(p.date))}{p.note && ` · ${p.note}`}</span>
                    <span className="flex items-center gap-3"><span className="font-mono text-pass">{naira(p.amount)}</span>{v.isAdmin && <DeleteMoney kind="payment" id={p.id} />}</span>
                  </li>
                ))}
                {carryOvers.map(co => (
                  <li key={co.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>↪️ <b>{c.name(co.roundMemberId)}</b> carried over{co.note && ` · ${co.note}`}</span>
                    <span className="flex items-center gap-3"><span className="font-mono text-fail">{naira(co.amount)}</span>{v.isAdmin && <DeleteMoney kind="carryOver" id={co.id} />}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <div className="space-y-4">
          <section className="card">
            <h2 className="card-title">Pool balance</h2>
            <p className="font-mono text-3xl font-semibold">{naira(poolBalance(data.payments))}</p>
            <p className="mt-1 text-sm text-sub">Idea from the sheet: spend it on exam vouchers.</p>
          </section>
          {v.isAdmin && (
            <>
              <section className="card"><h2 className="card-title">Record a payment</h2><MoneyForm kind="payment" members={people} today={c.today} /></section>
              <section className="card"><h2 className="card-title">Add a carry-over</h2><MoneyForm kind="carryOver" members={people} today={c.today} /></section>
            </>
          )}
        </div>
      </div>
    </>
  );
}
