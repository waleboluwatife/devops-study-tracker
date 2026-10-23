'use client';
import { useState, useTransition } from 'react';
import { nudge } from '@/server/actions/habit';

export function NudgeButton({ toId, name, sent }: { toId: string; name: string; sent: boolean }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(sent);
  const [error, setError] = useState('');
  return (
    <span className="inline-flex flex-col">
      <button type="button" className="btn btn-sm" disabled={pending || done}
        onClick={() => start(async () => { const r = await nudge(toId); if (r.error) setError(r.error); else setDone(true); })}>
        {done ? 'Nudged today' : pending ? '…' : `👋 Nudge ${name}`}
      </button>
      {error && <span role="alert" className="mt-1 text-xs text-fail">{error}</span>}
    </span>
  );
}
