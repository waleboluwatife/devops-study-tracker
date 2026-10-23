'use client';
import { useMemo, useState, useTransition } from 'react';
import { computeFines, type GroupSettings, type Member, type WeeklyScore } from '@/lib/rules';
import { naira } from '@/lib/format';
import { saveScores, signOffReview } from '@/server/actions/accountability';
import type { ActionState } from '@/server/actions/logs';

type Row = WeeklyScore & { githubLink: string; linkedinLink: string; notes: string; checkedInAt: string | null };
export interface GridMember { id: string; name: string; reviewer: string | null; reviewerId: string | null; signedOff: boolean }

const FLAGS: [keyof WeeklyScore, string][] = [
  ['attended', 'Attended'], ['late15Plus', 'Late 15+'], ['studiedAndPresented', 'Presented'],
  ['githubPushed', 'GitHub'], ['linkedinPosted', 'LinkedIn'], ['waiverRequested48h', 'Waiver 48h'],
];

export function ScoreGrid({ week, settings, members, gridMembers, initial, otherWeeks, isAdmin, meId, weekStarted }: {
  week: number; settings: GroupSettings; members: Member[]; gridMembers: GridMember[]; initial: Row[];
  otherWeeks: WeeklyScore[]; isAdmin: boolean; meId: string | null; weekStarted: boolean;
}) {
  const [rows, setRows] = useState(initial);
  const [msg, setMsg] = useState<ActionState>({});
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(rows) !== JSON.stringify(initial);
  // Live fines: this week's rows on top of every other week (waivers are per month).
  const fines = useMemo(() => computeFines(settings, members, [...otherWeeks, ...rows]).filter(f => f.week === week), [settings, members, otherWeeks, rows, week]);
  const set = (id: string, k: keyof Row, val: boolean | string) => setRows(rs => rs.map(r => (r.memberId === id ? { ...r, [k]: val } : r)));

  const save = () => start(async () => {
    setMsg(await saveScores(week, rows.map(r => ({
      roundMemberId: r.memberId, attended: r.attended, late15Plus: r.late15Plus, studiedAndPresented: r.studiedAndPresented,
      githubPushed: r.githubPushed, githubLink: r.githubLink, linkedinPosted: r.linkedinPosted, linkedinLink: r.linkedinLink,
      waiverRequested48h: r.waiverRequested48h, notes: r.notes,
    }))));
  });
  const sign = (revieweeId: string, signed: boolean) => start(async () => setMsg(await signOffReview(week, revieweeId, signed, '')));

  return (
    <div className="card">
      <div className="-mx-2 overflow-x-auto">
        <table className="table">
          <thead><tr><th>Member</th>{FLAGS.map(([, l]) => <th key={l} className="text-center">{l}</th>)}<th>Review sign-off</th><th className="num">Fine</th></tr></thead>
          <tbody>
            {gridMembers.map(gm => {
              const r = rows.find(x => x.memberId === gm.id)!;
              const f = fines.find(x => x.memberId === gm.id);
              return (
                <tr key={gm.id}>
                  <td><b>{gm.name}</b>{r.checkedInAt && <span className="block text-xs text-sub">checked in {r.checkedInAt}</span>}</td>
                  {FLAGS.map(([k, l]) => (
                    <td key={k} className="text-center">
                      <input type="checkbox" className="h-[18px] w-[18px] accent-pass" checked={Boolean(r[k])} disabled={!isAdmin || !weekStarted}
                        aria-label={`${l} — ${gm.name}`} onChange={e => set(gm.id, k, e.target.checked)} />
                    </td>
                  ))}
                  <td>
                    {gm.signedOff
                      ? <span className="pill pill-pass">✓ {gm.reviewer}{gm.reviewerId === meId && <button type="button" className="ml-1 underline" onClick={() => sign(gm.id, false)} disabled={pending}>undo</button>}</span>
                      : gm.reviewerId === meId
                        ? <button type="button" className="btn btn-sm" onClick={() => sign(gm.id, true)} disabled={pending || !weekStarted}>Sign off</button>
                        : gm.reviewer ? <span className="pill pill-wait">{gm.reviewer} to sign</span> : <span className="text-sub">—</span>}
                  </td>
                  <td className={`num font-semibold ${f && f.total > 0 ? 'text-fail' : ''}`}>
                    {f ? (f.total ? naira(f.total) : '₦0') : '—'}
                    {f?.waived && <span className="block text-xs font-normal text-sub">miss waived</span>}
                    {f?.waiverRefused && <span className="block text-xs font-normal text-fail">2nd waiver this month</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {isAdmin && weekStarted && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" onClick={save} disabled={pending || !dirty}>{pending ? 'Saving…' : dirty ? 'Save week ' + week : 'Saved'}</button>
          {msg.error && <span role="alert" className="text-sm text-fail">{msg.error}</span>}
          {msg.ok && <span role="status" className="text-sm text-pass">{msg.ok}</span>}
        </div>
      )}
      {!isAdmin && <p className="mt-3 text-sm text-sub">Only admins fill in the scoreboard. Check-ins and RSVPs fill parts of it automatically.</p>}
    </div>
  );
}
