import { describe, expect, it } from 'vitest';
import { applyLogEdit, canVerify, isVerified, onTrackStreak, statusLabel, totals, verifiedHours, verifiedLabs, weekStatus } from './hours';
import { START, log } from './fixtures';
import type { Member } from './types';

const me: Member = { id: 'me', joinedWeek: 1, joinOrder: 1 };

describe('Rule 6: verified hours', () => {
  it('counts a log with a screenshot verified by someone else', () => {
    expect(isVerified(log('me', 1, 2))).toBe(true);
    expect(verifiedHours([log('me', 1, 2), log('me', 1, 1.5)], me, 1, START)).toBe(3.5);
  });

  it('adds 0 without a screenshot', () => {
    const l = log('me', 1, 3, { screenshotUrl: null });
    expect(isVerified(l)).toBe(false);
    expect(verifiedHours([l], me, 1, START)).toBe(0);
  });

  it('adds 0 when verified by the logger themselves', () => {
    const l = log('me', 1, 3, { verifiedById: 'me' });
    expect(isVerified(l)).toBe(false);
    expect(verifiedHours([l], me, 1, START)).toBe(0);
  });

  it('adds 0 when not verified yet', () => {
    expect(verifiedHours([log('me', 1, 3, { verifiedById: null })], me, 1, START)).toBe(0);
  });

  it('only counts the week the log is dated in, and only my logs', () => {
    const logs = [log('me', 1, 2), log('me', 2, 4), log('you', 1, 9)];
    expect(verifiedHours(logs, me, 1, START)).toBe(2);
    expect(verifiedHours(logs, me, 2, START)).toBe(4);
  });

  it('a Saturday log counts for that week; Sunday starts the next', () => {
    expect(verifiedHours([log('me', 1, 2, {}, 6)], me, 1, START)).toBe(2);
    expect(verifiedHours([log('me', 1, 2, {}, 7)], me, 2, START)).toBe(2);
  });

  it('excludes unverified labs too', () => {
    const logs = [log('me', 1, 2, { labs: 3 }), log('me', 1, 2, { labs: 5, verifiedById: null })];
    expect(verifiedLabs(logs, me, 1, START)).toBe(3);
  });

  it('never counts weeks before the member joined', () => {
    const late: Member = { id: 'me', joinedWeek: 5, joinOrder: 5 };
    expect(verifiedHours([log('me', 3, 4)], late, 3, START)).toBe(0);
    const logs = [log('me', 3, 4), log('me', 5, 2), log('me', 6, 1)];
    expect(totals(logs, late, 6, START)).toEqual({ hours: 3, labs: 2 });
    expect(totals(logs, late, 5, START)).toEqual({ hours: 2, labs: 1 });
  });

  it('avoids floating-point noise', () => {
    expect(verifiedHours([log('me', 1, 0.1), log('me', 1, 0.2)], me, 1, START)).toBe(0.3);
  });
});

describe('Rule 7: weekly status', () => {
  it('is on track at or above the minimum', () => {
    expect(weekStatus(6, 6)).toEqual({ onTrack: true });
    expect(statusLabel(weekStatus(7.5, 6))).toBe('On track');
  });

  it('shows how many hours short otherwise', () => {
    expect(weekStatus(4, 6)).toEqual({ onTrack: false, shortBy: 2 });
    expect(statusLabel(weekStatus(4, 6))).toBe('2 hrs short');
    expect(statusLabel(weekStatus(4.5, 6))).toBe('1.5 hrs short');
    expect(statusLabel(weekStatus(0, 6))).toBe('6 hrs short');
  });
});

describe('streak: consecutive weeks on track', () => {
  const six = (w: number) => log('me', w, 6);

  it('counts back from the current week', () => {
    expect(onTrackStreak([six(1), six(2), six(3)], me, 3, START, 6)).toBe(3);
  });

  it('a week in progress does not break the streak', () => {
    expect(onTrackStreak([six(1), six(2), log('me', 3, 1)], me, 3, START, 6)).toBe(2);
  });

  it('a short past week ends it', () => {
    expect(onTrackStreak([six(1), log('me', 2, 5), six(3), six(4)], me, 4, START, 6)).toBe(2);
    expect(onTrackStreak([six(1), six(2)], me, 4, START, 6)).toBe(0);
  });

  it('starts at the join week', () => {
    const late: Member = { id: 'me', joinedWeek: 3, joinOrder: 3 };
    expect(onTrackStreak([six(3), six(4)], late, 4, START, 6)).toBe(2);
  });
});

describe('verifying and editing logs', () => {
  it('any other member can verify a log that has proof', () => {
    const l = log('me', 1, 2, { verifiedById: null });
    expect(canVerify(l, 'anyone-else')).toBe(true);
    expect(canVerify(l, 'me')).toBe(false);
  });

  it('a log without a screenshot cannot be verified', () => {
    expect(canVerify(log('me', 1, 2, { verifiedById: null, screenshotUrl: null }), 'other')).toBe(false);
  });

  it('an already-verified log cannot be verified again', () => {
    expect(canVerify(log('me', 1, 2), 'third')).toBe(false);
  });

  it('editing a verified log clears its verification', () => {
    const l = { ...log('me', 1, 2), verifiedAt: '2026-10-14' };
    const edited = applyLogEdit(l, { hours: 4 });
    expect(edited.hours).toBe(4);
    expect(edited.verifiedById).toBeNull();
    expect(edited.verifiedAt).toBeNull();
    expect(isVerified(edited)).toBe(false);
  });

  it('saving without any change keeps the verification', () => {
    const l = log('me', 1, 2);
    expect(applyLogEdit(l, { hours: 2 })).toBe(l);
  });
});
