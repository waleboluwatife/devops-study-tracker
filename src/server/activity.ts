// The group's activity feed: one line per thing that happened.
import { prisma } from './db';

export async function logActivity(roundId: string, icon: string, text: string) {
  await prisma.activity.create({ data: { roundId, icon, text: text.slice(0, 300) } }).catch(() => {});
}
