import { describe, expect, it } from 'vitest';
import { activeMembers, meetingLead, reviewerAssignments, reviewerFor, revieweeOf } from './rotation';
import { FOUR, members } from './fixtures';
import type { Member } from './types';

const ids = (ms: Member[]) => ms.map(m => m.id);

describe('Rule 2: active members', () => {
  it('only includes members who have joined by that week, in join order', () => {
    const ms: Member[] = [
      { id: 'late', joinedWeek: 5, joinOrder: 5 },
      { id: 'b', joinedWeek: 1, joinOrder: 2 },
      { id: 'a', joinedWeek: 1, joinOrder: 1 },
    ];
    expect(ids(activeMembers(ms, 4))).toEqual(['a', 'b']);
    expect(ids(activeMembers(ms, 5))).toEqual(['a', 'b', 'late']);
  });
});

describe('Rule 8: reviewer rotation', () => {
  it('matches the spec formula for 4 members', () => {
    // k = 4, W = 1 → shift 1: p1←A3, p2←A4, p3←A1, p4←A2
    expect(Object.fromEntries(reviewerAssignments(FOUR, 1))).toEqual({
      michael: 'oba', chisom: 'timi', oba: 'michael', timi: 'chisom',
    });
    // W = 2 → shift 2: p1←A4, p2←A1, p3←A2, p4←A3
    expect(Object.fromEntries(reviewerAssignments(FOUR, 2))).toEqual({
      michael: 'timi', chisom: 'michael', oba: 'chisom', timi: 'oba',
    });
    // W = 3 → shift 0: p1←A2 ...
    expect(reviewerFor(FOUR, 3, 'michael')).toBe('chisom');
  });

  for (const k of [2, 3, 4, 5, 6, 7, 10]) {
    it(`with ${k} members: a permutation, never self, every week`, () => {
      const ms = members(k);
      for (let w = 1; w <= 40; w++) {
        const pairs = reviewerAssignments(ms, w);
        expect(pairs.size).toBe(k);
        for (const [reviewee, reviewer] of pairs) expect(reviewer).not.toBe(reviewee);
        expect(new Set(pairs.values()).size).toBe(k); // everyone reviews exactly one person
      }
    });
  }

  for (const k of [3, 4, 5, 7, 10]) {
    it(`with ${k} members the pairings change from week to week`, () => {
      const ms = members(k);
      for (let w = 1; w < 40; w++) {
        const now = JSON.stringify([...reviewerAssignments(ms, w)]);
        const next = JSON.stringify([...reviewerAssignments(ms, w + 1)]);
        expect(next).not.toBe(now);
      }
    });
  }

  it('with 2 members they always review each other (the formula cannot rotate)', () => {
    const ms = members(2);
    expect(Object.fromEntries(reviewerAssignments(ms, 1))).toEqual({ m1: 'm2', m2: 'm1' });
    expect(Object.fromEntries(reviewerAssignments(ms, 9))).toEqual({ m1: 'm2', m2: 'm1' });
  });

  it('assigns no reviewer with fewer than 2 members', () => {
    expect(reviewerAssignments(members(1), 3).size).toBe(0);
    expect(reviewerAssignments([], 3).size).toBe(0);
    expect(reviewerFor(members(1), 3, 'm1')).toBeNull();
  });

  it('never pairs a member before their join week', () => {
    const ms = [...members(3), { id: 'new', joinedWeek: 5, joinOrder: 4 }];
    for (let w = 1; w <= 4; w++) {
      const pairs = reviewerAssignments(ms, w);
      expect(pairs.has('new')).toBe(false);
      expect([...pairs.values()]).not.toContain('new');
    }
    expect(reviewerAssignments(ms, 5).has('new')).toBe(true);
  });

  it('finds who a member reviews', () => {
    expect(revieweeOf(FOUR, 1, 'oba')).toBe('michael');
    expect(revieweeOf(members(1), 1, 'm1')).toBeNull();
  });
});

describe('Rule 9: meeting lead', () => {
  it('cycles through members in join order', () => {
    expect([1, 2, 3, 4, 5, 6].map(w => meetingLead(FOUR, w))).toEqual(['michael', 'chisom', 'oba', 'timi', 'michael', 'chisom']);
  });

  it('accounts for late joiners', () => {
    const ms = [...members(2), { id: 'new', joinedWeek: 3, joinOrder: 3 }];
    expect(meetingLead(ms, 1)).toBe('m1');
    expect(meetingLead(ms, 2)).toBe('m2');
    expect(meetingLead(ms, 3)).toBe('new'); // (3-1) mod 3 = 2 → third member
  });

  it('has no lead with no members', () => {
    expect(meetingLead([], 1)).toBeNull();
  });
});
