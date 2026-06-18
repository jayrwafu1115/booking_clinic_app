"use client";

import { useState } from "react";
import { ChevronRight, Search, Stethoscope } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Doctor } from "@/types/database";

export function DoctorsTable({
  doctors,
  canManage,
  onRowClick
}: {
  doctors: Doctor[];
  canManage?: boolean;
  onRowClick?: (doctor: Doctor) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = doctors.filter(
    (d) =>
      d.full_name.toLowerCase().includes(query.toLowerCase()) ||
      (d.specialization ?? "").toLowerCase().includes(query.toLowerCase()) ||
      (d.email ?? "").toLowerCase().includes(query.toLowerCase())
  );

  const isClickable = canManage && !!onRowClick;

  return (
    <>
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search by name, specialization, or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/60">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Doctor</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hidden md:table-cell">Specialization</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hidden lg:table-cell">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
              <th className="w-8 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                  {query ? `No doctors matching "${query}"` : "No doctors added yet"}
                </td>
              </tr>
            ) : (
              filtered.map((doctor) => (
                <tr
                  key={doctor.id}
                  className={`group border-b border-border last:border-0 transition-colors hover:bg-slate-50 ${
                    isClickable ? "cursor-pointer" : ""
                  }`}
                  onClick={isClickable ? () => onRowClick(doctor) : undefined}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
                        <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <span className="font-medium text-slate-900">{doctor.full_name}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3.5 text-slate-500 md:table-cell">
                    {doctor.specialization ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="hidden px-4 py-3.5 text-slate-500 lg:table-cell">
                    {doctor.email ?? doctor.phone ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={
                        doctor.active
                          ? "inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700"
                          : "inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500"
                      }
                    >
                      {doctor.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Footer */}
        <div className="border-t border-border bg-slate-50/40 px-4 py-2.5">
          <p className="text-xs text-slate-400">
            {filtered.length} {filtered.length === 1 ? "doctor" : "doctors"}
            {query && ` matching "${query}"`}
          </p>
        </div>
      </div>
    </>
  );
}
