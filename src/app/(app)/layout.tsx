import { signOut } from '@/auth';
import { Nav } from '@/components/nav';
import { getRoundContext } from '@/server/context';
import { getNotifications } from '@/server/notifications';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const c = await getRoundContext();
  const { list, toVerify } = await getNotifications();
  const { v } = c;
  const meetingToday = c.today === c.meeting.start.toLocaleDateString('en-CA', { timeZone: v.group.timezone });

  async function logout() {
    'use server';
    await signOut({ redirectTo: '/signin' });
  }

  return (
    <div className="min-h-dvh md:flex">
      <Nav group={v.group.name} roundLine={`Round ${v.round.number} · Week ${v.week} of ${v.round.totalWeeks}${v.rawWeek < 1 ? ' (not started)' : ''}`}
        me={v.member.displayName} toVerify={toVerify} notifCount={list.length} meetingToday={meetingToday} />
      <main className="mx-auto w-full min-w-0 max-w-6xl space-y-4 px-4 pb-24 pt-4 md:px-7 md:pb-10 md:pt-6">
        {children}
        <form action={logout} className="pt-4 text-center md:text-left">
          <button className="text-xs text-sub underline" type="submit">Sign out</button>
        </form>
      </main>
    </div>
  );
}
