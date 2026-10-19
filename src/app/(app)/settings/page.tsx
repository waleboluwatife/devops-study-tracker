import { MemberForm, SettingsForm } from '@/components/admin-forms';
import { prisma } from '@/server/db';
import { getViewer, isoDate } from '@/server/viewer';

export default async function SettingsPage() {
  const v = await getViewer();
  const roundMembers = await prisma.roundMember.findMany({ where: { roundId: v.round.id }, include: { member: true }, orderBy: { joinOrder: 'asc' } });
  const g = v.group;

  return (
    <>
      <section className="card">
        <h1 className="card-title">Group settings {!v.isAdmin && '(view only — admins can edit)'}</h1>
        <SettingsForm disabled={!v.isAdmin} values={{
          name: g.name, fineMissedPerMember: g.fineMissedPerMember, fineLateFlat: g.fineLateFlat,
          minVerifiedHoursPerWeek: g.minVerifiedHoursPerWeek, shortHoursFineEnabled: g.shortHoursFineEnabled,
          shortHoursFine: g.shortHoursFine, targetFinishDate: isoDate(v.round.targetFinishDate),
        }} />
      </section>

      <section className="card">
        <h2 className="card-title">Members</h2>
        {v.isAdmin ? (
          <div className="space-y-4">
            {roundMembers.map(rm => (
              <MemberForm key={rm.id} values={{ memberId: rm.memberId, displayName: rm.member.displayName, email: rm.member.email ?? '', joinedWeek: rm.joinedWeek, isAdmin: rm.member.isAdmin }} />
            ))}
            <div className="border-t border-dashed border-slate-200 pt-4">
              <p className="mb-2 text-sm font-semibold">Add a member</p>
              <MemberForm isNew values={{ displayName: '', email: '', joinedWeek: v.week, isAdmin: false }} />
            </div>
            <p className="text-xs text-slate-500">People sign in with Google using the email you enter here. Join week controls when they start being counted, paired and fined.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {roundMembers.map(rm => (
              <li key={rm.id} className="flex justify-between py-2">
                <span className="font-semibold">{rm.member.displayName}{rm.member.isAdmin && <span className="pill ml-2 bg-slate-100 text-slate-600">admin</span>}</span>
                <span className="text-slate-500">joined week {rm.joinedWeek}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
