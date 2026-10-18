// Parsing for the seed CSVs (courses and the 40-week syllabus). Pure, so it can be tested.

/** RFC-4180-ish CSV: quoted fields, doubled quotes, commas/newlines inside quotes. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = []; let field = ''; let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter(r => r.some(v => v.trim() !== ''));
  if (!header) return [];
  const keys = header.map(h => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
  return body.map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

const num = (v: string | undefined): number | null => {
  if (v === undefined || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const yes = (v: string | undefined) => /^(y|yes|true|1|x|✔|✓)$/i.test((v ?? '').trim());
const list = (v: string | undefined) => (v ?? '').split('|').map(s => s.trim()).filter(Boolean);

export interface SeedCourse {
  order: number;
  kind: 'PATH' | 'ADD_ON';
  name: string;
  videoHours: number | null;
  modules: string[];
}

export function parseCourses(text: string): SeedCourse[] {
  return parseCsv(text).map((r, i): SeedCourse => ({
    order: num(r.order) ?? i + 1,
    kind: /add/i.test(r.type) ? 'ADD_ON' : 'PATH',
    name: r.course,
    videoHours: num(r.video_hours),
    modules: list(r.modules),
  })).filter(c => c.name);
}

export interface SeedWeek {
  weekNumber: number;
  title: string;
  description: string;
  courses: string[];
  videoHours: number | null;
  deliverable: string;
  isCertWeek: boolean;
  certName: string | null;
  notes: string;
}

/**
 * Syllabus rows: needs `week` and `title` (or `topic`); optional video_hours,
 * deliverable, cert flag (`cert`, `is_cert_week` or `cert_week`), cert_name,
 * courses (`|`-separated), description, notes.
 */
export function parseSyllabus(text: string): SeedWeek[] {
  return parseCsv(text).map(r => {
    const title = r.title || r.topic || '';
    const certFlag = r.is_cert_week ?? r.cert_week ?? r.cert ?? '';
    const no = /^(n|no|false|0|-)?$/i.test(certFlag.trim());
    const isCertWeek = !no || /cert week/i.test(title);
    return {
      weekNumber: num(r.week ?? r.wk) ?? NaN,
      title,
      description: r.description ?? '',
      courses: list(r.kodekloud_courses ?? r.courses),
      videoHours: num(r.video_hours),
      deliverable: r.deliverable ?? '',
      isCertWeek,
      certName: r.cert_name || (!no && !yes(certFlag) ? certFlag.trim() : null) || null,
      notes: r.notes ?? '',
    };
  }).filter(w => Number.isInteger(w.weekNumber) && w.weekNumber >= 1 && w.title);
}

/** Weeks the CSV doesn't cover get a placeholder so the timeline is always complete. */
export function fillSyllabus(weeks: SeedWeek[], totalWeeks: number): SeedWeek[] {
  const byWeek = new Map(weeks.map(w => [w.weekNumber, w]));
  return Array.from({ length: totalWeeks }, (_, i) => byWeek.get(i + 1) ?? {
    weekNumber: i + 1, title: `Week ${i + 1} — topic to be set`, description: '', courses: [],
    videoHours: null, deliverable: '', isCertWeek: false, certName: null, notes: '',
  });
}
