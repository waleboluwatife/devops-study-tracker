// Seeds the study group: settings, Round 1, the 4 members, courses/modules,
// the 40-week syllabus and Michael's Round 1 carry-over.
// Safe to run twice: it does nothing if the group already exists.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { fillSyllabus, parseCourses, parseSyllabus } from '../src/lib/seed-data';
import { addDays } from '../src/lib/rules/weeks';

const prisma = new PrismaClient();

const GROUP_NAME = 'DevOps Study Group';
const START_DATE = '2026-10-11'; // Sunday, first day of Week 1
const TOTAL_WEEKS = 40;
// Member emails are not committed: the first admin's comes from SEED_ADMIN_EMAIL,
// and admins add the others in Settings (an email is needed to sign in).
const MEMBERS = [
  { displayName: 'Michael Akande', isAdmin: true },
  { displayName: 'Chisom', isAdmin: false },
  { displayName: 'OBA (Tumininu)', isAdmin: false },
  { displayName: 'Timi', isAdmin: false },
];

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const readSeed = (name: string) => {
  const file = path.join(__dirname, '..', 'seed', name);
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
};

// Certs to track (weeks are set once the real syllabus is in).
const CERTS = [
  { name: 'AWS Cloud Practitioner', notes: 'About $100 per person.' },
  { name: 'HashiCorp Terraform Associate', notes: 'About $70.50.' },
  { name: 'Prometheus Certified Associate (PCA)', notes: 'Watch for Linux Foundation sales.' },
  { name: 'Certified Kubernetes Administrator (CKA)', notes: 'Price the CKA + CKAD bundle when booking.' },
  { name: 'AWS Solutions Architect Associate', notes: '' },
  { name: 'Certified Kubernetes Application Developer (CKAD)', notes: 'Final exam of the round.' },
];

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL ?? '').trim().toLowerCase() || null;

async function main() {
  const existing = await prisma.group.findFirst({ where: { name: GROUP_NAME } });
  if (existing) {
    // Only fill in the first admin's email if it is still missing.
    if (ADMIN_EMAIL) {
      const set = await prisma.member.updateMany({
        where: { groupId: existing.id, displayName: MEMBERS[0].displayName, email: null },
        data: { email: ADMIN_EMAIL },
      });
      if (set.count) console.log(`Set ${MEMBERS[0].displayName}'s sign-in email.`);
    }
    // Groups created before the cert tracker existed get the default list once.
    if ((await prisma.cert.count({ where: { groupId: existing.id } })) === 0) {
      await prisma.cert.createMany({ data: CERTS.map(c => ({ ...c, groupId: existing.id })) });
      console.log('Added the default cert list.');
    }
    console.log(`"${GROUP_NAME}" already exists — nothing else to seed.`);
    return;
  }

  const syllabusCsv = readSeed('syllabus.csv');
  const syllabus = fillSyllabus(syllabusCsv ? parseSyllabus(syllabusCsv) : [], TOTAL_WEEKS);
  const courses = parseCourses(readSeed('courses.csv') ?? '');

  await prisma.$transaction(async tx => {
    const group = await tx.group.create({ data: { name: GROUP_NAME } });
    const round = await tx.round.create({
      data: {
        groupId: group.id, number: 1, totalWeeks: TOTAL_WEEKS,
        startDate: day(START_DATE),
        targetFinishDate: day(addDays(START_DATE, TOTAL_WEEKS * 7 - 1)),
      },
    });

    const roundMembers = [];
    for (const [i, m] of MEMBERS.entries()) {
      const member = await tx.member.create({
        data: { groupId: group.id, ...m, email: i === 0 ? ADMIN_EMAIL : null },
      });
      roundMembers.push(await tx.roundMember.create({
        data: { roundId: round.id, memberId: member.id, joinedWeek: 1, joinOrder: i + 1 },
      }));
    }

    await tx.syllabusWeek.createMany({ data: syllabus.map(w => ({ roundId: round.id, ...w })) });

    for (const c of courses) {
      await tx.course.create({
        data: {
          groupId: group.id, order: c.order, kind: c.kind, name: c.name, videoHours: c.videoHours,
          modules: { create: c.modules.map((name, i) => ({ order: i + 1, name })) },
        },
      });
    }

    await tx.cert.createMany({ data: CERTS.map(c => ({ ...c, groupId: group.id })) });

    await tx.fineCarryOver.create({
      data: { roundId: round.id, roundMemberId: roundMembers[0].id, amount: 15000, note: 'Unpaid fines from Round 1' },
    });
  }, { maxWait: 20_000, timeout: 120_000 }); // remote databases are slow over many round-trips

  console.log(`Seeded "${GROUP_NAME}": ${MEMBERS.length} members, ${courses.length} courses, ${TOTAL_WEEKS} syllabus weeks${syllabusCsv ? '' : ' (placeholders — add seed/syllabus.csv)'}.`);
}

main()
  .catch(e => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
