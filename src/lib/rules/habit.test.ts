import { describe, expect, it } from 'vitest';
import { canNudge, dailyHours, dailyStreak, weekPace } from './habit';
import { checkinState, meetingStart, presentationOrder, waiverAllowed, zonedInstant } from './meetings';
import { notificationsFor, type NotificationInput } from './notifications';
import { FOUR, START, log } from './fixtures';
import type { Member, StudyLog } from './types';

const me: Member = { id: 'me', joinedWeek: 1, joinOrder: 1 };
const on = (date: string, hours: number, over: Partial<StudyLog> = {}): StudyLog => ({ ...log('me', 1, hours, over), date });

describe('meetings', () => {
  it('starts at 19:00 Lagos time on the Saturday', () => {
    expect(meetingStart(2, START, '19:00', 'Africa/Lagos').toISOString()).toBe('2026-10-24T18:00:00.000Z');
    expect(zonedInstant('2026-10-17', '07:30', 'Africa/Lagos').toISOString()).toBe('2026-10-17T06:30:00.000Z');
    expect(zonedInstant('2026-10-17', '19:00', 'UTC').toISOString()).toBe('2026-10-17T19:00:00.000Z');
  });

  it('allows a waiver only 48 hours or more before the meeting', () => {
    const start = meetingStart(2, START, '19:00', 'Africa/Lagos');
    expect(waiverAllowed(new Date(start.getTime() - 48 * 3_600_000), start)).toBe(true);
    expect(waiverAllowed(new Date(start.getTime() - 47.9 * 3_600_000), start)).toBe(false);
  });

  it('opens check-in 15 minutes before and marks late after 15 minutes', () => {
    const start = new Date('2026-10-24T18:00:00Z');
    const at = (min: number) => checkinState(new Date(start.getTime() + min * 60_000), start, 90);
    expect(at(-16)).toEqual({ open: false, reason: 'early' });
    expect(at(-15)).toEqual({ open: true, late: false });
    expect(at(15)).toEqual({ open: true, late: false });
    expect(at(16)).toEqual({ open: true, late: true });
    expect(at(91)).toEqual({ open: false, reason: 'over' });
  });

  it('presentation order starts with the week\'s lead', () => {
    expect(presentationOrder(FOUR, 1).map(m => m.id)).toEqual(['michael', 'chisom', 'oba', 'timi']);
    expect(presentationOrder(FOUR, 2).map(m => m.id)).toEqual(['chisom', 'oba', 'timi', 'michael']);
    expect(presentationOrder(FOUR, 4).map(m => m.id)).toEqual(['timi', 'michael', 'chisom', 'oba']);
  });
});

describe('daily habit', () => {
  it('adds up verified hours per day and flags unverified ones', () => {
    const logs = [on('2026-10-12', 1), on('2026-10-12', 0.5), on('2026-10-13', 2, { verifiedById: null })];
    const days = dailyHours(logs, me, START, '2026-10-11', '2026-10-13');
    expect(days).toEqual([
      { date: '2026-10-11', hours: 0, pending: false },
      { date: '2026-10-12', hours: 1.5, pending: false },
      { date: '2026-10-13', hours: 0, pending: true },
    ]);
  });

  it('counts consecutive study days; today only adds once studied', () => {
    const logs = ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'].map(d => on(d, 1));
    expect(dailyStreak(logs, me, START, '2026-10-24')).toBe(4);
    expect(dailyStreak([...logs, on('2026-10-24', 1)], me, START, '2026-10-24')).toBe(5);
    expect(dailyStreak(logs.filter(l => l.date !== '2026-10-22'), me, START, '2026-10-24')).toBe(1);
    expect(dailyStreak([], me, START, '2026-10-24')).toBe(0);
  });

  it('an unverified day does not count for the streak', () => {
    const logs = [on('2026-10-22', 1), on('2026-10-23', 1, { verifiedById: null })];
    expect(dailyStreak(logs, me, START, '2026-10-24')).toBe(0);
  });

  it('works out the weekly pace', () => {
    expect(weekPace(4.5, 6, '2026-10-24', 2, START)).toEqual({ left: 1.5, daysLeft: 1, perDay: 1.5, onTrack: false });
    expect(weekPace(1, 6, '2026-10-20', 2, START)).toEqual({ left: 5, daysLeft: 5, perDay: 1, onTrack: false });
    expect(weekPace(7, 6, '2026-10-20', 2, START).onTrack).toBe(true);
  });

  it('allows one nudge per person per day', () => {
    const now = new Date('2026-10-24T12:00:00Z');
    expect(canNudge([], now)).toBe(true);
    expect(canNudge([new Date('2026-10-24T01:00:00Z')], now)).toBe(false);
    expect(canNudge([new Date('2026-10-23T11:00:00Z')], now)).toBe(true);
  });
});

describe('notifications', () => {
  const base: NotificationInput = { toVerify: 0, msToMeeting: 72 * 3_600_000, meetingMinutes: 90, rsvpGiven: true, checkedIn: false, hoursLeft: 0, daysLeft: 3, reviewToSign: null, deliverablePushed: true, nudgedBy: [], studiedToday: true };

  it('is empty when everything is fine', () => {
    expect(notificationsFor(base)).toEqual([]);
  });

  it('warns about the meeting, verification, hours, streak, reviews and deliverables', () => {
    const list = notificationsFor({ ...base, msToMeeting: 9 * 3_600_000, rsvpGiven: false, toVerify: 2, hoursLeft: 1.5, daysLeft: 1, studiedToday: false, reviewToSign: 'Chisom', deliverablePushed: false, nudgedBy: ['OBA'] });
    expect(list.map(n => n.title)).toEqual([
      'Meeting in 9h', 'OBA nudged you', '2 logs need your verification', "You're 1.5h short this week",
      'Keep your streak', "Sign off Chisom's deliverable", 'Add your deliverable link',
    ]);
    expect(list[0].detail).toMatch(/coming/);
  });

  it('switches to "on now" during the meeting until you check in', () => {
    expect(notificationsFor({ ...base, msToMeeting: -10 * 60_000 })[0].title).toBe('The meeting is on now');
    expect(notificationsFor({ ...base, msToMeeting: -10 * 60_000, checkedIn: true })).toEqual([]);
  });
});
