"use client";

import { useActionState, useState } from "react";
import { Trash2, Plus, Search } from "lucide-react";
import { createInvoiceAction } from "@/server/actions/invoices";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Patient, Service } from "@/types/database";

type LineItem = { description: string; quantity: number; unitPricePesos: number };

// ---------- Patient search combobox ----------
function PatientCombobox({
  patients,
  defaultPatientId,
}: {
  patients: Pick<Patient, "id" | "full_name" | "phone">[];
  defaultPatientId?: string;
}) {
  const defaultPatient = patients.find((p) => p.id === defaultPatientId);
  const [query, setQuery] = useState(defaultPatient?.full_name ?? "");
  const [selectedId, setSelectedId] = useState(defaultPatientId ?? "");
  const [open, setOpen] = useState(false);

  const filtered = query.trim()
    ? patients.filter(
        (p) =>
          p.full_name.toLowerCase().includes(query.toLowerCase()) ||
          (p.phone ?? "").includes(query)
      )
    : patients;

  function select(p: Pick<Patient, "id" | "full_name" | "phone">) {
    setSelectedId(p.id);
    setQuery(p.full_name);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input type="hidden" name="patientId" value={selectedId} />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedId("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search by name or phone…"
          autoComplete="off"
          className="h-10 w-full rounded-xl border border-input pl-9 pr-3 text-sm"
        />
      </div>
      {open && (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
          {filtered.length > 0 ? (
            filtered.map((p) => (
              <li
                key={p.id}
                onMouseDown={(e) => { e.preventDefault(); select(p); }}
                className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-slate-50"
              >
                <span className="font-medium">{p.full_name}</span>
                <span className="text-xs text-slate-400">{p.phone}</span>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-slate-400">No patients found.</li>
          )}
        </ul>
      )}
    </div>
  );
}

// ---------- Service description autocomplete ----------
function DescriptionCombobox({
  value,
  index,
  services,
  onChange,
}: {
  value: string;
  index: number;
  services: Pick<Service, "id" | "name" | "price_centavos">[];
  onChange: (description: string, unitPricePesos?: number) => void;
}) {
  const [open, setOpen] = useState(false);

  const filtered = value.trim()
    ? services.filter((s) => s.name.toLowerCase().includes(value.toLowerCase()))
    : services;

  return (
    <div className="relative">
      <input
        type="text"
        name={`item_description_${index}`}
        required
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Service or item description"
        autoComplete="off"
        className="h-10 w-full rounded-xl border border-input px-3 text-sm"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-40 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
          {filtered.map((s) => (
            <li
              key={s.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s.name, s.price_centavos / 100);
                setOpen(false);
              }}
              className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-slate-50"
            >
              <span>{s.name}</span>
              <span className="text-xs text-slate-400">
                ₱{(s.price_centavos / 100).toLocaleString("en-PH")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Main form ----------
export function NewInvoiceForm({
  patients,
  services,
  defaultPatientId,
}: {
  patients: Pick<Patient, "id" | "full_name" | "phone">[];
  services: Pick<Service, "id" | "name" | "price_centavos">[];
  defaultPatientId?: string;
}) {
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

  function updateDescription(i: number, description: string, unitPricePesos?: number) {
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === i
          ? { ...it, description, ...(unitPricePesos !== undefined ? { unitPricePesos } : {}) }
          : it
      )
    );
  }

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPricePesos, 0);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Patient & Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Patient *</label>
            <PatientCombobox patients={patients} defaultPatientId={defaultPatientId} />
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
                <DescriptionCombobox
                  value={item.description}
                  index={i}
                  services={services}
                  onChange={(desc, price) => updateDescription(i, desc, price)}
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
              Subtotal:{" "}
              {new Intl.NumberFormat("en-PH", {
                style: "currency",
                currency: "PHP",
                minimumFractionDigits: 0,
              }).format(subtotal)}
            </span>
          </div>
        </CardContent>
      </Card>

      {state.message && (
        <p className={`text-sm ${state.success ? "text-green-700" : "text-red-600"}`}>
          {state.message}
        </p>
      )}
      <Button type="submit">Create Invoice</Button>
    </form>
  );
}
