// Daily habit: hours per day, the daily streak, weekly pace and nudge limits.
import type { ISODate, Member, StudyLog } from './types';
import { addDays, dayNumber, weekNumber, weekRange } from './weeks';
import { isVerified } from './hours';

export interface DayCell { date: ISODate; hours: number; pending: boolean }

/** Verified hours for each day from `from` to `to`, plus whether anything is awaiting verification. */
export function dailyHours(logs: StudyLog[], member: Member, startDate: ISODate, from: ISODate, to: ISODate): DayCell[] {
  const out: DayCell[] = [];
  for (let d = from; dayNumber(d) <= dayNumber(to); d = addDays(d, 1)) {
    const counts = weekNumber(d, startDate) >= member.joinedWeek;
    const mine = logs.filter(l => l.memberId === member.id && l.date === d);
    out.push({
      date: d,
      hours: counts ? Math.round(mine.filter(isVerified).reduce((s, l) => s + l.hours, 0) * 100) / 100 : 0,
      pending: counts && mine.some(l => !isVerified(l)),
    });
  }
  return out;
}

/** Consecutive days with verified study, ending today (today doesn't break it until it's over). */
export function dailyStreak(logs: StudyLog[], member: Member, startDate: ISODate, today: ISODate): number {
  const first = addDays(startDate, (member.joinedWeek - 1) * 7);
  if (dayNumber(today) < dayNumber(first)) return 0;
  const days = dailyHours(logs, member, startDate, first, today);
  let i = days.length - 1;
  if (days[i].hours <= 0) i--;
  let n = 0;
  for (; i >= 0 && days[i].hours > 0; i--) n++;
  return n;
}

/** How much is left this week and how much a day that means (today included). */
export function weekPace(verifiedHours: number, minHours: number, today: ISODate, week: number, startDate: ISODate) {
  const left = Math.max(0, Math.round((minHours - verifiedHours) * 100) / 100);
  const daysLeft = Math.max(1, dayNumber(weekRange(week, startDate).end) - dayNumber(today) + 1);
  return { left, daysLeft, perDay: Math.round((left / daysLeft) * 100) / 100, onTrack: left === 0 };
}

/** One nudge per person per 24 hours from the same sender. */
export function canNudge(previous: Date[], now: Date): boolean {
  return !previous.some(t => now.getTime() - t.getTime() < 24 * 3_600_000);
}
