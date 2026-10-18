import { describe, expect, it } from 'vitest';
import { addDays, currentWeek, daysUntil, meetingDate, todayIn, weekNumber, weekRange } from './weeks';
import { START } from './fixtures';

describe('Rule 1: week numbers', () => {
  it('Week 1 is Sunday 11 Oct to Saturday 17 Oct 2026', () => {
    for (let d = 11; d <= 17; d++) expect(weekNumber(`2026-10-${d}`, START)).toBe(1);
    expect(weekRange(1, START)).toEqual({ start: '2026-10-11', end: '2026-10-17' });
  });

  it('Sunday 18 Oct starts Week 2', () => {
    expect(weekNumber('2026-10-18', START)).toBe(2);
  });

  it('follows floor((date - start) / 7) + 1 across months and years', () => {
    expect(weekNumber('2026-10-24', START)).toBe(2);
    expect(weekNumber('2026-10-25', START)).toBe(3);
    expect(weekNumber('2027-01-01', START)).toBe(12);
    expect(weekNumber(weekRange(40, START).end, START)).toBe(40);
    expect(weekRange(40, START).end).toBe('2027-07-17');
  });

  it('gives 0 or less before the start', () => {
    expect(weekNumber('2026-10-10', START)).toBe(0);
    expect(weekNumber('2026-10-03', START)).toBe(-1);
    expect(weekNumber('2026-10-04', START)).toBe(0);
  });

  it('meetings are on the Saturday of each week', () => {
    expect(meetingDate(1, START)).toBe('2026-10-17');
    expect(meetingDate(3, START)).toBe('2026-10-31');
    expect(new Date(`${meetingDate(7, START)}T00:00:00Z`).getUTCDay()).toBe(6);
  });

  it('rejects malformed dates', () => {
    expect(() => weekNumber('18/10/2026', START)).toThrow();
  });

  it('adds days across month ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('current week in Africa/Lagos', () => {
  it('on 18 Oct 2026 the current week is Week 2', () => {
    expect(currentWeek(START, 'Africa/Lagos', new Date('2026-10-18T12:00:00+01:00'))).toBe(2);
  });

  it('uses Lagos time, not UTC, around midnight', () => {
    // 23:30 UTC on Saturday 17 Oct is already 00:30 Sunday 18 Oct in Lagos (UTC+1).
    const now = new Date('2026-10-17T23:30:00Z');
    expect(todayIn('Africa/Lagos', now)).toBe('2026-10-18');
    expect(currentWeek(START, 'Africa/Lagos', now)).toBe(2);
    expect(currentWeek(START, 'UTC', now)).toBe(1);
  });

  it('counts days to the target finish date', () => {
    expect(daysUntil('2027-07-17', '2026-10-18')).toBe(272);
    expect(daysUntil('2026-10-18', '2026-10-18')).toBe(0);
    expect(daysUntil('2026-10-17', '2026-10-18')).toBe(-1);
  });
});
