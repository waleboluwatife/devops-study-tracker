'use client';
import { useFormStatus } from 'react-dom';
import type { ActionState } from '@/server/actions/logs';

export function SubmitButton({ children, className = 'btn btn-primary', pendingText = 'Saving…' }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending}>{pending ? pendingText : children}</button>;
}

export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) return <p role="alert" className="text-sm font-medium text-rose-600">{state.error}</p>;
  if (state.ok) return <p role="status" className="text-sm font-medium text-brand-700">{state.ok}</p>;
  return null;
}
