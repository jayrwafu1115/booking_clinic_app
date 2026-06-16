"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatPesoFromCentavos } from "@/lib/utils/format";
import type { Service } from "@/types/database";

type ServiceRow = Pick<Service, "id" | "name" | "category" | "duration_minutes" | "price_centavos" | "color" | "active">;

export function ServicesTable({ services }: { services: ServiceRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = services.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      (s.category ?? "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search by name or category…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Service</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Duration</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hidden lg:table-cell">Status</th>
                <th className="w-8 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                    {query ? `No services matching "${query}"` : "No services added yet"}
                  </td>
                </tr>
              ) : (
                filtered.map((service) => (
                  <tr
                    key={service.id}
                    className="group cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-slate-50"
                    onClick={() => router.push(`/services/${service.id}`)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: service.color }}
                        />
                        <span className="font-medium text-slate-900">{service.name}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3.5 text-slate-500 md:table-cell">
                      {service.category ?? <span className="text-slate-300">Uncategorized</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-slate-600">
                      {service.duration_minutes} min
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums font-medium text-slate-900">
                      {formatPesoFromCentavos(service.price_centavos)}
                    </td>
                    <td className="hidden px-4 py-3.5 lg:table-cell">
                      <span className={service.active
                        ? "inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700"
                        : "inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500"
                      }>
                        {service.active ? "Active" : "Inactive"}
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
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-slate-50/40 px-4 py-2.5">
          <p className="text-xs text-slate-400">
            {filtered.length} {filtered.length === 1 ? "service" : "services"}
            {query && ` matching "${query}"`}
          </p>
        </div>
      </div>
    </>
  );
}
