import Link from "next/link";
import { ChevronRight, FileText, Plus, Search } from "lucide-react";
import { EmptyState } from "@/components/core/empty-state";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Button } from "@/components/ui/button";
import { getInvoicesData } from "@/server/queries/invoices";
import { formatManilaDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent:  "bg-blue-50 text-blue-700",
  paid:  "bg-green-50 text-green-700",
  void:  "bg-red-50 text-red-500",
};

function php(centavos: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(centavos / 100);
}

function pageHref(
  page: number,
  filters: { q: string; status: string; dateFrom: string; dateTo: string },
) {
  const params = new URLSearchParams();
  if (filters.q)        params.set("q",        filters.q);
  if (filters.status)   params.set("status",   filters.status);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo)   params.set("dateTo",   filters.dateTo);
  params.set("page", String(page));
  return `/invoices?${params.toString()}`;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}) {
  const data = await getInvoicesData(await searchParams);
  if (!data) return <AccessCard title="Invoices" message="Sign in with a clinic account to manage invoices." />;

  const { filters } = data;
  const hasFilters = !!(filters.q || filters.status || filters.dateFrom || filters.dateTo);

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Billing"
        title="Invoices"
        description="Generate and manage patient invoices and payment records."
        icon={FileText}
        action={data.canManage ? { href: "/invoices/new", label: "New invoice", icon: Plus } : undefined}
      />

      {/* Filter bar */}
      <form method="get" className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Search invoice number…"
            className="h-10 w-52 rounded-xl border border-input bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100"
          />
        </div>

        <div className="flex h-10 items-center gap-2 rounded-xl border border-input bg-white px-3">
          <label htmlFor="inv-from" className="whitespace-nowrap text-xs font-medium text-slate-500">
            From
          </label>
          <input
            id="inv-from"
            type="date"
            name="dateFrom"
            defaultValue={filters.dateFrom}
            className="bg-transparent text-sm text-slate-900 outline-none"
          />
        </div>

        <div className="flex h-10 items-center gap-2 rounded-xl border border-input bg-white px-3">
          <label htmlFor="inv-to" className="whitespace-nowrap text-xs font-medium text-slate-500">
            To
          </label>
          <input
            id="inv-to"
            type="date"
            name="dateTo"
            defaultValue={filters.dateTo}
            className="bg-transparent text-sm text-slate-900 outline-none"
          />
        </div>

        <select
          name="status"
          defaultValue={filters.status}
          className="h-10 rounded-xl border border-input bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100"
        >
          <option value="">All statuses</option>
          {["draft", "sent", "paid", "void"].map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        <Button type="submit" size="sm">
          Apply
        </Button>

        {hasFilters && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/invoices">Clear filters</Link>
          </Button>
        )}
      </form>

      {data.invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          description={
            hasFilters
              ? "No invoices match your filters. Try adjusting or clearing them."
              : "Create your first invoice."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Invoice
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Patient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Total
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 sm:table-cell">
                    Date
                  </th>
                  <th className="w-8 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="group border-b border-border last:border-0 transition-colors hover:bg-slate-50"
                  >
                    <td className="px-4 py-3.5 font-mono text-xs font-medium tabular-nums text-slate-800">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      {inv.patients?.full_name ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[inv.status] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium tabular-nums text-slate-900">
                      {php(inv.total_centavos)}
                    </td>
                    <td className="hidden px-4 py-3.5 tabular-nums text-slate-500 sm:table-cell">
                      {formatManilaDate(inv.created_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href={`/invoices/${inv.id}`}>
                        <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border bg-slate-50/40 px-4 py-2.5">
            <p className="text-xs text-slate-400">
              Page {data.page} of {data.totalPages} · {data.total.toLocaleString()} invoices
            </p>
            <div className="flex items-center gap-1">
              {data.page <= 1 ? (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled>
                  ‹
                </Button>
              ) : (
                <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Link href={pageHref(data.page - 1, filters)}>‹</Link>
                </Button>
              )}
              {data.page >= data.totalPages ? (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled>
                  ›
                </Button>
              ) : (
                <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Link href={pageHref(data.page + 1, filters)}>›</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
