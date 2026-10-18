// Shared test data: the seeded group (start Sunday 11 Oct 2026, 4 members).
import type { GroupSettings, Member, StudyLog, WeeklyScore } from './types';
import { addDays } from './weeks';

export const START = '2026-10-11';

export const SETTINGS: GroupSettings = {
  startDate: START,
  totalWeeks: 40,
  timezone: 'Africa/Lagos',
  fineMissedPerMember: 5000,
  fineLateFlat: 2000,
  minVerifiedHoursPerWeek: 6,
  shortHoursFineEnabled: false,
  shortHoursFine: 2000,
};

export const FOUR: Member[] = ['michael', 'chisom', 'oba', 'timi'].map((id, i) => ({ id, joinedWeek: 1, joinOrder: i + 1 }));

export function members(n: number, joinedWeek = 1): Member[] {
  return Array.from({ length: n }, (_, i) => ({ id: `m${i + 1}`, joinedWeek, joinOrder: i + 1 }));
}

/** A clean week: attended, presented, pushed, posted, no lateness, no waiver. */
export function score(memberId: string, week: number, over: Partial<WeeklyScore> = {}): WeeklyScore {
  return {
    memberId, week,
    attended: true, late15Plus: false, studiedAndPresented: true,
    githubPushed: true, linkedinPosted: true, waiverRequested48h: false,
    ...over,
  };
}

let logId = 0;
/** A verified log on day `day` (0 = Sunday) of the given week. */
export function log(memberId: string, week: number, hours: number, over: Partial<StudyLog> = {}, day = 2): StudyLog {
  return {
    id: `log${++logId}`, memberId,
    date: addDays(START, (week - 1) * 7 + day),
    hours, labs: 1,
    screenshotUrl: 'https://example.test/shot.png',
    verifiedById: memberId === 'other' ? 'someone' : 'other',
    ...over,
  };
}
