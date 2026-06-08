import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { getAllUsersAdmin } from "@/server/queries/super-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROLE_BADGE: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  clinic_owner: "bg-blue-100 text-blue-700",
  receptionist: "bg-cyan-100 text-cyan-700",
  doctor: "bg-teal-100 text-teal-700",
  staff: "bg-slate-100 text-slate-700"
};

export default async function AdminUsersPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") redirect("/dashboard");

  const users = await getAllUsersAdmin();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Users</h1>
        <p className="mt-1 text-sm text-slate-500">{users.length.toLocaleString()} users on the platform</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            All Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Clinic</th>
                  <th className="pb-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-2.5 pr-4 font-medium text-slate-900">{u.full_name}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{u.email}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[u.role] ?? "bg-slate-100 text-slate-600"}`}>
                        {u.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500">{u.clinic_name ?? "—"}</td>
                    <td className="py-2.5 text-slate-500">
                      {new Date(u.created_at).toLocaleDateString("en-PH")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">No users found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
