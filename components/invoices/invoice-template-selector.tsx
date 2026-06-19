"use client";

import { useActionState, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { updateInvoiceTemplateAction } from "@/server/actions/invoice-templates";
import { INVOICE_TEMPLATES, type InvoiceTemplateId } from "@/lib/constants/invoice-templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  current: InvoiceTemplateId;
  accentColor: string | null;
  clinicPrimary: string;
  headerNote: string | null;
  footerNote: string | null;
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function TemplatePreview({ templateId, color }: { templateId: InvoiceTemplateId; color: string }) {
  const light = hexToRgba(color, 0.1);
  const border = hexToRgba(color, 0.25);

  if (templateId === "modern") {
    return (
      <div className="overflow-hidden rounded-lg select-none text-[8px] leading-tight" style={{ border: `1px solid ${border}` }}>
        <div className="px-3 py-2" style={{ backgroundColor: color }}>
          <div className="font-bold text-white" style={{ fontSize: 9 }}>CLINIC NAME</div>
          <div style={{ color: "rgba(255,255,255,0.7)" }}>123 Main St, Manila</div>
          <div className="mt-1 text-right font-extrabold text-white" style={{ fontSize: 13 }}>INVOICE</div>
        </div>
        <div className="bg-white p-2 space-y-1">
          <div className="text-[7px] font-bold uppercase" style={{ color }}>Bill To</div>
          <div className="flex justify-between mt-1">
            <div className="rounded bg-slate-200" style={{ width: "55%", height: 4 }} />
            <div className="font-medium" style={{ color }}>₱500</div>
          </div>
          <div className="flex justify-between">
            <div className="rounded bg-slate-200" style={{ width: "40%", height: 4 }} />
            <div className="font-medium" style={{ color }}>₱300</div>
          </div>
          <div className="mt-1 flex justify-between rounded px-2 py-1 text-white text-[7px] font-bold" style={{ backgroundColor: color }}>
            <span>Total</span><span>₱800</span>
          </div>
        </div>
      </div>
    );
  }

  if (templateId === "minimal") {
    return (
      <div className="rounded-lg border border-slate-300 bg-white p-3 select-none text-[8px] leading-tight">
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-1.5 mb-1.5">
          <div>
            <div className="font-bold text-slate-800" style={{ fontSize: 9 }}>CLINIC NAME</div>
            <div className="text-slate-400">123 Main St, Manila</div>
          </div>
          <div className="font-bold text-slate-800 text-right" style={{ fontSize: 11 }}>Invoice</div>
        </div>
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <div className="rounded bg-slate-200" style={{ width: "55%", height: 4 }} />
            <span className="font-medium text-slate-800">₱500</span>
          </div>
          <div className="flex justify-between">
            <div className="rounded bg-slate-200" style={{ width: "40%", height: 4 }} />
            <span className="font-medium text-slate-800">₱300</span>
          </div>
        </div>
        <div className="mt-1.5 border-t border-slate-800 pt-1 flex justify-between font-bold text-slate-900">
          <span>Total</span><span>₱800</span>
        </div>
      </div>
    );
  }

  // Classic (default)
  return (
    <div className="rounded-lg border bg-white p-3 select-none text-[8px] leading-tight" style={{ borderColor: border }}>
      <div className="flex justify-between items-start border-b-2 pb-1.5 mb-1.5" style={{ borderBottomColor: color }}>
        <div>
          <div className="font-bold" style={{ color, fontSize: 9 }}>CLINIC NAME</div>
          <div className="text-slate-400">123 Main St, Manila</div>
        </div>
        <div className="font-bold text-right" style={{ color, fontSize: 13 }}>INVOICE</div>
      </div>
      <div style={{ backgroundColor: color }} className="flex text-white font-medium px-1 py-0.5 mb-0.5 rounded-sm">
        <span style={{ flex: 2 }}>Description</span>
        <span>Total</span>
      </div>
      <div className="px-1 py-0.5 flex justify-between" style={{ backgroundColor: light }}>
        <div className="rounded bg-slate-300" style={{ width: "55%", height: 4 }} />
        <span className="font-medium" style={{ color }}>₱500</span>
      </div>
      <div className="px-1 py-0.5 flex justify-between bg-white">
        <div className="rounded bg-slate-200" style={{ width: "40%", height: 4 }} />
        <span className="font-medium" style={{ color }}>₱300</span>
      </div>
      <div className="mt-1 px-1 py-0.5 flex justify-between text-white font-bold rounded-sm" style={{ backgroundColor: color }}>
        <span>Total</span><span>₱800</span>
      </div>
    </div>
  );
}

export function InvoiceTemplateSelector({ current, accentColor, clinicPrimary, headerNote, footerNote }: Props) {
  const [state, formAction] = useActionState(updateInvoiceTemplateAction, {});
  const [selected, setSelected] = useState<InvoiceTemplateId>(current);
  const [color, setColor] = useState<string>(accentColor ?? clinicPrimary);

  const isUsingClinicDefault = color === clinicPrimary;

  return (
    <form action={formAction} className="space-y-8">
      <Card>
        <CardHeader><CardTitle>Choose Template</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {INVOICE_TEMPLATES.map((tpl) => {
              const active = selected === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelected(tpl.id)}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
                    active ? "border-blue-600 shadow-md" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {active && (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  )}
                  <TemplatePreview templateId={tpl.id} color={color} />
                  <p className="mt-3 font-semibold text-slate-800">{tpl.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{tpl.description}</p>
                </button>
              );
            })}
          </div>
          <input type="hidden" name="invoice_template" value={selected} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Accent Color</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            Used for headers, labels, and totals on printed invoices. Defaults to your clinic&apos;s brand color.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="color"
              name="invoice_accent_color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded-lg border border-input p-1"
            />
            <div>
              <p className="text-sm font-medium text-slate-700">{color.toUpperCase()}</p>
              {isUsingClinicDefault && (
                <p className="text-xs text-slate-400">Using clinic brand color</p>
              )}
            </div>
            {!isUsingClinicDefault && (
              <button
                type="button"
                onClick={() => setColor(clinicPrimary)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Reset to clinic color
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Custom Text</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Header note</label>
            <p className="text-xs text-slate-500">Shown below the clinic name (e.g. &quot;PRC No. 12345 · TIN 123-456-789&quot;).</p>
            <input
              type="text"
              name="invoice_header_note"
              defaultValue={headerNote ?? ""}
              maxLength={300}
              placeholder="Optional"
              className="h-10 w-full rounded-xl border border-input px-3 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Footer note</label>
            <input
              type="text"
              name="invoice_footer_note"
              defaultValue={footerNote ?? "Thank you for your business!"}
              maxLength={300}
              placeholder="Thank you for your business!"
              className="h-10 w-full rounded-xl border border-input px-3 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {state.message && (
        <p className={`text-sm ${state.success ? "text-green-700" : "text-red-600"}`}>{state.message}</p>
      )}
      <Button type="submit">Save Template</Button>
    </form>
  );
}
