import { NudgeButton } from '@/components/nudge-button';
import { activeMembers, addDays, dailyHours, dailyStreak, dayNumber, weekRange } from '@/lib/rules';
import { prisma } from '@/server/db';
import { getRoundContext } from '@/server/context';

const level = (h: number) => (h <= 0 ? 'bg-slate-100' : h < 1 ? 'bg-[#9BE9A8]' : h < 2 ? 'bg-[#40C463]' : h < 3 ? 'bg-[#30A14E]' : 'bg-[#216E39]');

export default async function StreaksPage() {
  const c = await getRoundContext();
  const { v, data, me, today } = c;
  const first = v.startDate;
  const last = weekRange(v.round.totalWeeks, first).end;
  const upTo = dayNumber(today) < dayNumber(first) ? null : dayNumber(today) > dayNumber(last) ? last : today;
  const myNudges = me ? await prisma.nudge.findMany({ where: { fromId: me, createdAt: { gte: new Date(Date.now() - 24 * 3_600_000) } } }) : [];
  const members = activeMembers(data.members, Math.max(1, v.week));

  return (
    <>
      <div>
        <h1 className="page-title">Daily streaks</h1>
        <p className="lede">One square per day for the whole round. Green means verified study that day. The goal: no grey days.</p>
      </div>
      <section className="card">
        <div className="mb-3 flex flex-wrap items-center gap-1 text-xs text-sub">
          Less {['bg-slate-100', 'bg-[#9BE9A8]', 'bg-[#40C463]', 'bg-[#30A14E]', 'bg-[#216E39]'].map(cl => <span key={cl} className={`inline-block h-[11px] w-[11px] rounded-sm ${cl}`} />)} More
          <span className="ml-3 inline-flex items-center gap-1"><span className="inline-block h-[11px] w-[11px] rounded-sm border-[1.5px] border-wait bg-white" /> logged, not verified yet</span>
        </div>
        {members.map(m => {
          const days = upTo ? dailyHours(data.logs, m, first, first, upTo) : [];
          const streak = upTo ? dailyStreak(data.logs, m, first, upTo) : 0;
          const studied = days.filter(d => d.hours > 0).length;
          const total = (dayNumber(last) - dayNumber(first)) + 1;
          const studiedToday = days.at(-1)?.hours ? true : data.logs.some(l => l.memberId === m.id && l.date === today);
          return (
            <div key={m.id} className="grid gap-3 border-b border-slate-100 py-3 last:border-0 md:grid-cols-[170px_1fr] md:items-center">
              <div>
                <b className="block">{c.name(m.id)}{m.id === me && ' (you)'}</b>
                <small className="text-sub">🔥 {streak}-day streak · {studied} of {days.length} days</small>
                {m.id !== me && me && !studiedToday && upTo && <div className="mt-1.5"><NudgeButton toId={m.id} name={c.name(m.id)} sent={myNudges.some(n => n.toId === m.id)} /></div>}
              </div>
              <div className="overflow-x-auto pb-1">
                <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ gridAutoColumns: '11px' }} role="img"
                  aria-label={`${c.name(m.id)}: studied ${studied} of ${days.length} days so far, ${streak}-day streak`}>
                  {Array.from({ length: total }, (_, i) => {
                    const d = days[i];
                    const date = addDays(first, i);
                    if (!d) return <span key={i} className="h-[11px] rounded-sm bg-slate-50" title={date} />;
                    const cls = d.hours > 0 ? level(d.hours) : d.pending ? 'border-[1.5px] border-wait bg-white' : 'bg-slate-100';
                    return <span key={i} className={`h-[11px] rounded-sm ${cls} ${date === today ? 'outline outline-2 outline-ink' : ''}`} title={`${date}: ${d.hours}h${d.pending ? ' (more awaiting verification)' : ''}`} />;
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
