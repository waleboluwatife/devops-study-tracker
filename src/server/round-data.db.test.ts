// Runs against a real, freshly seeded Postgres (npm run test:db).
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import { balance, computeFines, reviewerAssignments, standings, weekRange } from '@/lib/rules';
import { loadRoundData } from './round-data';

const prisma = new PrismaClient();
afterAll(() => prisma.$disconnect());

async function seededRound() {
  const round = await prisma.round.findFirstOrThrow({
    where: { number: 1, group: { name: 'DevOps Study Group' } },
    include: { roundMembers: { include: { member: true }, orderBy: { joinOrder: 'asc' } }, syllabus: true },
  });
  return { round, data: await loadRoundData(prisma, round.id) };
}

describe('fresh seed', () => {
  it('has the group, Round 1 from 11 Oct 2026 and the four members in order', async () => {
    const { round, data } = await seededRound();
    expect(data.settings).toMatchObject({ startDate: '2026-10-11', totalWeeks: 40, timezone: 'Africa/Lagos', fineMissedPerMember: 5000, fineLateFlat: 2000, minVerifiedHoursPerWeek: 6, shortHoursFineEnabled: false });
    expect(round.targetFinishDate.toISOString().slice(0, 10)).toBe(weekRange(40, '2026-10-11').end);
    expect(round.roundMembers.map(m => m.member.displayName)).toEqual(['Michael Akande', 'Chisom', 'OBA (Tumininu)', 'Timi']);
    expect(round.roundMembers.every(m => m.joinedWeek === 1)).toBe(true);
    expect(round.roundMembers[0].member.isAdmin).toBe(true);
  });

  it('has 40 syllabus weeks and the course path with modules', async () => {
    const { round } = await seededRound();
    expect(round.syllabus).toHaveLength(40);
    const courses = await prisma.course.findMany({ orderBy: { order: 'asc' }, include: { modules: true } });
    expect(courses).toHaveLength(23);
    expect(courses[0].name).toBe('12 Factor App');
    expect(courses[1].modules.map(m => m.name)).toContain('Application basics (Java build & packaging)');
  });

  it('Outstanding fines for Michael on a fresh seed = ₦15,000', async () => {
    const { round, data } = await seededRound();
    const michael = round.roundMembers[0].id;
    const fines = computeFines(data.settings, data.members, data.scores, data.logs);
    expect(balance(fines, data.carryOvers, data.payments, michael).outstanding).toBe(15000);
    expect(standings(data, 2).find(s => s.memberId === michael)?.finesOwed).toBe(15000);
  });

  it('pairs the four members as a no-self permutation', async () => {
    const { data } = await seededRound();
    const pairs = reviewerAssignments(data.members, 2);
    expect(pairs.size).toBe(4);
    for (const [a, b] of pairs) expect(a).not.toBe(b);
  });
});
