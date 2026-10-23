// Weekly meeting rules: when it starts, the 48-hour waiver window, check-in, order.
import type { ISODate, Member } from './types';
import { activeMembers, meetingLead } from './rotation';
import { meetingDate } from './weeks';

const HOUR = 3_600_000;

/** A wall-clock time ("19:00") on a date, in a timezone, as an instant. */
export function zonedInstant(date: ISODate, time: string, timezone: string): Date {
  const [h, m] = time.split(':').map(Number);
  const [y, mo, d] = date.split('-').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, m);
  // How far the timezone is from UTC at that moment.
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(guess)).map(p => [p.type, p.value]));
  const shown = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return new Date(guess - (shown - guess));
}

export function meetingStart(week: number, startDate: ISODate, time: string, timezone: string): Date {
  return zonedInstant(meetingDate(week, startDate), time, timezone);
}

/** A waiver only counts when requested at least 48 hours before the meeting. */
export function waiverAllowed(now: Date, start: Date): boolean {
  return start.getTime() - now.getTime() >= 48 * HOUR;
}

export type CheckinState = { open: false; reason: 'early' | 'over' } | { open: true; late: boolean };

/** Check-in opens 15 minutes before the start; more than 15 minutes after is late. */
export function checkinState(now: Date, start: Date, minutes: number): CheckinState {
  const t = now.getTime(); const s = start.getTime();
  if (t < s - 15 * 60_000) return { open: false, reason: 'early' };
  if (t > s + minutes * 60_000) return { open: false, reason: 'over' };
  return { open: true, late: t > s + 15 * 60_000 };
}

/** Presentation order: the week's lead first, then the rest in join order. */
export function presentationOrder<M extends Member>(members: M[], week: number): M[] {
  const A = activeMembers(members, week);
  const lead = meetingLead(A, week);
  const i = A.findIndex(m => m.id === lead);
  return i < 0 ? A : [...A.slice(i), ...A.slice(0, i)];
}
