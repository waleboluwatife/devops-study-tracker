// In-app notifications for one member, computed from the current state.
export interface NotificationInput {
  toVerify: number;
  /** Milliseconds until this week's meeting starts (negative once started). */
  msToMeeting: number;
  meetingMinutes: number;
  rsvpGiven: boolean;
  checkedIn: boolean;
  hoursLeft: number;
  daysLeft: number;
  reviewToSign: string | null;
  deliverablePushed: boolean;
  nudgedBy: string[];
  studiedToday: boolean;
}

export interface Notification { icon: string; title: string; detail: string; href: string }

const HOUR = 3_600_000;

export function notificationsFor(n: NotificationInput): Notification[] {
  const out: Notification[] = [];
  const live = n.msToMeeting <= 15 * 60_000 && n.msToMeeting > -n.meetingMinutes * 60_000;
  if (live && !n.checkedIn) out.push({ icon: '🎥', title: 'The meeting is on now', detail: 'Join and check in so you are marked present.', href: '/meetings' });
  else if (n.msToMeeting > 0 && n.msToMeeting <= 24 * HOUR) out.push({ icon: '🎥', title: `Meeting in ${Math.ceil(n.msToMeeting / HOUR)}h`, detail: n.rsvpGiven ? 'The link is on the Meetings page.' : 'Let the group know if you are coming.', href: '/meetings' });
  if (n.nudgedBy.length) out.push({ icon: '👋', title: `${n.nudgedBy.join(' and ')} nudged you`, detail: 'Time to log some study.', href: '/log' });
  if (n.toVerify > 0) out.push({ icon: '📝', title: `${n.toVerify} log${n.toVerify > 1 ? 's' : ''} need your verification`, detail: 'Hours only count once someone checks them.', href: '/log#verify' });
  if (n.hoursLeft > 0) out.push({ icon: '⏳', title: `You're ${n.hoursLeft}h short this week`, detail: n.daysLeft <= 1 ? 'Today is the last day of the week.' : `About ${Math.round((n.hoursLeft / n.daysLeft) * 10) / 10}h a day for ${n.daysLeft} days.`, href: '/log' });
  if (!n.studiedToday) out.push({ icon: '🔥', title: 'Keep your streak', detail: 'You have not logged any study today.', href: '/log' });
  if (n.reviewToSign) out.push({ icon: '🤝', title: `Sign off ${n.reviewToSign}'s deliverable`, detail: 'You are their reviewer this week.', href: '/scoreboard' });
  if (!n.deliverablePushed && n.msToMeeting > 0 && n.msToMeeting <= 48 * HOUR) out.push({ icon: '📦', title: 'Add your deliverable link', detail: 'Push to GitHub and share the link before the meeting.', href: '/meetings' });
  return out;
}
