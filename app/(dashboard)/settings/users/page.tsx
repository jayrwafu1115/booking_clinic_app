import { DeactivateUserForm } from "@/components/settings/deactivate-user-form";
import { InviteUserForm } from "@/components/settings/invite-user-form";
import { AccessCard } from "@/components/settings/access-card";
import { SectionHeader } from "@/components/settings/section-header";
import { UserRoleForm } from "@/components/settings/user-role-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUsersSettingsData } from "@/server/queries/settings";
import type { AssignableUserRole, Profile } from "@/types/database";

export const dynamic = "force-dynamic";

function roleLabel(role: string) {
  return role
    .split("_")
    .map((word) => word.replace(/^\w/, (letter) => letter.toUpperCase()))
    .join(" ");
}

function statusClass(status: Profile["status"]) {
  return status === "active" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila"
  }).format(new Date(value));
}

export default async function UsersPage() {
  try {
    const data = await getUsersSettingsData();

    if (!data) {
      return <AccessCard title="Users unavailable" message="Sign in with a clinic account to view the team." />;
    }

    return (
      <div className="space-y-6">
        <SectionHeader
          eyebrow="Settings"
          title="Users & Roles"
          description="Invite clinic teammates, assign operational roles, and deactivate accounts without exposing super admin assignment."
        />
        {data.canManage ? <InviteUserForm /> : <AccessCard title="Read-only team access" message="Clinic owners can invite users and edit roles." />}

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.users.length === 0 ? <p className="text-sm text-slate-500">No users found for this clinic.</p> : null}
            {data.users.map((user) => {
              const assignable = user.role !== "super_admin";
              const inactive = user.status === "inactive";

              return (
                <div key={user.id} className="grid gap-4 rounded-2xl border border-border p-4 xl:grid-cols-[1fr_260px_160px] xl:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-950">{user.full_name}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(user.status)}`}>{roleLabel(user.status)}</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500">{user.email}</p>
                    <p className="mt-1 text-xs text-slate-400">Joined {formatDate(user.created_at)}</p>
                  </div>
                  <div>
                    {data.canManage && assignable ? (
                      <UserRoleForm userId={user.id} role={user.role as AssignableUserRole} disabled={inactive} />
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{roleLabel(user.role)}</span>
                    )}
                  </div>
                  <div className="xl:justify-self-end">
                    {data.canManage && assignable ? <DeactivateUserForm userId={user.id} disabled={inactive} /> : null}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {data.canManage ? (
          <Card>
            <CardHeader>
              <CardTitle>Pending Invites</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.invites.length === 0 ? <p className="text-sm text-slate-500">No invites created yet.</p> : null}
              {data.invites.map((invite) => (
                <div key={invite.id} className="grid gap-2 rounded-2xl border border-border p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{invite.email}</p>
                    <p className="mt-1 text-xs text-slate-400">Expires {formatDate(invite.expires_at)}</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{roleLabel(invite.role)}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{roleLabel(invite.status)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load users.";
    return <AccessCard title="Users could not load" message={message} />;
  }
}
