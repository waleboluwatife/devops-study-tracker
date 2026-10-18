import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fillSyllabus, parseCourses, parseCsv, parseSyllabus } from './seed-data';

describe('CSV parsing', () => {
  it('handles quotes, commas and newlines inside fields', () => {
    expect(parseCsv('a,B c\n"x, y","say ""hi"""\r\n1,"two\nlines"\n')).toEqual([
      { a: 'x, y', b_c: 'say "hi"' },
      { a: '1', b_c: 'two\nlines' },
    ]);
  });

  it('ignores a byte-order mark and blank lines', () => {
    expect(parseCsv('﻿week,title\n\n1,Intro\n')).toEqual([{ week: '1', title: 'Intro' }]);
  });
});

describe('seed/courses.csv', () => {
  const courses = parseCourses(readFileSync(path.join(__dirname, '../../seed/courses.csv'), 'utf8'));

  it('has the 16 path courses in order, then 7 add-ons', () => {
    expect(courses.filter(c => c.kind === 'PATH').map(c => c.name)).toEqual([
      '12 Factor App', 'DevOps Prerequisite', 'Fundamentals of DevOps', 'Linux for Beginners',
      'Shell Scripts for Beginners', 'Python Basics', 'Git for Beginners', 'Jenkins for Beginners',
      'Docker for Absolute Beginners', 'Kubernetes for Beginners', 'Terraform for Beginners',
      'Helm for Beginners', 'Istio Service Mesh', 'GitOps with ArgoCD',
      'Prometheus Certified Associate (PCA)', 'DevOps Interview Preparation',
    ]);
    expect(courses.filter(c => c.kind === 'ADD_ON')).toHaveLength(7);
  });

  it('keeps module names that contain commas', () => {
    const twelve = courses.find(c => c.name === '12 Factor App')!;
    expect(twelve.modules).toContain('Build, release and run');
    expect(twelve.modules).toHaveLength(12);
    expect(twelve.videoHours).toBe(0.75);
  });

  it('allows add-ons without hours or modules', () => {
    expect(courses.find(c => c.name === 'GitHub Actions')).toMatchObject({ videoHours: null, modules: [] });
  });
});

describe('syllabus', () => {
  it('reads week, title, hours, deliverable and cert flag', () => {
    const weeks = parseSyllabus('week,title,video_hours,deliverable,cert\n1,Intro to DevOps,3.5,Push notes repo,no\n3,CERT WEEK — GitHub Foundations,,Pass the exam,yes\n');
    expect(weeks[0]).toMatchObject({ weekNumber: 1, title: 'Intro to DevOps', videoHours: 3.5, deliverable: 'Push notes repo', isCertWeek: false });
    expect(weeks[1]).toMatchObject({ weekNumber: 3, isCertWeek: true, videoHours: null });
  });

  it('accepts a cert name in the cert column', () => {
    const [w] = parseSyllabus('week,title,cert\n13,AWS exam week,AWS Cloud Practitioner\n');
    expect(w).toMatchObject({ isCertWeek: true, certName: 'AWS Cloud Practitioner' });
    const [c] = parseSyllabus('week,title,is_cert_week,cert_name\n13,AWS exam,yes,AWS Cloud Practitioner\n');
    expect(c).toMatchObject({ isCertWeek: true, certName: 'AWS Cloud Practitioner' });
  });

  it('fills missing weeks with placeholders', () => {
    const all = fillSyllabus(parseSyllabus('week,title\n2,Git\n'), 40);
    expect(all).toHaveLength(40);
    expect(all[1].title).toBe('Git');
    expect(all[0].title).toBe('Week 1 — topic to be set');
    expect(all[39].weekNumber).toBe(40);
  });
});
