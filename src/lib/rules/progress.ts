// Course progress: % complete per course and overall, and "where am I now".

export type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';

export interface ProgressCourse {
  id: string;
  name: string;
  kind: 'PATH' | 'ADD_ON';
  order: number;
  videoHours?: number | null;
  modules: { id: string; name: string; order: number }[];
}

/** % of a course's modules that are done (0 for a course with no modules). */
export function coursePercent(course: ProgressCourse, status: Map<string, ProgressStatus>): number {
  if (course.modules.length === 0) return 0;
  const done = course.modules.filter(m => status.get(m.id) === 'DONE').length;
  return Math.round((done / course.modules.length) * 100);
}

/** % of all modules done across the given courses (by module count). */
export function overallPercent(courses: ProgressCourse[], status: Map<string, ProgressStatus>): number {
  const modules = courses.flatMap(c => c.modules);
  if (modules.length === 0) return 0;
  return Math.round((modules.filter(m => status.get(m.id) === 'DONE').length / modules.length) * 100);
}

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

/**
 * "You are here": the first module in progress along the path; otherwise the
 * first module not yet done. Path courses come before add-ons. Null when all done.
 */
export function currentPosition(courses: ProgressCourse[], status: Map<string, ProgressStatus>): { course: string; module: string } | null {
  const ordered = [...courses].sort((a, b) => (a.kind === b.kind ? a.order - b.order : a.kind === 'PATH' ? -1 : 1));
  const walk = ordered.flatMap(c => [...c.modules].sort(byOrder).map(m => ({ course: c.name, module: m.name, id: m.id })));
  const hit = walk.find(m => status.get(m.id) === 'IN_PROGRESS') ?? walk.find(m => status.get(m.id) !== 'DONE');
  return hit ? { course: hit.course, module: hit.module } : null;
}

/** Tapping a module cycles: not started → in progress → done → not started. */
export function nextStatus(s: ProgressStatus | undefined): ProgressStatus {
  return s === 'IN_PROGRESS' ? 'DONE' : s === 'DONE' ? 'NOT_STARTED' : 'IN_PROGRESS';
}
