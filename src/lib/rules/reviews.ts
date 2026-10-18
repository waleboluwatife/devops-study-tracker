// Peer-review sign-off: only the reviewer assigned by the rotation may tick it.
import type { Member } from './types';
import { reviewerFor } from './rotation';

export function canSignOff(members: Member[], week: number, revieweeId: string, userMemberId: string): boolean {
  return reviewerFor(members, week, revieweeId) === userMemberId;
}
