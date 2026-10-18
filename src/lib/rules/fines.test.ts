import { describe, expect, it } from 'vitest';
import { balance, computeFines, isPerfectWeek, poolBalance, totalFined, waiverMonth, waiversUsed } from './fines';
import { FOUR, SETTINGS, START, log, members, score } from './fixtures';
import type { Member } from './types';

const one = (lines: ReturnType<typeof computeFines>, memberId: string, week: number) =>
  lines.find(l => l.memberId === memberId && l.week === week);

describe('Rule 3: missed session', () => {
  it('no fine for a clean week', () => {
    expect(one(computeFines(SETTINGS, FOUR, [score('michael', 1)]), 'michael', 1)?.total).toBe(0);
  });

  it('absent → ₦5,000 × active members', () => {
    const lines = computeFines(SETTINGS, FOUR, [score('michael', 1, { attended: false })]);
    expect(one(lines, 'michael', 1)).toMatchObject({ missed: 20000, total: 20000 });
  });

  it('did not study & present → same fine', () => {
    const lines = computeFines(SETTINGS, FOUR, [score('michael', 1, { studiedAndPresented: false })]);
    expect(one(lines, 'michael', 1)?.missed).toBe(20000);
  });

  it('absent AND not presented is fined once, not twice', () => {
    const lines = computeFines(SETTINGS, FOUR, [score('michael', 1, { attended: false, studiedAndPresented: false })]);
    expect(one(lines, 'michael', 1)?.total).toBe(20000);
  });

  it('GitHub / LinkedIn misses are not fined', () => {
    const lines = computeFines(SETTINGS, FOUR, [score('michael', 1, { githubPushed: false, linkedinPosted: false })]);
    expect(one(lines, 'michael', 1)?.total).toBe(0);
  });

  it('scales with the number of active members that week', () => {
    const ms = [...members(3), { id: 'new', joinedWeek: 5, joinOrder: 4 }];
    const lines = computeFines(SETTINGS, ms, [score('m1', 4, { attended: false }), score('m1', 5, { attended: false })]);
    expect(one(lines, 'm1', 4)?.missed).toBe(15000);
    expect(one(lines, 'm1', 5)?.missed).toBe(20000);
  });

  it('uses the group setting amounts', () => {
    const lines = computeFines({ ...SETTINGS, fineMissedPerMember: 1000 }, FOUR, [score('michael', 1, { attended: false })]);
    expect(one(lines, 'michael', 1)?.missed).toBe(4000);
  });
});

describe('Rule 4: late 15+', () => {
  it('adds a flat ₦2,000', () => {
    expect(one(computeFines(SETTINGS, FOUR, [score('michael', 1, { late15Plus: true })]), 'michael', 1)?.total).toBe(2000);
  });

  it('stacks with a missed-session fine', () => {
    const lines = computeFines(SETTINGS, FOUR, [score('michael', 1, { late15Plus: true, studiedAndPresented: false })]);
    expect(one(lines, 'michael', 1)?.total).toBe(22000);
  });

  it('still applies when a waiver cancels the missed-session fine', () => {
    const lines = computeFines(SETTINGS, FOUR, [score('michael', 1, { late15Plus: true, studiedAndPresented: false, waiverRequested48h: true })]);
    expect(one(lines, 'michael', 1)).toMatchObject({ missed: 0, late: 2000, waived: true, total: 2000 });
  });
});

describe('Rule 5: waivers', () => {
  it('a 48h waiver cancels the first missed-session fine of the month', () => {
    const lines = computeFines(SETTINGS, FOUR, [score('michael', 1, { attended: false, waiverRequested48h: true })]);
    expect(one(lines, 'michael', 1)).toMatchObject({ missed: 0, waived: true, total: 0 });
  });

  it('a second waiver in the same calendar month does not cancel the fine', () => {
    // Weeks 1 and 2 meet on 17 and 24 Oct: both October.
    const lines = computeFines(SETTINGS, FOUR, [
      score('michael', 1, { attended: false, waiverRequested48h: true }),
      score('michael', 2, { attended: false, waiverRequested48h: true }),
    ]);
    expect(one(lines, 'michael', 1)?.waived).toBe(true);
    expect(one(lines, 'michael', 2)).toMatchObject({ waived: false, waiverRefused: true, missed: 20000 });
  });

  it('waivers reset in a new month (by the Saturday meeting date)', () => {
    expect(waiverMonth(3, START)).toBe('2026-10'); // meets Sat 31 Oct
    expect(waiverMonth(4, START)).toBe('2026-11'); // Sun 1 Nov – Sat 7 Nov
    const lines = computeFines(SETTINGS, FOUR, [
      score('michael', 3, { attended: false, waiverRequested48h: true }),
      score('michael', 4, { attended: false, waiverRequested48h: true }),
    ]);
    expect(one(lines, 'michael', 3)?.waived).toBe(true);
    expect(one(lines, 'michael', 4)?.waived).toBe(true);
  });

  it('a week straddling two months belongs to its Saturday', () => {
    // Week 8 runs Sun 29 Nov – Sat 5 Dec, so it is a December waiver.
    expect(waiverMonth(8, START)).toBe('2026-12');
    const lines = computeFines(SETTINGS, FOUR, [
      score('michael', 4, { attended: false, waiverRequested48h: true }), // November
      score('michael', 8, { attended: false, waiverRequested48h: true }), // December
    ]);
    expect(lines.every(l => l.waived)).toBe(true);
  });

  it('no waiver without the 48h request', () => {
    const lines = computeFines(SETTINGS, FOUR, [score('michael', 1, { attended: false, waiverRequested48h: false })]);
    expect(one(lines, 'michael', 1)).toMatchObject({ waived: false, missed: 20000 });
  });

  it('a waiver that was not needed is not used up', () => {
    const lines = computeFines(SETTINGS, FOUR, [
      score('michael', 1, { waiverRequested48h: true }), // showed up anyway
      score('michael', 2, { attended: false, waiverRequested48h: true }),
    ]);
    expect(one(lines, 'michael', 1)).toMatchObject({ waived: false, waiverRefused: false, total: 0 });
    expect(one(lines, 'michael', 2)).toMatchObject({ waived: true, total: 0 });
  });

  it('waivers are counted per member', () => {
    const lines = computeFines(SETTINGS, FOUR, [
      score('michael', 1, { attended: false, waiverRequested48h: true }),
      score('chisom', 1, { attended: false, waiverRequested48h: true }),
    ]);
    expect(lines.every(l => l.waived)).toBe(true);
    expect(waiversUsed(lines, 'michael', '2026-10', START)).toBe(1);
  });

  it('order of input rows does not matter: the earliest week gets the waiver', () => {
    const lines = computeFines(SETTINGS, FOUR, [
      score('michael', 2, { attended: false, waiverRequested48h: true }),
      score('michael', 1, { attended: false, waiverRequested48h: true }),
    ]);
    expect(one(lines, 'michael', 1)?.waived).toBe(true);
    expect(one(lines, 'michael', 2)?.waived).toBe(false);
  });
});

describe('Rule 2: late joiners', () => {
  const ms: Member[] = [...FOUR, { id: 'new', joinedWeek: 5, joinOrder: 5 }];

  it('are never fined before their join week', () => {
    const lines = computeFines(SETTINGS, ms, [score('new', 3, { attended: false })]);
    expect(lines).toHaveLength(0);
  });

  it('do not change fines in weeks before they joined', () => {
    const before = computeFines(SETTINGS, FOUR, [score('michael', 4, { attended: false })]);
    const after = computeFines(SETTINGS, ms, [score('michael', 4, { attended: false })]);
    expect(one(after, 'michael', 4)?.missed).toBe(20000);
    expect(after).toEqual(before);
  });
});

describe('Rule 7: optional short-hours fine', () => {
  const on = { ...SETTINGS, shortHoursFineEnabled: true };

  it('is off by default', () => {
    expect(SETTINGS.shortHoursFineEnabled).toBe(false);
    expect(one(computeFines(SETTINGS, FOUR, [score('michael', 1)], []), 'michael', 1)?.total).toBe(0);
  });

  it('when on, charges a flat ₦2,000 to anyone below the minimum', () => {
    const lines = computeFines(on, FOUR, [score('michael', 1), score('chisom', 1)], [log('chisom', 1, 6)]);
    expect(one(lines, 'michael', 1)).toMatchObject({ shortHours: 2000, total: 2000 });
    expect(one(lines, 'chisom', 1)?.total).toBe(0);
  });

  it('only verified hours count towards it', () => {
    const lines = computeFines(on, FOUR, [score('michael', 1)], [log('michael', 1, 8, { verifiedById: 'michael' })]);
    expect(one(lines, 'michael', 1)?.shortHours).toBe(2000);
  });
});

describe('Rule 10: perfect week', () => {
  const review = { week: 1, revieweeId: 'michael', reviewerId: 'oba', signedOff: true };

  it('needs everything ticked, the review signed off and no fine', () => {
    const s = score('michael', 1);
    const [fine] = computeFines(SETTINGS, FOUR, [s]);
    expect(isPerfectWeek(s, review, fine)).toBe(true);
    expect(isPerfectWeek(s, { ...review, signedOff: false }, fine)).toBe(false);
    expect(isPerfectWeek(s, undefined, fine)).toBe(false);
  });

  it('is broken by any missing item', () => {
    for (const k of ['attended', 'studiedAndPresented', 'githubPushed', 'linkedinPosted'] as const) {
      const s = score('michael', 1, { [k]: false });
      const [fine] = computeFines(SETTINGS, FOUR, [s]);
      expect(isPerfectWeek(s, review, fine)).toBe(false);
    }
  });

  it('is broken by a late fine', () => {
    const s = score('michael', 1, { late15Plus: true });
    const [fine] = computeFines(SETTINGS, FOUR, [s]);
    expect(isPerfectWeek(s, review, fine)).toBe(false);
  });

  it('does not need a review when there was no reviewer', () => {
    const s = score('m1', 1);
    expect(isPerfectWeek(s, undefined, undefined, false)).toBe(true);
  });
});

describe('Rule 11: outstanding fines', () => {
  it('= total fines + carry-overs − payments', () => {
    const lines = computeFines(SETTINGS, FOUR, [
      score('michael', 1, { attended: false }),
      score('michael', 2, { late15Plus: true }),
    ]);
    expect(totalFined(lines, 'michael')).toBe(22000);
    const carry = [{ memberId: 'michael', amount: 15000 }];
    const paid = [{ memberId: 'michael', amount: 10000 }, { memberId: 'chisom', amount: 5000 }];
    expect(balance(lines, carry, paid, 'michael')).toEqual({ fined: 22000, carriedOver: 15000, paid: 10000, outstanding: 27000 });
    expect(balance(lines, carry, paid, 'chisom').outstanding).toBe(-5000);
    expect(poolBalance(paid)).toBe(15000);
  });
});
