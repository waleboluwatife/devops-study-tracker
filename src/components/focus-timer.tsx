'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { startFocus, stopFocus } from '@/server/actions/habit';

const clock = (ms: number) => {
  const m = Math.floor(ms / 60_000);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** Start/stop a focus session. While it runs, the group sees you under "Studying now". */
export function FocusTimer({ startedAt }: { startedAt: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState('');
  useEffect(() => {
    if (!startedAt) return undefined;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [startedAt]);

  if (!startedAt) {
    return (
      <span className="inline-flex flex-col">
        <button type="button" className="btn btn-primary" disabled={pending}
          onClick={() => start(async () => { const r = await startFocus(); if (r.error) setError(r.error); else router.refresh(); })}>
          ▶ Start a focus session
        </button>
        {error && <span role="alert" className="mt-1 text-xs text-fail">{error}</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <span className="font-mono text-2xl font-semibold" aria-live="polite">{clock(now - new Date(startedAt).getTime())}</span>
      <button type="button" className="btn" disabled={pending}
        onClick={() => start(async () => {
          const r = await stopFocus();
          if (r.error) { setError(r.error); return; }
          router.push(`/log?hours=${r.hours}#add`);
        })}>
        ■ Stop and log it
      </button>
      {error && <span role="alert" className="text-xs text-fail">{error}</span>}
    </span>
  );
}
