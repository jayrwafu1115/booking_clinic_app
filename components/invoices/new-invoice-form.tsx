"use client";

import { useActionState, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { createInvoiceAction } from "@/server/actions/invoices";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Patient } from "@/types/database";

type LineItem = { description: string; quantity: number; unitPricePesos: number };

export function NewInvoiceForm({ patients }: { patients: Pick<Patient, "id" | "full_name" | "phone">[] }) {
  const [state, formAction] = useActionState(createInvoiceAction, {});
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPricePesos: 0 }]);

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unitPricePesos: 0 }]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof LineItem, value: string | number) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPricePesos, 0);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Patient & Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Patient *</label>
            <select name="patientId" required className="h-10 w-full rounded-xl border border-input px-3 text-sm">
              <option value="">— Select patient —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name} · {p.phone}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Due date</label>
            <input type="date" name="dueDate" className="h-10 w-full rounded-xl border border-input px-3 text-sm" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <input type="text" name="notes" placeholder="Optional invoice notes…" className="h-10 w-full rounded-xl border border-input px-3 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Discount (PHP)</label>
            <input type="number" name="discountPesos" min={0} step="0.01" defaultValue="0" className="h-10 w-full rounded-xl border border-input px-3 text-sm" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_100px_36px] gap-2 items-end">
              <div className="space-y-1">
                {i === 0 && <label className="text-xs font-medium text-slate-500">Description</label>}
                <input
                  type="text"
                  name={`item_description_${i}`}
                  required
                  value={item.description}
                  onChange={(e) => updateItem(i, "description", e.target.value)}
                  placeholder="Service or item description"
                  className="h-10 w-full rounded-xl border border-input px-3 text-sm"
                />
              </div>
              <div className="space-y-1">
                {i === 0 && <label className="text-xs font-medium text-slate-500">Qty</label>}
                <input
                  type="number"
                  name={`item_quantity_${i}`}
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value, 10) || 1)}
                  className="h-10 w-full rounded-xl border border-input px-3 text-sm"
                />
              </div>
              <div className="space-y-1">
                {i === 0 && <label className="text-xs font-medium text-slate-500">Unit price (₱)</label>}
                <input
                  type="number"
                  name={`item_unitPricePesos_${i}`}
                  min={0}
                  step="0.01"
                  value={item.unitPricePesos}
                  onChange={(e) => updateItem(i, "unitPricePesos", parseFloat(e.target.value) || 0)}
                  className="h-10 w-full rounded-xl border border-input px-3 text-sm"
                />
              </div>
              <div className={i === 0 ? "pt-5" : ""}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Remove item"
                  onClick={() => removeItem(i)}
                  disabled={items.length === 1}
                  className="h-10 w-9 p-0 text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}

          <div className="mt-4 border-t border-slate-100 pt-3 text-right text-sm">
            <span className="font-semibold text-slate-800">
              Subtotal: {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(subtotal)}
            </span>
          </div>
        </CardContent>
      </Card>

      {state.message && (
        <p className={`text-sm ${state.success ? "text-green-700" : "text-red-600"}`}>{state.message}</p>
      )}
      <Button type="submit">Create Invoice</Button>
    </form>
  );
}
