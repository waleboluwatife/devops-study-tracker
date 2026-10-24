// Plain data the rules engine works on. No database or framework types here:
// the server layer maps Prisma rows into these shapes.

/** A calendar date as `YYYY-MM-DD` (no time, no timezone). */
export type ISODate = string;

export interface GroupSettings {
  /** First day (a Sunday) of Week 1 of the round. */
  startDate: ISODate;
  totalWeeks: number;
  timezone: string;
  /** ₦ per active member, charged once for a missed session. */
  fineMissedPerMember: number;
  /** ₦ flat, for arriving 15+ minutes late. */
  fineLateFlat: number;
  minVerifiedHoursPerWeek: number;
  /** Fine people who are short on verified hours. Off by default. */
  shortHoursFineEnabled: boolean;
  /** ₦ flat per person short, when enabled. */
  shortHoursFine: number;
}

export interface Member {
  id: string;
  /** Week of the round in which the member joined (1-based). */
  joinedWeek: number;
  /** Stable order used for rotations: lower joins first. */
  joinOrder: number;
}

export interface StudyLog {
  id: string;
  memberId: string;
  date: ISODate;
  hours: number;
  labs: number;
  screenshotUrl: string | null;
  verifiedById: string | null;
}

export interface WeeklyScore {
  memberId: string;
  week: number;
  attended: boolean;
  late15Plus: boolean;
  studiedAndPresented: boolean;
  githubPushed: boolean;
  linkedinPosted: boolean;
  waiverRequested48h: boolean;
  /** That week's meeting hasn't finished yet, so nothing can be fined. */
  meetingOpen?: boolean;
}

export interface PeerReview {
  week: number;
  revieweeId: string;
  reviewerId: string;
  signedOff: boolean;
}

export interface MoneyEntry {
  memberId: string;
  amount: number;
}
