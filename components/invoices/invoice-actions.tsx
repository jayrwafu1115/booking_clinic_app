"use client";

import { useActionState, useState } from "react";
import { CreditCard } from "lucide-react";
import { recordPaymentAction, updateInvoiceStatusAction } from "@/server/actions/invoices";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { InvoiceWithRelations } from "@/types/database";

type Props = {
  invoice: InvoiceWithRelations;
  patientId: string;
  balance: number;
};

function php(centavos: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(centavos / 100);
}

const METHODS = ["cash", "gcash", "card", "bank_transfer", "philhealth", "hmo"] as const;

export function InvoiceActions({ invoice, patientId, balance }: Props) {
  const [payOpen, setPayOpen] = useState(false);
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false);
  const [payState, payAction] = useActionState(recordPaymentAction, {});
  const [statusState, statusAction] = useActionState(updateInvoiceStatusAction, {});

  const isPaid = invoice.status === "paid" || invoice.status === "void";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {!isPaid && (
          <>
            <Button onClick={() => setPayOpen(true)} size="sm" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Record payment
            </Button>
            {invoice.status === "draft" && (
              <form action={statusAction}>
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <input type="hidden" name="status" value="sent" />
                <Button type="submit" variant="outline" size="sm">Mark as sent</Button>
              </form>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-red-600 hover:border-red-200 hover:bg-red-50"
              onClick={() => setVoidConfirmOpen(true)}
            >
              Void
            </Button>
          </>
        )}
        {statusState.message && (
          <p className={`self-center text-sm ${statusState.success ? "text-green-700" : "text-red-600"}`}>{statusState.message}</p>
        )}
      </div>

      <Dialog open={voidConfirmOpen} onOpenChange={setVoidConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Void this invoice?</DialogTitle>
          <p className="text-sm text-slate-600">
            Voiding is permanent and cannot be undone. The invoice will be marked as void and no further payments can be recorded.
          </p>
          <form
            action={statusAction}
            onSubmit={() => setVoidConfirmOpen(false)}
            className="mt-4 flex gap-3"
          >
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <input type="hidden" name="status" value="void" />
            <Button type="button" variant="outline" className="flex-1" onClick={() => setVoidConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-red-600 text-white hover:bg-red-700">
              Void invoice
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Record Payment</DialogTitle>
          <form
            action={async (fd) => { await payAction(fd); setPayOpen(false); }}
            className="space-y-4 pt-2"
          >
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <input type="hidden" name="patientId" value={patientId} />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Amount (PHP) *</label>
              <input
                type="number"
                name="amountPesos"
                required
                min={0.01}
                step="0.01"
                defaultValue={Math.max(0, balance / 100).toFixed(2)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
              />
              {balance > 0 && (
                <p className="text-xs text-slate-400">Balance due: {php(balance)}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Method *</label>
              <select name="method" required className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm">
                {METHODS.map((m) => (
                  <option key={m} value={m}>{m.replace("_", " ").toUpperCase()}</option>
                ))}
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
    </>
  );
}
