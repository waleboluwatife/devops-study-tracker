'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/log', label: 'Study log', icon: '📝' },
  { href: '/syllabus', label: 'Syllabus', icon: '📅' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Nav({ badge }: { badge: number }) {
  const path = usePathname();
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  return (
    <>
      {/* Top tabs on wider screens */}
      <nav className="hidden gap-1 sm:flex" aria-label="Main">
        {LINKS.map(l => (
          <Link key={l.href} href={l.href} className={`relative rounded-lg px-3 py-2 text-sm font-semibold ${active(l.href) ? 'bg-white/15 text-white' : 'text-emerald-100 hover:text-white'}`}>
            {l.label}
            {l.href === '/log' && badge > 0 && <Badge n={badge} />}
          </Link>
        ))}
      </nav>
      {/* Bottom bar on phones */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden" aria-label="Main">
        {LINKS.map(l => (
          <Link key={l.href} href={l.href} className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active(l.href) ? 'text-brand-700' : 'text-slate-500'}`}>
            <span className="text-lg leading-none" aria-hidden>{l.icon}</span>
            {l.label}
            {l.href === '/log' && badge > 0 && <Badge n={badge} />}
          </Link>
        ))}
      </nav>
    </>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span className="absolute -top-0.5 right-2 min-w-5 rounded-full bg-rose-500 px-1.5 text-center text-[11px] font-bold leading-5 text-white" aria-label={`${n} to verify`}>
      {n}
    </span>
  );
}
