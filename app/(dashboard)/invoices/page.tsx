import Link from "next/link";
import { FileText, Plus, Search } from "lucide-react";
import { EmptyState } from "@/components/core/empty-state";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Button } from "@/components/ui/button";
import { InvoicesTable } from "@/components/invoices/invoices-table";
import { getInvoicesData } from "@/server/queries/invoices";

export const dynamic = "force-dynamic";

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
        <InvoicesTable
          invoices={data.invoices}
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          canManage={data.canManage}
          filters={filters}
        />
      )}
    </div>
  );
}
