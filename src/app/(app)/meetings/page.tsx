import Link from 'next/link';
import { CheckIn, CopyLink, Countdown, DeliverableForm, NotesForm, Rsvp } from '@/components/meeting-controls';
import { naira } from '@/lib/format';
import { activeMembers, meetingLead, presentationOrder, reviewerAssignments, waiverAllowed } from '@/lib/rules';
import { prisma } from '@/server/db';
import { getRoundContext } from '@/server/context';

export default async function MeetingsPage() {
  const c = await getRoundContext();
  const { v, data, me } = c;
  const week = v.week;
  const tz = v.group.timezone;
  const start = c.meeting.start;
  const [rsvps, scores, meetings, syllabus] = await Promise.all([
    prisma.meetingRsvp.findMany({ where: { roundId: v.round.id, week } }),
    prisma.weeklyScore.findMany({ where: { roundId: v.round.id, week } }),
    prisma.meeting.findMany({ where: { roundId: v.round.id, week: { lte: week } }, orderBy: { week: 'desc' } }),
    prisma.syllabusWeek.findMany({ where: { roundId: v.round.id, weekNumber: { in: [week, week + 1] } } }),
  ]);
  const myScore = scores.find(s => s.roundMemberId === me);
  const myRsvp = rsvps.find(r => r.roundMemberId === me);
  const order = presentationOrder(data.members, week);
  const pairs = reviewerAssignments(data.members, week);
  const nextLead = week < v.round.totalWeeks ? c.name(meetingLead(data.members, week + 1)) : null;
  const topic = syllabus.find(s => s.weekNumber === week);
  const nextTopic = syllabus.find(s => s.weekNumber === week + 1);
  const when = start.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: tz });
  const time = (d: Date) => d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', timeZone: tz });
  const link = c.meeting.link;
  const shareText = `DevOps study meeting — ${when}${topic ? `\nTopic: week ${week}, ${topic.title}` : ''}\nLead: ${c.name(meetingLead(data.members, week))}${link ? `\nJoin: ${link}` : ''}`;
  const people = activeMembers(data.members, week);
  const rsvpWord = { GOING: ['Going', 'pill-pass'], LATE: ['Running late', 'pill-wait'], CANT: ["Can't make it", 'pill-fail'] } as const;
  const thisWeekNotes = meetings.find(m => m.week === week);
  const past = meetings.filter(m => m.week < week && (m.notes || m.recordingUrl));

  return (
    <>
      <div>
        <h1 className="page-title">Meetings</h1>
        <p className="lede">Every Saturday. The link, the agenda and check-in all live here.</p>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-4">
          <section className="card space-y-4">
            <div><p className="text-xl font-bold">{when}</p><Countdown start={start.toISOString()} minutes={c.meeting.minutes} /></div>
            {link ? (
              <div className="flex flex-wrap items-center gap-2">
                <a href={link} target="_blank" rel="noreferrer" className="btn btn-accent">🎥 Join the meeting</a>
                <code className="rounded-md bg-base px-2 py-1.5 font-mono text-sm">{link.replace(/^https?:\/\//, '')}</code>
                <CopyLink link={link} />
              </div>
            ) : <p className="rounded-lg bg-wait-bg px-3 py-2 text-sm text-[#6b4a00]">No meeting link yet. {v.isAdmin ? <Link className="underline" href="/settings#meeting">Add it in Settings.</Link> : 'Ask an admin to add it in Settings.'}</p>}
            <div className="flex flex-wrap gap-2">
              <a className="btn btn-sm" href="/api/meeting.ics">📅 Add to calendar</a>
              <a className="btn btn-sm" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">Share to WhatsApp</a>
            </div>
            {me && v.rawWeek >= 1 && (
              <>
                <Rsvp current={myRsvp?.status ?? null} waiverPossible={waiverAllowed(new Date(), start)}
                  lateFine={naira(v.group.fineLateFlat)} missFine={naira(v.group.fineMissedPerMember * people.length)} />
                <CheckIn checkedIn={myScore?.checkedInAt ? time(myScore.checkedInAt) : null} opensAt={time(new Date(start.getTime() - 15 * 60_000))} />
                <DeliverableForm link={myScore?.githubLink ?? ''} />
              </>
            )}
          </section>

          <section className="card">
            <h2 className="card-title">Agenda</h2>
            <ol className="grid list-decimal gap-2 pl-5 text-sm">
              <li><b>{c.name(order[0]?.id)} opens</b> <span className="text-sub">— meeting lead this week{topic ? `; recap of ${topic.title}` : ''}</span></li>
              <li><b>Presentations</b>, in rotation order:
                <ol className="mt-1.5 grid list-decimal gap-1.5 pl-5">
                  {order.map(m => {
                    const s = scores.find(x => x.roundMemberId === m.id);
                    return (
                      <li key={m.id}>{c.name(m.id)} — {s?.githubLink
                        ? <><a className="text-accent underline" href={s.githubLink} target="_blank" rel="noreferrer">{s.githubLink.replace(/^https?:\/\/(www\.)?/, '')}</a> <span className="pill pill-pass">shared</span></>
                        : <span className="pill pill-wait">no link yet</span>}</li>
                    );
                  })}
                </ol>
              </li>
              <li><b>Peer reviews</b> <span className="text-sub">— {[...pairs].map(([reviewee, reviewer]) => `${c.name(reviewer)}→${c.name(reviewee)}`).join(', ')}</span></li>
              <li><b>Scoreboard and fines</b> <span className="text-sub">— attendance comes from check-ins</span></li>
              {nextLead && <li><b>Next week</b> <span className="text-sub">— {nextTopic?.title ?? 'topic to be set'}, led by {nextLead}</span></li>}
            </ol>
          </section>
        </div>

        <div className="min-w-0 space-y-4">
          <section className="card">
            <h2 className="card-title">Who&apos;s coming</h2>
            <table className="table"><tbody>
              {people.map(m => {
                const r = rsvps.find(x => x.roundMemberId === m.id);
                const s = scores.find(x => x.roundMemberId === m.id);
                return (
                  <tr key={m.id}>
                    <td>{c.name(m.id)}{m.id === me && ' (you)'}</td>
                    <td className="text-right">
                      {s?.checkedInAt ? <span className="pill pill-pass">✋ here {time(s.checkedInAt)}</span>
                        : r ? <span className={`pill ${rsvpWord[r.status][1]}`}>{rsvpWord[r.status][0]}</span>
                        : <span className="pill pill-wait">No reply</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody></table>
          </section>
          <section className="card space-y-3">
            <h2 className="card-title mb-0">Notes</h2>
            {v.isAdmin ? <NotesForm week={week} notes={thisWeekNotes?.notes ?? ''} recordingUrl={thisWeekNotes?.recordingUrl ?? ''} />
              : thisWeekNotes?.notes ? <p className="whitespace-pre-wrap text-sm">{thisWeekNotes.notes}</p> : <p className="text-sm text-sub">Notes appear here after the meeting.</p>}
            {past.length > 0 && <h3 className="pt-2 text-sm font-semibold">Past meetings</h3>}
            {past.map(m => (
              <div key={m.id} className="border-t border-slate-100 pt-2 text-sm">
                <p className="font-semibold">Week {m.week}</p>
                {m.notes && <p className="whitespace-pre-wrap text-sub">{m.notes}</p>}
                {m.recordingUrl && <a className="text-accent underline" href={m.recordingUrl} target="_blank" rel="noreferrer">Recording</a>}
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
