import { getManilaDayRange, getManilaMonthRange, manilaLocalToUtcIso } from "@/lib/utils/manila-time";

export type DateRangePeriod = "today" | "week" | "month" | "last_month" | "custom";

export type ResolvedDateRange = {
  start: string; // UTC ISO
  end: string;   // UTC ISO
  label: string;
  period: DateRangePeriod;
  fromParam: string | null;
  toParam: string | null;
};

export function getDateRangeFromParams(
  period: string | undefined,
  from: string | undefined,
  to: string | undefined
): ResolvedDateRange {
  const resolvedPeriod = (period ?? "month") as DateRangePeriod;

  switch (resolvedPeriod) {
    case "today": {
      const { start, end } = getManilaDayRange();
      return { start, end, label: "Today", period: "today", fromParam: null, toParam: null };
    }

    case "week": {
      const { localDate } = getManilaDayRange();
      const pivot = new Date(manilaLocalToUtcIso(`${localDate}T00:00`));
      const dow = pivot.getUTCDay();
      const toMonday = dow === 0 ? -6 : 1 - dow;
      const monday = new Date(pivot.getTime() + toMonday * 86_400_000);
      const sunday = new Date(monday.getTime() + 6 * 86_400_000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const start = manilaLocalToUtcIso(`${fmt(monday)}T00:00`);
      const end = manilaLocalToUtcIso(`${fmt(sunday)}T23:59`);
      return { start, end, label: "This Week", period: "week", fromParam: null, toParam: null };
    }

    case "last_month": {
      const now = new Date();
      const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const { start, end } = getManilaMonthRange(last);
      return { start, end, label: "Last Month", period: "last_month", fromParam: null, toParam: null };
    }

    case "custom": {
      if (from && to) {
        const start = manilaLocalToUtcIso(`${from}T00:00`);
        const end = manilaLocalToUtcIso(`${to}T23:59`);
        return { start, end, label: `${from} – ${to}`, period: "custom", fromParam: from, toParam: to };
      }
      // fall through to month
    }

    default: {
      const { start, end } = getManilaMonthRange();
      return { start, end, label: "This Month", period: "month", fromParam: null, toParam: null };
    }
  }
}
