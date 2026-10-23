import Link from 'next/link';
import { ScoreGrid, type GridMember } from '@/components/score-grid';
import { activeMembers, reviewerFor } from '@/lib/rules';
import { prisma } from '@/server/db';
import { getRoundContext } from '@/server/context';

export default async function ScoreboardPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const c = await getRoundContext();
  const { v, data } = c;
  const lastWeek = Math.max(1, Math.min(v.rawWeek, v.round.totalWeeks));
  const asked = Number((await searchParams).week);
  const week = Number.isInteger(asked) && asked >= 1 && asked <= lastWeek ? asked : lastWeek;
  const [scores, reviews] = await Promise.all([
    prisma.weeklyScore.findMany({ where: { roundId: v.round.id } }),
    prisma.peerReview.findMany({ where: { roundId: v.round.id, week } }),
  ]);
  const active = activeMembers(data.members, week);
  const initial = active.map(m => {
    const s = scores.find(x => x.roundMemberId === m.id && x.week === week);
    return {
      memberId: m.id, week,
      attended: s?.attended ?? false, late15Plus: s?.late15Plus ?? false, studiedAndPresented: s?.studiedAndPresented ?? false,
      githubPushed: s?.githubPushed ?? false, linkedinPosted: s?.linkedinPosted ?? false, waiverRequested48h: s?.waiverRequested48h ?? false,
      githubLink: s?.githubLink ?? '', linkedinLink: s?.linkedinLink ?? '', notes: s?.notes ?? '',
      checkedInAt: s?.checkedInAt ? s.checkedInAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: v.group.timezone }) : null,
    };
  });
  const otherWeeks = data.scores.filter(s => s.week !== week);
  const gridMembers: GridMember[] = active.map(m => {
    const review = reviews.find(r => r.revieweeId === m.id);
    const reviewerId = review?.reviewerId ?? reviewerFor(data.members, week, m.id);
    return { id: m.id, name: c.name(m.id), reviewerId, reviewer: reviewerId ? c.name(reviewerId) : null, signedOff: Boolean(review?.signedOff) };
  });

  return (
    <>
      <div>
        <h1 className="page-title">Weekly scoreboard</h1>
        <p className="lede">Filled in after the Saturday meeting. Fines calculate as you tick. Only the assigned reviewer can sign off a deliverable.</p>
      </div>
      <nav className="flex flex-wrap gap-1.5" aria-label="Weeks">
        {Array.from({ length: lastWeek }, (_, i) => i + 1).map(w => (
          <Link key={w} href={`/scoreboard?week=${w}`} aria-current={w === week ? 'page' : undefined}
            className={`btn btn-sm ${w === week ? 'border-ink bg-ink text-white hover:bg-ink' : ''}`}>Week {w}{w === v.week && v.rawWeek >= 1 ? ' (this week)' : ''}</Link>
        ))}
      </nav>
      <ScoreGrid key={week} week={week} settings={data.settings} members={data.members} gridMembers={gridMembers} initial={initial}
        otherWeeks={otherWeeks} isAdmin={v.isAdmin} meId={c.me} weekStarted={v.rawWeek >= 1} />
      <p className="text-sm text-sub">
        Missed session (absent or didn&apos;t present): ₦{v.group.fineMissedPerMember.toLocaleString('en-NG')} × members that week, charged once.
        Late 15+ minutes: ₦{v.group.fineLateFlat.toLocaleString('en-NG')}, even with a waiver. A waiver requested 48 hours ahead cancels the missed-session fine once per calendar month.
      </p>
    </>
  );
}
