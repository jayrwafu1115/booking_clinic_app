"use client";

import { useState } from "react";
import { Search, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { AdminUserRow } from "@/server/queries/super-admin";

const ROLE_BADGE: Record<string, string> = {
  super_admin:  "bg-purple-50 text-purple-700",
  clinic_owner: "bg-blue-50 text-blue-700",
  receptionist: "bg-cyan-50 text-cyan-700",
  doctor:       "bg-teal-50 text-teal-700",
  staff:        "bg-slate-100 text-slate-700",
};

export function UsersTable({ users }: { users: AdminUserRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase()) ||
      (u.clinic_name ?? "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search by name, email, or clinic…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hidden lg:table-cell">Clinic</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hidden xl:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                    {query ? `No users matching "${query}"` : "No users found"}
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
                          <UserCircle className="h-4 w-4 text-slate-400" />
                        </div>
                        <span className="font-medium text-slate-900">{user.full_name}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3.5 text-slate-500 md:table-cell">{user.email}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_BADGE[user.role] ?? "bg-slate-100 text-slate-600"}`}>
                        {user.role.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${user.status === "active" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3.5 text-slate-500 lg:table-cell">
                      {user.clinic_name ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="hidden px-4 py-3.5 text-slate-500 xl:table-cell">
                      {new Date(user.created_at).toLocaleDateString("en-PH")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-slate-50/40 px-4 py-2.5">
          <p className="text-xs text-slate-400">
            {filtered.length} of {users.length} {users.length === 1 ? "user" : "users"}
          </p>
        </div>
      </div>
    </>
  );
}
