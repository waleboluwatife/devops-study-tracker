import { ProgressList } from '@/components/progress-list';
import type { ProgressCourse, ProgressStatus } from '@/lib/rules';
import { prisma } from '@/server/db';
import { getViewer } from '@/server/viewer';

export default async function ProgressPage() {
  const v = await getViewer();
  const [courses, progress] = await Promise.all([
    prisma.course.findMany({ where: { groupId: v.group.id }, orderBy: { order: 'asc' }, include: { modules: { orderBy: { order: 'asc' } } } }),
    prisma.memberModuleProgress.findMany({ where: { memberId: v.member.id } }),
  ]);
  const list: ProgressCourse[] = courses.map(c => ({
    id: c.id, name: c.name, kind: c.kind, order: c.order, videoHours: c.videoHours,
    modules: c.modules.map(m => ({ id: m.id, name: m.name, order: m.order })),
  }));
  const initial = Object.fromEntries(progress.map(p => [p.moduleId, p.status as ProgressStatus]));
  return (
    <>
      <div>
        <h1 className="page-title">My progress</h1>
        <p className="lede">Tap a module to cycle: not started, in progress, done. Only you can change yours.</p>
      </div>
      <ProgressList courses={list} initial={initial} isAdmin={v.isAdmin} />
    </>
  );
}
