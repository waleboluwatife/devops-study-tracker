'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const LINKS = [
  { href: '/', label: 'Dashboard', short: 'Home', icon: '📊' },
  { href: '/meetings', label: 'Meetings', short: 'Meet', icon: '🎥' },
  { href: '/streaks', label: 'Daily streaks', short: 'Streaks', icon: '🔥' },
  { href: '/log', label: 'Study log', short: 'Log', icon: '📝' },
  { href: '/scoreboard', label: 'Scoreboard', short: 'Score', icon: '✅' },
  { href: '/fines', label: 'Fines & pool', short: 'Fines', icon: '💰' },
  { href: '/progress', label: 'My progress', short: 'Progress', icon: '📈' },
  { href: '/certs', label: 'Certs', short: 'Certs', icon: '🏅' },
  { href: '/activity', label: 'Activity', short: 'Activity', icon: '📣' },
  { href: '/syllabus', label: 'Syllabus', short: 'Syllabus', icon: '📅' },
  { href: '/archive', label: 'Archive', short: 'Archive', icon: '🗄️' },
  { href: '/settings', label: 'Settings', short: 'Settings', icon: '⚙️' },
];
const BOTTOM = ['/', '/log', '/meetings', '/streaks'];

function Badge({ children, tone = 'fail' }: { children: React.ReactNode; tone?: 'fail' | 'accent' }) {
  return <span className={`ml-auto min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold leading-5 text-white ${tone === 'fail' ? 'bg-fail' : 'bg-accent'}`}>{children}</span>;
}

export function Nav({ group, roundLine, me, toVerify, notifCount, meetingToday }: {
  group: string; roundLine: string; me: string; toVerify: number; notifCount: number; meetingToday: boolean;
}) {
  const path = usePathname();
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [path]);
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  const badgeFor = (href: string) => (href === '/log' && toVerify > 0 ? <Badge>{toVerify}</Badge>
    : href === '/meetings' && meetingToday ? <Badge tone="accent">Today</Badge> : null);
  const bell = (
    <Link href="/notifications" aria-label={`Notifications (${notifCount})`} className="relative rounded-md px-1 text-lg">
      🔔{notifCount > 0 && <span className="absolute -right-2 -top-1 rounded-full bg-fail px-1.5 text-[11px] font-bold leading-4 text-white">{notifCount}</span>}
    </Link>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-0.5 overflow-y-auto bg-ink px-3 py-5 text-[#D6DFEE] md:flex" aria-label="Main">
        <div className="mb-3 flex items-start gap-2 px-2.5">
          <div className="flex-1"><p className="font-bold text-white">{group}</p><p className="text-xs text-[#AFC1E0]">{roundLine}</p></div>
          {bell}
        </div>
        {LINKS.map(l => (
          <Link key={l.href} href={l.href} aria-current={active(l.href) ? 'page' : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${active(l.href) ? 'bg-white/15 font-semibold text-white' : 'hover:bg-white/10'}`}>
            <span aria-hidden>{l.icon}</span>{l.label}{badgeFor(l.href)}
          </Link>
        ))}
        <p className="mt-auto border-t border-white/15 px-2.5 pt-3 text-xs text-[#AFC1E0]">Signed in as {me}</p>
      </aside>

      {/* Phone: top bar, bottom bar and the "More" sheet */}
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-ink px-4 py-2.5 text-white md:hidden">
        <p className="min-w-0 flex-1 truncate text-sm font-bold">{group}<span className="ml-2 font-normal text-[#AFC1E0]">{roundLine}</span></p>
        {bell}
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-rule bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
        {BOTTOM.map(h => LINKS.find(l => l.href === h)!).map(l => (
          <Link key={l.href} href={l.href} aria-current={active(l.href) ? 'page' : undefined}
            className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] ${active(l.href) ? 'font-semibold text-accent' : 'text-sub'}`}>
            <span className="text-lg leading-none" aria-hidden>{l.icon}</span>{l.short}
            {l.href === '/log' && toVerify > 0 && <span className="absolute right-3 top-1 rounded-full bg-fail px-1.5 text-[10px] font-bold leading-4 text-white">{toVerify}</span>}
          </Link>
        ))}
        <button type="button" onClick={() => setMore(m => !m)} aria-expanded={more} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-sub">
          <span className="text-lg leading-none" aria-hidden>☰</span>More
        </button>
      </nav>
      {more && (
        <div className="fixed inset-0 z-30 bg-ink/40 md:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-x-3 bottom-20 grid gap-1 rounded-xl bg-white p-2 shadow-xl" onClick={e => e.stopPropagation()}>
            {LINKS.filter(l => !BOTTOM.includes(l.href)).map(l => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2.5 text-sm hover:bg-base"><span aria-hidden>{l.icon}</span> {l.label}</Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
