import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { getAllUsersAdmin } from "@/server/queries/super-admin";
import { UsersTable } from "@/components/admin/users-table";

export default async function AdminUsersPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") redirect("/dashboard");

  const users = await getAllUsersAdmin();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
          <Users className="h-5 w-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Users</h1>
          <p className="text-sm text-slate-500">{users.length.toLocaleString()} users on the platform</p>
        </div>
      </div>

      <UsersTable users={users} />
    </div>
  );
}
