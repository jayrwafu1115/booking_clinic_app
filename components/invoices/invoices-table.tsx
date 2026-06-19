"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InvoiceDrawer } from "@/components/invoices/invoice-drawer";
import { formatManilaDate } from "@/lib/utils/format";
import type { InvoiceWithRelations } from "@/types/database";

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

type Props = {
  invoices: InvoiceWithRelations[];
  page: number;
  totalPages: number;
  total: number;
  canManage: boolean;
  filters: { q: string; status: string; dateFrom: string; dateTo: string };
};

export function InvoicesTable({ invoices, page, totalPages, total, canManage, filters }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<InvoiceWithRelations | null>(null);

  return (
    <>
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
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => setSelected(inv)}
                  className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-slate-50"
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border bg-slate-50/40 px-4 py-2.5">
          <p className="text-xs text-slate-400">
            Page {page} of {totalPages} · {total.toLocaleString()} invoices
          </p>
          <div className="flex items-center gap-1">
            {page <= 1 ? (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled>‹</Button>
            ) : (
              <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Link href={pageHref(page - 1, filters)}>‹</Link>
              </Button>
            )}
            {page >= totalPages ? (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled>›</Button>
            ) : (
              <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Link href={pageHref(page + 1, filters)}>›</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <InvoiceDrawer
          invoice={selected}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onSuccess={() => { setSelected(null); router.refresh(); }}
        />
      )}
    </>
  );
}
