import Link from 'next/link';
import { getNotifications } from '@/server/notifications';

export default async function NotificationsPage() {
  const { list } = await getNotifications();
  return (
    <>
      <div>
        <h1 className="page-title">Notifications</h1>
        <p className="lede">What needs you right now. These clear themselves once done.</p>
      </div>
      <section className="card">
        {list.length === 0 ? <p className="text-sm text-sub">You&apos;re all caught up. 🎉</p> : (
          <ul className="divide-y divide-slate-100">
            {list.map(n => (
              <li key={n.title}>
                <Link href={n.href} className="grid grid-cols-[1.75rem_1fr] gap-2.5 py-3 hover:bg-base">
                  <span className="text-center text-lg" aria-hidden>{n.icon}</span>
                  <span><b className="block">{n.title}</b><span className="text-sm text-sub">{n.detail}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
