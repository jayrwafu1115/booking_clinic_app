"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { DateRangePeriod } from "@/lib/utils/date-ranges";

const PERIODS: { value: DateRangePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "custom", label: "Custom" }
];

export function DateRangeFilter({
  period,
  from,
  to
}: {
  period: DateRangePeriod;
  from: string | null;
  to: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null) params.delete(k);
        else params.set(k, v);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-xl border border-slate-200 bg-white p-1">
        {PERIODS.filter((p) => p.value !== "custom").map((p) => (
          <button
            key={p.value}
            onClick={() => updateParams({ period: p.value, from: null, to: null })}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              period === p.value
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">Custom:</span>
        <input
          type="date"
          defaultValue={from ?? ""}
          onChange={(e) =>
            updateParams({ period: "custom", from: e.target.value || null })
          }
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-sm text-slate-400">–</span>
        <input
          type="date"
          defaultValue={to ?? ""}
          onChange={(e) =>
            updateParams({ period: "custom", to: e.target.value || null })
          }
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
