'use client';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { checkIn, rsvp, saveMeetingNotes, saveMeetingSettings, setDeliverable } from '@/server/actions/meetings';
import type { ActionState } from '@/server/actions/logs';
import { FormMessage, SubmitButton } from './form';

export function Countdown({ start, minutes }: { start: string; minutes: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  if (now === null) return <span className="font-mono text-accent">&nbsp;</span>;
  const ms = new Date(start).getTime() - now;
  const text = ms > 0
    ? `Starts in ${ms >= 86_400_000 ? `${Math.floor(ms / 86_400_000)}d ` : ''}${Math.floor((ms % 86_400_000) / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`
    : ms > -minutes * 60_000 ? 'Happening now' : 'Finished for this week';
  return <span className="font-mono text-accent">{text}</span>;
}

export function CopyLink({ link }: { link: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn btn-sm" onClick={() => navigator.clipboard?.writeText(link).then(() => { setDone(true); setTimeout(() => setDone(false), 1800); })}>
      {done ? 'Copied ✓' : 'Copy link'}
    </button>
  );
}

const CHOICES = [['GOING', 'Going'], ['LATE', 'Running late'], ['CANT', "Can't make it"]] as const;

export function Rsvp({ current, waiverPossible, lateFine, missFine }: { current: string | null; waiverPossible: boolean; lateFine: string; missFine: string }) {
  const [choice, setChoice] = useState(current);
  const [msg, setMsg] = useState<ActionState & { waiver?: boolean }>({});
  const [pending, start] = useTransition();
  const pick = (s: 'GOING' | 'LATE' | 'CANT') => start(async () => { setChoice(s); setMsg(await rsvp(s)); });
  const note = choice === 'GOING' ? { tone: 'pass', text: 'See you there. Check in when you join so you are marked present.' }
    : choice === 'LATE' ? { tone: 'wait', text: `Joining more than 15 minutes late is ${lateFine}, even with a waiver.` }
    : choice === 'CANT' ? (msg.waiver ?? waiverPossible)
      ? { tone: 'pass', text: 'Waiver requested in time (48+ hours ahead). It cancels the missed-session fine if it is your first this month.' }
      : { tone: 'fail', text: `The meeting is less than 48 hours away, so this can't be a waiver. Missing it is ${missFine}.` }
    : null;
  return (
    <div>
      <p className="font-semibold">Will you be there?</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="RSVP">
        {CHOICES.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={choice === k} disabled={pending} onClick={() => pick(k)}
            className={`btn btn-sm ${choice === k ? 'border-ink bg-ink text-white hover:bg-ink' : ''}`}>{l}</button>
        ))}
      </div>
      {note && <p className={`mt-2 rounded-lg px-3 py-2 text-sm ${note.tone === 'pass' ? 'bg-pass-bg text-pass' : note.tone === 'wait' ? 'bg-wait-bg text-[#6b4a00]' : 'bg-fail-bg text-fail'}`}>{note.text}</p>}
      {msg.error && <p role="alert" className="mt-1 text-sm text-fail">{msg.error}</p>}
    </div>
  );
}

export function CheckIn({ checkedIn, opensAt }: { checkedIn: string | null; opensAt: string }) {
  const [msg, setMsg] = useState<ActionState>({});
  const [pending, start] = useTransition();
  if (checkedIn) return <p className="rounded-lg bg-pass-bg px-3 py-2 text-sm text-pass">✋ Checked in at {checkedIn}.</p>;
  return (
    <div>
      <button type="button" className="btn btn-primary" disabled={pending} onClick={() => start(async () => setMsg(await checkIn()))}>✋ I&apos;m here — check in</button>
      <p className="mt-1 text-xs text-sub">Opens {opensAt}. More than 15 minutes after the start counts as late.</p>
      {msg.error && <p role="alert" className="mt-1 text-sm text-fail">{msg.error}</p>}
      {msg.ok && <p role="status" className="mt-1 text-sm text-pass">{msg.ok}</p>}
    </div>
  );
}

export function DeliverableForm({ link }: { link: string }) {
  const [state, action] = useActionState<ActionState, FormData>(setDeliverable, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div className="min-w-0 flex-1"><label className="label" htmlFor="deliv">Your deliverable (GitHub link)</label>
        <input id="deliv" name="link" type="url" defaultValue={link} placeholder="https://github.com/you/devops-week" className="input" /></div>
      <SubmitButton className="btn">Save link</SubmitButton>
      <div className="w-full"><FormMessage state={state} /></div>
    </form>
  );
}

export function NotesForm({ week, notes, recordingUrl }: { week: number; notes: string; recordingUrl: string }) {
  const [state, action] = useActionState<ActionState, FormData>(saveMeetingNotes, {});
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="week" value={week} />
      <textarea name="notes" rows={4} defaultValue={notes} placeholder="What was covered, decisions, who presented what" className="input" aria-label={`Notes for week ${week}`} />
      <input name="recordingUrl" type="url" defaultValue={recordingUrl} placeholder="Recording link (optional)" className="input" aria-label="Recording link" />
      <div className="flex items-center gap-3"><SubmitButton className="btn btn-sm">Save notes</SubmitButton><FormMessage state={state} /></div>
    </form>
  );
}

export function MeetingSettingsForm({ link, time, minutes, disabled }: { link: string; time: string; minutes: number; disabled: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(saveMeetingSettings, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
      <fieldset disabled={disabled} className="contents">
        <div><label className="label" htmlFor="ml">Meeting link (Google Meet, Zoom…)</label><input id="ml" name="meetingLink" type="url" defaultValue={link} placeholder="https://meet.google.com/abc-defg-hij" className="input" /></div>
        <div><label className="label" htmlFor="mt">Saturday start time</label><input id="mt" name="meetingTime" type="time" defaultValue={time} className="input" /></div>
        <div><label className="label" htmlFor="mm">Length (minutes)</label><input id="mm" name="meetingMinutes" type="number" min="15" max="300" defaultValue={minutes} className="input" /></div>
        {!disabled && <div className="flex items-center gap-3 sm:col-span-3"><SubmitButton>Save meeting settings</SubmitButton><FormMessage state={state} /></div>}
      </fieldset>
    </form>
  );
}
