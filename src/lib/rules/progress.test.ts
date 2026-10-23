import { describe, expect, it } from 'vitest';
import { coursePercent, currentPosition, nextStatus, overallPercent, type ProgressCourse, type ProgressStatus } from './progress';

const course = (id: string, kind: 'PATH' | 'ADD_ON', order: number, mods: string[]): ProgressCourse => ({
  id, name: id, kind, order, modules: mods.map((m, i) => ({ id: `${id}.${m}`, name: m, order: i + 1 })),
});
const prereq = course('DevOps Prerequisite', 'PATH', 2, ['Linux basics', 'Application basics (Java build & packaging)', 'Git']);
const twelve = course('12 Factor App', 'PATH', 1, ['Codebase', 'Config']);
const cka = course('CKA', 'ADD_ON', 21, ['Core concepts']);
const empty = course('GitHub Actions', 'ADD_ON', 17, []);
const all = [prereq, twelve, cka, empty];
const st = (pairs: [string, ProgressStatus][]) => new Map(pairs);

describe('course progress', () => {
  it('per course: % of modules done', () => {
    const s = st([['DevOps Prerequisite.Linux basics', 'DONE'], ['DevOps Prerequisite.Git', 'IN_PROGRESS']]);
    expect(coursePercent(prereq, s)).toBe(33);
    expect(coursePercent(twelve, s)).toBe(0);
    expect(coursePercent(empty, s)).toBe(0);
  });

  it('overall: by module count', () => {
    const s = st([['12 Factor App.Codebase', 'DONE'], ['12 Factor App.Config', 'DONE'], ['DevOps Prerequisite.Git', 'DONE']]);
    expect(overallPercent([twelve, prereq], s)).toBe(60);
    expect(overallPercent([], s)).toBe(0);
  });

  it('"you are here" is the first in-progress module along the path', () => {
    const s = st([
      ['12 Factor App.Codebase', 'DONE'], ['12 Factor App.Config', 'DONE'],
      ['DevOps Prerequisite.Linux basics', 'DONE'], ['DevOps Prerequisite.Application basics (Java build & packaging)', 'IN_PROGRESS'],
      ['CKA.Core concepts', 'IN_PROGRESS'],
    ]);
    expect(currentPosition(all, s)).toEqual({ course: 'DevOps Prerequisite', module: 'Application basics (Java build & packaging)' });
  });

  it('otherwise the first module not done, in path order', () => {
    expect(currentPosition(all, st([]))).toEqual({ course: '12 Factor App', module: 'Codebase' });
    expect(currentPosition(all, st([['12 Factor App.Codebase', 'DONE']]))).toEqual({ course: '12 Factor App', module: 'Config' });
  });

  it('is null when everything is done', () => {
    const s = new Map(all.flatMap(c => c.modules.map(m => [m.id, 'DONE' as ProgressStatus])));
    expect(currentPosition(all, s)).toBeNull();
  });

  it('cycles status on tap', () => {
    expect(nextStatus(undefined)).toBe('IN_PROGRESS');
    expect(nextStatus('NOT_STARTED')).toBe('IN_PROGRESS');
    expect(nextStatus('IN_PROGRESS')).toBe('DONE');
    expect(nextStatus('DONE')).toBe('NOT_STARTED');
  });
});
