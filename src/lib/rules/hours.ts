// Rule 6 (verified hours), Rule 7 (weekly status), streaks, and log editing/verifying.
import type { ISODate, Member, StudyLog } from './types';
import { weekNumber } from './weeks';

/** Counts only with a screenshot AND a verifier who is not the logger. */
export function isVerified(log: StudyLog): boolean {
  return Boolean(log.screenshotUrl) && Boolean(log.verifiedById) && log.verifiedById !== log.memberId;
}

/** Logs that count for a member in a week: verified, and not before they joined. */
function countedLogs(logs: StudyLog[], member: Member, week: number, startDate: ISODate): StudyLog[] {
  if (week < member.joinedWeek) return [];
  return logs.filter(l => l.memberId === member.id && isVerified(l) && weekNumber(l.date, startDate) === week);
}

export function verifiedHours(logs: StudyLog[], member: Member, week: number, startDate: ISODate): number {
  return round2(countedLogs(logs, member, week, startDate).reduce((sum, l) => sum + l.hours, 0));
}

export function verifiedLabs(logs: StudyLog[], member: Member, week: number, startDate: ISODate): number {
  return countedLogs(logs, member, week, startDate).reduce((sum, l) => sum + l.labs, 0);
}

/** All verified hours/labs from the member's join week up to and including `throughWeek`. */
export function totals(logs: StudyLog[], member: Member, throughWeek: number, startDate: ISODate) {
  let hours = 0; let labs = 0;
  for (const l of logs) {
    if (l.memberId !== member.id || !isVerified(l)) continue;
    const w = weekNumber(l.date, startDate);
    if (w < member.joinedWeek || w < 1 || w > throughWeek) continue;
    hours += l.hours; labs += l.labs;
  }
  return { hours: round2(hours), labs };
}

export type WeekStatus = { onTrack: true } | { onTrack: false; shortBy: number };

export function weekStatus(hours: number, minHours: number): WeekStatus {
  return hours >= minHours ? { onTrack: true } : { onTrack: false, shortBy: round2(minHours - hours) };
}

export function statusLabel(s: WeekStatus): string {
  return s.onTrack ? 'On track' : `${formatHours(s.shortBy)} hrs short`;
}

/**
 * Consecutive weeks on track, counting back from the current week. The current
 * week only adds to the streak once it is on track; it never breaks it, because
 * it isn't over yet.
 */
export function onTrackStreak(
  logs: StudyLog[], member: Member, currentWeek: number, startDate: ISODate, minHours: number,
): number {
  let streak = 0;
  for (let w = currentWeek; w >= Math.max(1, member.joinedWeek); w--) {
    const onTrack = verifiedHours(logs, member, w, startDate) >= minHours;
    if (onTrack) streak++;
    else if (w !== currentWeek) break;
  }
  return streak;
}

/** Any other member may verify, and only logs that have proof attached. */
export function canVerify(log: StudyLog, verifierId: string): boolean {
  return verifierId !== log.memberId && Boolean(log.screenshotUrl) && !isVerified(log);
}

export type LogChanges = Partial<Pick<StudyLog, 'date' | 'hours' | 'labs' | 'screenshotUrl'>> & { whatCovered?: string; moduleId?: string | null };

/** Editing a log in any way clears its verification, so it must be checked again. */
export function applyLogEdit<L extends StudyLog & { verifiedAt?: string | Date | null }>(log: L, changes: LogChanges): L {
  const changed = Object.entries(changes).some(([k, v]) => (log as Record<string, unknown>)[k] !== v);
  if (!changed) return log;
  return { ...log, ...changes, verifiedById: null, verifiedAt: null };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatHours(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}
