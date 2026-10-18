// Leaderboard rows: everything the dashboard shows per member, derived from the rules.
import type { GroupSettings, Member, MoneyEntry, PeerReview, StudyLog, WeeklyScore } from './types';
import { activeMembers, reviewerFor } from './rotation';
import { onTrackStreak, totals } from './hours';
import { balance, computeFines, isPerfectWeek } from './fines';

export interface RoundData {
  settings: GroupSettings;
  members: Member[];
  logs: StudyLog[];
  scores: WeeklyScore[];
  reviews: PeerReview[];
  payments: MoneyEntry[];
  carryOvers: MoneyEntry[];
}

export interface Standing {
  memberId: string;
  verifiedHours: number;
  labs: number;
  meetingsAttended: number;
  githubWeeks: number;
  linkedinPosts: number;
  finesOwed: number;
  perfectWeeks: number;
  streak: number;
}

export function standings(data: RoundData, currentWeek: number): Standing[] {
  const { settings, members, logs, scores, reviews, payments, carryOvers } = data;
  const fines = computeFines(settings, members, scores, logs);
  const visible = activeMembers(members, Math.max(1, currentWeek));

  return visible.map(member => {
    const mine = scores.filter(s => s.memberId === member.id && s.week >= member.joinedWeek && s.week >= 1 && s.week <= currentWeek);
    const perfectWeeks = mine.filter(s => {
      const fine = fines.find(f => f.memberId === member.id && f.week === s.week);
      const review = reviews.find(r => r.week === s.week && r.revieweeId === member.id);
      const hadReviewer = reviewerFor(members, s.week, member.id) !== null;
      return isPerfectWeek(s, review, fine, hadReviewer);
    }).length;
    const t = totals(logs, member, currentWeek, settings.startDate);
    return {
      memberId: member.id,
      verifiedHours: t.hours,
      labs: t.labs,
      meetingsAttended: mine.filter(s => s.attended).length,
      githubWeeks: mine.filter(s => s.githubPushed).length,
      linkedinPosts: mine.filter(s => s.linkedinPosted).length,
      finesOwed: balance(fines, carryOvers, payments, member.id).outstanding,
      perfectWeeks,
      streak: onTrackStreak(logs, member, currentWeek, settings.startDate, settings.minVerifiedHoursPerWeek),
    };
  });
}
