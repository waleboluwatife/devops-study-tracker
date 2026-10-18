// Rule 1: week numbering. Weeks run Sunday–Saturday; the meeting is on Saturday.
import type { ISODate } from './types';

const DAY_MS = 86_400_000;

/** Days since the Unix epoch for a `YYYY-MM-DD` date (timezone-free). */
export function dayNumber(date: ISODate): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new Error(`Not a YYYY-MM-DD date: ${date}`);
  return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY_MS);
}

export function addDays(date: ISODate, days: number): ISODate {
  return new Date((dayNumber(date) + days) * DAY_MS).toISOString().slice(0, 10);
}

/** `floor((date - start) / 7) + 1`. Dates before the start give 0 or less. */
export function weekNumber(date: ISODate, startDate: ISODate): number {
  return Math.floor((dayNumber(date) - dayNumber(startDate)) / 7) + 1;
}

/** Today's date in the given timezone (e.g. Africa/Lagos). */
export function todayIn(timezone: string, now: Date = new Date()): ISODate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

export function currentWeek(startDate: ISODate, timezone: string, now: Date = new Date()): number {
  return weekNumber(todayIn(timezone, now), startDate);
}

/** First (Sunday) and last (Saturday) day of a week. */
export function weekRange(week: number, startDate: ISODate): { start: ISODate; end: ISODate } {
  const start = addDays(startDate, (week - 1) * 7);
  return { start, end: addDays(start, 6) };
}

/** The Saturday meeting that closes the week. */
export function meetingDate(week: number, startDate: ISODate): ISODate {
  return weekRange(week, startDate).end;
}

/** Whole days from `today` until `target` (negative once it has passed). */
export function daysUntil(target: ISODate, today: ISODate): number {
  return dayNumber(target) - dayNumber(today);
}
