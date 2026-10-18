// Rule 2 (active members), Rule 8 (reviewer rotation) and Rule 9 (meeting lead).
import type { Member } from './types';

/** Members who have joined by week W, in stable join order. */
export function activeMembers<M extends Member>(members: M[], week: number): M[] {
  return members
    .filter(m => m.joinedWeek <= week)
    .sort((a, b) => a.joinOrder - b.joinOrder || a.id.localeCompare(b.id));
}

export function isActive(member: Member, week: number): boolean {
  return member.joinedWeek <= week;
}

/**
 * Who reviews whom in week W: a map of revieweeId → reviewerId.
 * Member at 1-based position p is reviewed by A[((p + (W mod (k-1))) mod k) + 1].
 * The shift is always between 0 and k-2, so nobody ever reviews themselves.
 * Empty when fewer than 2 members are active.
 */
export function reviewerAssignments(members: Member[], week: number): Map<string, string> {
  const A = activeMembers(members, week);
  const k = A.length;
  const pairs = new Map<string, string>();
  if (k < 2) return pairs;
  const shift = week % (k - 1);
  A.forEach((reviewee, i) => {
    const p = i + 1;
    const reviewerPos = ((p + shift) % k) + 1;
    pairs.set(reviewee.id, A[reviewerPos - 1].id);
  });
  return pairs;
}

export function reviewerFor(members: Member[], week: number, revieweeId: string): string | null {
  return reviewerAssignments(members, week).get(revieweeId) ?? null;
}

/** The person this member reviews in week W. */
export function revieweeOf(members: Member[], week: number, reviewerId: string): string | null {
  for (const [reviewee, reviewer] of reviewerAssignments(members, week)) {
    if (reviewer === reviewerId) return reviewee;
  }
  return null;
}

/** Lead for week W = A[((W-1) mod k) + 1]. */
export function meetingLead(members: Member[], week: number): string | null {
  const A = activeMembers(members, week);
  if (A.length === 0 || week < 1) return null;
  return A[(week - 1) % A.length].id;
}
