import { signOut } from '@/auth';
import { Nav } from '@/components/nav';
import { prisma } from '@/server/db';
import { getViewer } from '@/server/viewer';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const v = await getViewer();
  // Logs from others that this member could verify.
  const toVerify = v.roundMember
    ? await prisma.studyLog.count({ where: { roundId: v.round.id, verifiedById: null, screenshotUrl: { not: null }, NOT: { roundMemberId: v.roundMember.id } } })
    : 0;

  async function logout() {
    'use server';
    await signOut({ redirectTo: '/signin' });
  }

  return (
    <div className="min-h-dvh pb-20 sm:pb-8">
      <header className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{v.group.name}</p>
            <p className="text-xs text-emerald-100">
              Round {v.round.number} · Week {v.week} of {v.round.totalWeeks}
              {v.rawWeek < 1 && ' (not started yet)'}
            </p>
          </div>
          <Nav badge={toVerify} />
          <form action={logout} className="flex items-center gap-2">
            <span className="hidden text-xs text-emerald-100 md:inline">{v.member.displayName}</span>
            <button className="rounded-lg px-2 py-1 text-xs font-semibold text-emerald-100 hover:bg-white/10 hover:text-white" type="submit">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:py-6">{children}</main>
    </div>
  );
}
