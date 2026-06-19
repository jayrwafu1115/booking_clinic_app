"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard, Printer } from "lucide-react";
import { recordPaymentAction, updateInvoiceStatusAction } from "@/server/actions/invoices";
import {
  Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { InvoiceWithRelations } from "@/types/database";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent:  "bg-blue-50 text-blue-700",
  paid:  "bg-green-50 text-green-700",
  void:  "bg-red-50 text-red-500",
};

const METHODS = ["cash", "gcash", "card", "bank_transfer", "philhealth", "hmo"] as const;

function php(centavos: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(centavos / 100);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

type Props = {
  invoice: InvoiceWithRelations;
  canManage: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function InvoiceDrawer({ invoice, canManage, onClose, onSuccess }: Props) {
  const router = useRouter();
  const [payOpen, setPayOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [payState, payAction] = useActionState(recordPaymentAction, {});
  const [statusState, statusAction] = useActionState(updateInvoiceStatusAction, {});

  const totalPaid = invoice.payments.reduce((s, p) => s + p.amount_centavos, 0);
  const balance = invoice.total_centavos - totalPaid;
  const isPaid = invoice.status === "paid" || invoice.status === "void";

  function handleSuccess() {
    router.refresh();
    onSuccess();
  }

  return (
    <>
      <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent className="sm:max-w-[540px]">
          {/* Header */}
          <SheetHeader>
            <div className="flex items-center gap-2.5">
              <SheetTitle className="font-mono text-lg">{invoice.invoice_number}</SheetTitle>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[invoice.status] ?? "bg-slate-100"}`}>
                {invoice.status}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {invoice.patients?.full_name ?? "—"}
              {" · "}
              {fmtDate(invoice.created_at)}
              {invoice.due_date && ` · Due ${fmtDate(invoice.due_date)}`}
            </p>
          </SheetHeader>

          <SheetBody className="space-y-6">
            {/* Patient */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Patient</h3>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 space-y-0.5">
                <p className="font-semibold text-slate-900">{invoice.patients?.full_name ?? "—"}</p>
                {invoice.patients?.phone && <p>{invoice.patients.phone}</p>}
                {invoice.patients?.email && <p className="text-slate-500">{invoice.patients.email}</p>}
              </div>
            </section>

            {/* Line items */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Line Items</h3>
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">Description</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {invoice.invoice_items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-slate-700">{item.description}</td>
                        <td className="px-3 py-2 text-right text-slate-500">{item.quantity}</td>
                        <td className="px-3 py-2 text-right font-medium text-slate-900">{php(item.total_centavos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-sm space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span><span>{php(invoice.subtotal_centavos)}</span>
                  </div>
                  {invoice.discount_centavos > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span><span>−{php(invoice.discount_centavos)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900">
                    <span>Total</span><span>{php(invoice.total_centavos)}</span>
                  </div>
                  {totalPaid > 0 && (
                    <>
                      <div className="flex justify-between text-green-600">
                        <span>Amount paid</span><span>−{php(totalPaid)}</span>
                      </div>
                      <div className={`flex justify-between font-bold ${balance > 0 ? "text-red-600" : "text-green-700"}`}>
                        <span>Balance due</span><span>{php(Math.max(0, balance))}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* Payment history */}
            {invoice.payments.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Payment History</h3>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {invoice.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium capitalize text-slate-800">{p.method.replace("_", " ")}</p>
                        {p.reference_no && <p className="text-xs text-slate-400">Ref: {p.reference_no}</p>}
                        <p className="text-xs text-slate-400">{fmtDate(p.created_at)}</p>
                      </div>
                      <span className="font-semibold text-green-700">{php(p.amount_centavos)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Notes */}
            {invoice.notes && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Notes</h3>
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{invoice.notes}</p>
              </section>
            )}

            {statusState.message && (
              <p className={`text-sm ${statusState.success ? "text-green-700" : "text-red-600"}`}>{statusState.message}</p>
            )}
          </SheetBody>

          {/* Footer — actions */}
          <SheetFooter>
            <div className="flex flex-wrap items-center gap-2">
              {canManage && !isPaid && (
                <>
                  <Button size="sm" className="gap-1.5" onClick={() => setPayOpen(true)}>
                    <CreditCard className="h-3.5 w-3.5" />
                    Record payment
                  </Button>
                  {invoice.status === "draft" && (
                    <form action={async (fd) => { await statusAction(fd); handleSuccess(); }}>
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <input type="hidden" name="status" value="sent" />
                      <Button type="submit" variant="outline" size="sm">Mark as sent</Button>
                    </form>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:border-red-200 hover:bg-red-50"
                    onClick={() => setVoidOpen(true)}
                  >
                    Void
                  </Button>
                </>
              )}
              <Link
                href={`/invoices/${invoice.id}/print`}
                target="_blank"
                className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </Link>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Record Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Record Payment</DialogTitle>
          <form
            action={async (fd) => { await payAction(fd); setPayOpen(false); handleSuccess(); }}
            className="space-y-4 pt-2"
          >
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <input type="hidden" name="patientId" value={invoice.patient_id} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Amount (PHP) *</label>
              <input
                type="number" name="amountPesos" required min={0.01} step="0.01"
                defaultValue={Math.max(0, balance / 100).toFixed(2)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
              />
              {balance > 0 && <p className="text-xs text-slate-400">Balance due: {php(balance)}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Method *</label>
              <select name="method" required className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm">
                {METHODS.map((m) => <option key={m} value={m}>{m.replace("_", " ").toUpperCase()}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Reference no.</label>
              <input type="text" name="referenceNo" placeholder="GCash ref, card last 4, etc." className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" />
            </div>
            {payState.message && (
              <p className={`text-sm ${payState.success ? "text-green-700" : "text-red-600"}`}>{payState.message}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setPayOpen(false)}>Cancel</Button>
              <Button type="submit">Save payment</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Void Confirmation Dialog */}
      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Void this invoice?</DialogTitle>
          <p className="text-sm text-slate-600">
            Voiding is permanent and cannot be undone. No further payments can be recorded.
          </p>
          <form
            action={async (fd) => { await statusAction(fd); setVoidOpen(false); handleSuccess(); }}
            className="mt-4 flex gap-3"
          >
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <input type="hidden" name="status" value="void" />
            <Button type="button" variant="outline" className="flex-1" onClick={() => setVoidOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-red-600 text-white hover:bg-red-700">Void invoice</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
