"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { AdminClinicRow } from "@/server/queries/super-admin";

const STATUS_BADGE: Record<string, string> = {
  active:    "bg-green-50 text-green-700",
  inactive:  "bg-slate-100 text-slate-600",
  suspended: "bg-red-50 text-red-700",
};

const SUB_BADGE: Record<string, string> = {
  trial:     "bg-orange-50 text-orange-700",
  active:    "bg-green-50 text-green-700",
  past_due:  "bg-red-50 text-red-700",
  cancelled: "bg-slate-100 text-slate-600",
  suspended: "bg-red-50 text-red-700",
  free:      "bg-slate-100 text-slate-500",
  none:      "bg-slate-100 text-slate-500",
};

export function ClinicsTable({ clinics }: { clinics: AdminClinicRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = clinics.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(query.toLowerCase()) ||
      c.slug.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search clinics by name, email, or slug…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Clinic</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Subscription</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Users</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Appts</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400 hidden lg:table-cell">AI Convs</th>
                <th className="w-8 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                    {query ? `No clinics matching "${query}"` : "No clinics found"}
                  </td>
                </tr>
              ) : (
                filtered.map((clinic) => (
                  <tr
                    key={clinic.id}
                    className="group cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-slate-50"
                    onClick={() => router.push(`/admin/clinics/${clinic.id}`)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                          <Building2 className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{clinic.name}</p>
                          <p className="text-xs text-slate-400">{clinic.email ?? clinic.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[clinic.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {clinic.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${SUB_BADGE[clinic.subscription_status] ?? "bg-slate-100 text-slate-500"}`}>
                          {clinic.subscription_status}
                        </span>
                        {clinic.plan_name && (
                          <p className="text-xs text-slate-400">{clinic.plan_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-600">
                      {Number(clinic.user_count).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-600">
                      {Number(clinic.appointment_count).toLocaleString()}
                    </td>
                    <td className="hidden px-4 py-3.5 text-right tabular-nums text-slate-600 lg:table-cell">
                      {Number(clinic.ai_conversation_count).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
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
            {filtered.length} of {clinics.length} {clinics.length === 1 ? "clinic" : "clinics"}
          </p>
        </div>
      </div>
    </>
  );
}
