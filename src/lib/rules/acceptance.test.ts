// Section 10 of the spec, one test per acceptance check.
import { describe, expect, it } from 'vitest';
import { balance, computeFines, currentWeek, reviewerAssignments, standings, verifiedHours, weekNumber, weekRange } from '.';
import type { Member, RoundData } from '.';
import { FOUR, SETTINGS, START, log, members, score } from './fixtures';

const freshSeed = (): RoundData => ({
  settings: SETTINGS,
  members: FOUR,
  logs: [], scores: [], reviews: [], payments: [],
  carryOvers: [{ memberId: 'michael', amount: 15000 }],
});

describe('Acceptance checks (spec §10)', () => {
  it('1. Week 1 = 11–17 Oct 2026, and on 18 Oct 2026 the current week is Week 2', () => {
    expect(weekRange(1, START)).toEqual({ start: '2026-10-11', end: '2026-10-17' });
    expect(weekNumber('2026-10-11', START)).toBe(1);
    expect(weekNumber('2026-10-17', START)).toBe(1);
    expect(currentWeek(START, 'Africa/Lagos', new Date('2026-10-18T09:00:00+01:00'))).toBe(2);
  });

  it('2. A member joining in Week 5 is not shown, fined or counted in Weeks 1–4', () => {
    const late: Member = { id: 'new', joinedWeek: 5, joinOrder: 5 };
    const ms = [...FOUR, late];
    const scores = [1, 2, 3, 4].flatMap(w => [score('new', w, { attended: false }), score('michael', w, { attended: false })]);
    const without = computeFines(SETTINGS, FOUR, scores.filter(s => s.memberId !== 'new'));
    const withLate = computeFines(SETTINGS, ms, scores);
    expect(withLate.filter(l => l.memberId === 'new')).toHaveLength(0);       // not fined
    expect(withLate).toEqual(without);                                         // amounts unchanged
    for (let w = 1; w <= 4; w++) expect(reviewerAssignments(ms, w).has('new')).toBe(false); // not paired
    const board = standings({ ...freshSeed(), members: ms }, 4);
    expect(board.map(s => s.memberId)).not.toContain('new');                   // not shown
    expect(standings({ ...freshSeed(), members: ms }, 5).map(s => s.memberId)).toContain('new');
  });

  it('3. A second waiver in the same calendar month does not cancel a fine', () => {
    const lines = computeFines(SETTINGS, FOUR, [
      score('chisom', 1, { attended: false, waiverRequested48h: true }),
      score('chisom', 2, { studiedAndPresented: false, waiverRequested48h: true }),
    ]);
    expect(lines.map(l => l.total)).toEqual([0, 20000]);
  });

  it('4. A log without a screenshot, or verified by the logger, adds 0 to verified hours', () => {
    const me = FOUR[0];
    expect(verifiedHours([log('michael', 1, 3, { screenshotUrl: null })], me, 1, START)).toBe(0);
    expect(verifiedHours([log('michael', 1, 3, { verifiedById: 'michael' })], me, 1, START)).toBe(0);
    expect(verifiedHours([log('michael', 1, 3, { verifiedById: 'chisom' })], me, 1, START)).toBe(3);
  });

  it('5. With ≥2 active members, pairings are a no-self permutation (and change weekly with 3+)', () => {
    for (const k of [2, 3, 4, 5, 10]) {
      const ms = members(k);
      let prev = '';
      for (let w = 1; w <= 40; w++) {
        const pairs = reviewerAssignments(ms, w);
        expect([...pairs.keys()].sort()).toEqual(ms.map(m => m.id).sort());
        expect([...pairs.values()].sort()).toEqual(ms.map(m => m.id).sort());
        for (const [a, b] of pairs) expect(a).not.toBe(b);
        const now = JSON.stringify([...pairs]);
        if (k >= 3 && w > 1) expect(now).not.toBe(prev);
        prev = now;
      }
    }
  });

  it('6. Outstanding fines for Michael on a fresh seed = ₦15,000', () => {
    const data = freshSeed();
    const fines = computeFines(data.settings, data.members, data.scores);
    expect(balance(fines, data.carryOvers, data.payments, 'michael').outstanding).toBe(15000);
    expect(standings(data, 2).find(s => s.memberId === 'michael')?.finesOwed).toBe(15000);
  });
});

describe('leaderboard rows', () => {
  it('adds up hours, labs, meetings, GitHub, LinkedIn, perfect weeks and streak', () => {
    const data: RoundData = {
      ...freshSeed(),
      logs: [log('michael', 1, 6, { labs: 2 }), log('michael', 2, 7, { labs: 3 }), log('michael', 2, 1, { verifiedById: null })],
      scores: [score('michael', 1), score('michael', 2, { linkedinPosted: false })],
      reviews: [
        { week: 1, revieweeId: 'michael', reviewerId: 'oba', signedOff: true },
        { week: 2, revieweeId: 'michael', reviewerId: 'timi', signedOff: true },
      ],
      payments: [{ memberId: 'michael', amount: 5000 }],
    };
    expect(standings(data, 2).find(s => s.memberId === 'michael')).toEqual({
      memberId: 'michael', verifiedHours: 13, labs: 5, meetingsAttended: 2, githubWeeks: 2,
      linkedinPosts: 1, finesOwed: 10000, perfectWeeks: 1, streak: 2,
    });
  });
});
