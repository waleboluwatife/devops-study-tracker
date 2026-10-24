// Rules 3, 4, 5 (fines and waivers), 7 (optional short-hours fine), 10 (perfect week), 11 (balances).
import type { GroupSettings, Member, MoneyEntry, PeerReview, StudyLog, WeeklyScore } from './types';
import { activeMembers } from './rotation';
import { verifiedHours } from './hours';
import { meetingDate } from './weeks';

export interface FineLine {
  memberId: string;
  week: number;
  /** ₦ for a missed session (0 if none, or if waived). */
  missed: number;
  late: number;
  shortHours: number;
  /** True when a waiver cancelled this week's missed-session fine. */
  waived: boolean;
  /** True when a waiver was requested but ignored (already used one this month). */
  waiverRefused: boolean;
  total: number;
}

export function missedSession(score: WeeklyScore): boolean {
  return !score.attended || !score.studiedAndPresented;
}

/** `YYYY-MM` of the week's Saturday meeting: the month a waiver belongs to. */
export function waiverMonth(week: number, startDate: string): string {
  return meetingDate(week, startDate).slice(0, 7);
}

/**
 * Fines for every scored member-week. Weeks are processed in order per member so
 * that only the first waiver that actually cancels a fine in a calendar month is
 * honoured; a waiver that wasn't needed is not used up.
 */
export function computeFines(
  settings: GroupSettings,
  members: Member[],
  scores: WeeklyScore[],
  logs: StudyLog[] = [],
): FineLine[] {
  const byId = new Map(members.map(m => [m.id, m]));
  const usedMonths = new Map<string, Set<string>>();
  const lines: FineLine[] = [];
  const ordered = [...scores].sort((a, b) => a.week - b.week || a.memberId.localeCompare(b.memberId));

  for (const score of ordered) {
    const member = byId.get(score.memberId);
    if (!member || score.meetingOpen || score.week < 1 || score.week < member.joinedWeek) continue;

    let missed = 0; let waived = false; let waiverRefused = false;
    if (missedSession(score)) {
      const month = waiverMonth(score.week, settings.startDate);
      const used = usedMonths.get(member.id) ?? new Set<string>();
      if (score.waiverRequested48h && !used.has(month)) {
        waived = true;
        used.add(month);
        usedMonths.set(member.id, used);
      } else {
        missed = settings.fineMissedPerMember * activeMembers(members, score.week).length;
        waiverRefused = score.waiverRequested48h;
      }
    }
    const late = score.late15Plus ? settings.fineLateFlat : 0;
    const shortHours = settings.shortHoursFineEnabled
      && verifiedHours(logs, member, score.week, settings.startDate) < settings.minVerifiedHoursPerWeek
      ? settings.shortHoursFine : 0;

    lines.push({ memberId: member.id, week: score.week, missed, late, shortHours, waived, waiverRefused, total: missed + late + shortHours });
  }
  return lines;
}

export function waiversUsed(lines: FineLine[], memberId: string, month: string, startDate: string): number {
  return lines.filter(l => l.memberId === memberId && l.waived && waiverMonth(l.week, startDate) === month).length;
}

export function totalFined(lines: FineLine[], memberId: string): number {
  return lines.filter(l => l.memberId === memberId).reduce((s, l) => s + l.total, 0);
}

function sumFor(entries: MoneyEntry[], memberId: string): number {
  return entries.filter(e => e.memberId === memberId).reduce((s, e) => s + e.amount, 0);
}

/** Rule 11: fines + carry-overs − payments. */
export function balance(lines: FineLine[], carryOvers: MoneyEntry[], payments: MoneyEntry[], memberId: string) {
  const fined = totalFined(lines, memberId);
  const carriedOver = sumFor(carryOvers, memberId);
  const paid = sumFor(payments, memberId);
  return { fined, carriedOver, paid, outstanding: fined + carriedOver - paid };
}

/** Money paid into the pool so far. */
export function poolBalance(payments: MoneyEntry[]): number {
  return payments.reduce((s, p) => s + p.amount, 0);
}

/**
 * Rule 10. The peer-review condition only applies when the member had a reviewer
 * that week (there is none when fewer than 2 members are active).
 */
export function isPerfectWeek(score: WeeklyScore, review: PeerReview | undefined, fine: FineLine | undefined, hadReviewer = true): boolean {
  return score.attended && score.studiedAndPresented && score.githubPushed && score.linkedinPosted
    && (hadReviewer ? Boolean(review?.signedOff) : true)
    && (fine?.total ?? 0) === 0;
}
