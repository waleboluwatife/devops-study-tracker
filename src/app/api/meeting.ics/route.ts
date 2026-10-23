// A calendar file with every remaining weekly meeting of the round.
import { meetingStart } from '@/lib/rules';
import { getViewer } from '@/server/viewer';

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/[\\,;]/g, m => `\\${m}`).replace(/\n/g, '\\n');

export async function GET() {
  const v = await getViewer();
  const g = v.group;
  const from = Math.max(1, v.week);
  const first = meetingStart(from, v.startDate, g.meetingTime, g.timezone);
  const end = new Date(first.getTime() + g.meetingMinutes * 60_000);
  const count = v.round.totalWeeks - from + 1;
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DevOps Study Tracker//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:meeting-${v.round.id}@devops-study-tracker`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(first)}`,
    `DTEND:${stamp(end)}`,
    `RRULE:FREQ=WEEKLY;COUNT=${count}`,
    `SUMMARY:${esc(`${g.name} — weekly meeting`)}`,
    g.meetingLink ? `LOCATION:${esc(g.meetingLink)}` : '',
    `DESCRIPTION:${esc(`Present your week, peer reviews, scoreboard.${g.meetingLink ? `\nJoin: ${g.meetingLink}` : ''}`)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Study meeting in 1 hour', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  return new Response(ics, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="study-meetings.ics"' } });
}
