/* eslint-disable @next/next/no-img-element */
import type React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccessCard } from "@/components/settings/access-card";
import { PrintButton } from "@/components/invoices/print-button";
import type { Clinic, ClinicSettings, InvoiceWithRelations } from "@/types/database";

export const dynamic = "force-dynamic";

function php(centavos: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(centavos / 100);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

function clinicAddress(clinic: Pick<Clinic, "address_line_1" | "address_line_2" | "barangay" | "city" | "province" | "postal_code">) {
  return [clinic.address_line_1, clinic.address_line_2, clinic.barangay, clinic.city, clinic.province, clinic.postal_code]
    .filter(Boolean).join(", ");
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

type TemplateProps = {
  invoice: InvoiceWithRelations;
  clinic: Clinic;
  accentColor: string;
  settings: Pick<ClinicSettings, "invoice_header_note" | "invoice_footer_note">;
};

// ─── Classic ─────────────────────────────────────────────────────────────────
function ClassicTemplate({ invoice, clinic, accentColor, settings }: TemplateProps) {
  const totalPaid = invoice.payments.reduce((s, p) => s + p.amount_centavos, 0);
  const balance = invoice.total_centavos - totalPaid;
  const light = hexToRgba(accentColor, 0.07);

  return (
    <div className="min-h-screen bg-white p-10 font-sans text-slate-800" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties}>
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 pb-6" style={{ borderBottomColor: accentColor }}>
        <div className="flex items-start gap-4">
          {clinic.logo_url && (
            <img src={clinic.logo_url} alt={clinic.name} width={64} height={64} className="rounded-lg object-contain" />
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-900">{clinic.name}</h1>
            {settings.invoice_header_note && <p className="text-xs text-slate-500 mt-0.5">{settings.invoice_header_note}</p>}
            <p className="mt-1 text-sm text-slate-500">{clinicAddress(clinic)}</p>
            {clinic.phone && <p className="text-sm text-slate-500">{clinic.phone}</p>}
            {clinic.email && <p className="text-sm text-slate-500">{clinic.email}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold" style={{ color: accentColor }}>INVOICE</p>
          <p className="mt-1 text-lg font-semibold text-slate-700">{invoice.invoice_number}</p>
          <p className="text-sm text-slate-500">Date: {fmtDate(invoice.created_at)}</p>
          {invoice.due_date && <p className="text-sm text-slate-500">Due: {fmtDate(invoice.due_date)}</p>}
        </div>
      </div>

      {/* Bill To */}
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: accentColor }}>Bill To</p>
          <p className="mt-1 font-semibold text-slate-900">{invoice.patients?.full_name}</p>
          {invoice.patients?.phone && <p className="text-sm text-slate-600">{invoice.patients.phone}</p>}
          {invoice.patients?.email && <p className="text-sm text-slate-600">{invoice.patients.email}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: accentColor }}>Status</p>
          <p className="mt-1 font-semibold capitalize text-slate-700">{invoice.status}</p>
        </div>
      </div>

      {/* Line items — backgrounds on <td>/<th> cells, not <tr>, due to border-collapse */}
      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="px-4 py-2.5 text-left font-medium" style={{ backgroundColor: accentColor, color: "white" }}>Description</th>
            <th className="px-4 py-2.5 text-right font-medium" style={{ backgroundColor: accentColor, color: "white" }}>Qty</th>
            <th className="px-4 py-2.5 text-right font-medium" style={{ backgroundColor: accentColor, color: "white" }}>Unit Price</th>
            <th className="px-4 py-2.5 text-right font-medium" style={{ backgroundColor: accentColor, color: "white" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.invoice_items.map((item, i) => {
            const cellBg = i % 2 === 0 ? undefined : { backgroundColor: light };
            return (
              <tr key={item.id}>
                <td className="border border-slate-200 px-4 py-2.5" style={cellBg}>{item.description}</td>
                <td className="border border-slate-200 px-4 py-2.5 text-right" style={cellBg}>{item.quantity}</td>
                <td className="border border-slate-200 px-4 py-2.5 text-right" style={cellBg}>{php(item.unit_price_centavos)}</td>
                <td className="border border-slate-200 px-4 py-2.5 text-right font-medium" style={cellBg}>{php(item.total_centavos)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="border border-slate-200 bg-slate-50 px-4 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">Subtotal</td>
            <td className="border border-slate-200 bg-slate-50 px-4 py-2.5 text-right">{php(invoice.subtotal_centavos)}</td>
          </tr>
          {invoice.discount_centavos > 0 && (
            <tr>
              <td colSpan={3} className="border border-slate-200 bg-slate-50 px-4 py-2 text-right text-xs font-semibold uppercase text-slate-500">Discount</td>
              <td className="border border-slate-200 bg-slate-50 px-4 py-2 text-right text-green-600">−{php(invoice.discount_centavos)}</td>
            </tr>
          )}
          <tr>
            <td colSpan={3} className="px-4 py-3 text-right font-bold uppercase" style={{ backgroundColor: accentColor, color: "white" }}>Total</td>
            <td className="px-4 py-3 text-right text-lg font-bold" style={{ backgroundColor: accentColor, color: "white" }}>{php(invoice.total_centavos)}</td>
          </tr>
          {totalPaid > 0 && (
            <>
              <tr>
                <td colSpan={3} className="border border-slate-200 bg-slate-50 px-4 py-2 text-right text-xs font-semibold uppercase text-slate-500">Amount Paid</td>
                <td className="border border-slate-200 bg-slate-50 px-4 py-2 text-right text-green-600">−{php(totalPaid)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="border border-slate-200 bg-slate-50 px-4 py-2.5 text-right text-xs font-semibold uppercase text-slate-700">Balance Due</td>
                <td className={`border border-slate-200 bg-slate-50 px-4 py-2.5 text-right font-bold ${balance > 0 ? "text-red-600" : "text-green-700"}`}>
                  {php(Math.max(0, balance))}
                </td>
              </tr>
            </>
          )}
        </tfoot>
      </table>

      {invoice.notes && (
        <div className="mt-6 rounded-lg p-4 text-sm text-slate-600"
          style={{ backgroundColor: light, border: `1px solid ${hexToRgba(accentColor, 0.2)}` }}>
          <p className="font-semibold" style={{ color: accentColor }}>Notes</p>
          <p className="mt-1">{invoice.notes}</p>
        </div>
      )}
      {settings.invoice_footer_note && (
        <p className="mt-10 border-t border-slate-200 pt-4 text-center text-sm text-slate-400">{settings.invoice_footer_note}</p>
      )}
    </div>
  );
}

// ─── Modern ───────────────────────────────────────────────────────────────────
function ModernTemplate({ invoice, clinic, accentColor, settings }: TemplateProps) {
  const totalPaid = invoice.payments.reduce((s, p) => s + p.amount_centavos, 0);
  const balance = invoice.total_centavos - totalPaid;
  const light = hexToRgba(accentColor, 0.08);
  const subtext = "rgba(255,255,255,0.75)";

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties}>
      {/* Colored header band */}
      <div className="px-10 py-8 text-white" style={{ backgroundColor: accentColor }}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {clinic.logo_url && (
              <img src={clinic.logo_url} alt={clinic.name} width={56} height={56} className="rounded-lg object-contain p-1" style={{ background: "rgba(255,255,255,0.15)" }} />
            )}
            <div>
              <h1 className="text-2xl font-bold">{clinic.name}</h1>
              {settings.invoice_header_note && <p className="text-sm mt-0.5" style={{ color: subtext }}>{settings.invoice_header_note}</p>}
              <p className="mt-1 text-sm" style={{ color: subtext }}>{clinicAddress(clinic)}</p>
              {clinic.phone && <p className="text-sm" style={{ color: subtext }}>{clinic.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-extrabold tracking-tight" style={{ color: "rgba(255,255,255,0.9)" }}>INVOICE</p>
            <p className="mt-1 text-lg font-semibold" style={{ color: subtext }}>{invoice.invoice_number}</p>
            <p className="text-sm" style={{ color: subtext }}>Issued: {fmtDate(invoice.created_at)}</p>
            {invoice.due_date && <p className="text-sm" style={{ color: subtext }}>Due: {fmtDate(invoice.due_date)}</p>}
          </div>
        </div>
      </div>

      <div className="px-10 py-8">
        {/* Bill To */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>Bill To</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{invoice.patients?.full_name}</p>
            {invoice.patients?.phone && <p className="text-sm text-slate-500">{invoice.patients.phone}</p>}
            {invoice.patients?.email && <p className="text-sm text-slate-500">{invoice.patients.email}</p>}
          </div>
          <div className="rounded-xl px-4 py-3 text-right" style={{ backgroundColor: light }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>Status</p>
            <p className="mt-1 font-semibold capitalize text-slate-700">{invoice.status}</p>
          </div>
        </div>

        {/* Line items */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2" style={{ borderBottomColor: accentColor }}>
              <th className="pb-2 text-left text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>Description</th>
              <th className="pb-2 text-right text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>Qty</th>
              <th className="pb-2 text-right text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>Unit Price</th>
              <th className="pb-2 text-right text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.invoice_items.map((item) => (
              <tr key={item.id}>
                <td className="py-3">{item.description}</td>
                <td className="py-3 text-right text-slate-500">{item.quantity}</td>
                <td className="py-3 text-right text-slate-500">{php(item.unit_price_centavos)}</td>
                <td className="py-3 text-right font-medium">{php(item.total_centavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="ml-auto mt-6 w-64 space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span><span>{php(invoice.subtotal_centavos)}</span>
          </div>
          {invoice.discount_centavos > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span><span>−{php(invoice.discount_centavos)}</span>
            </div>
          )}
          {totalPaid > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Amount Paid</span><span>−{php(totalPaid)}</span>
            </div>
          )}
          <div className="flex justify-between rounded-xl px-4 py-3 text-white" style={{ backgroundColor: accentColor }}>
            <span className="font-bold uppercase tracking-wide">{totalPaid > 0 ? "Balance Due" : "Total"}</span>
            <span className="text-lg font-bold">{php(Math.max(0, totalPaid > 0 ? balance : invoice.total_centavos))}</span>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-8 rounded-xl p-4 text-sm text-slate-600" style={{ backgroundColor: light, border: `1px solid ${hexToRgba(accentColor, 0.2)}` }}>
            <p className="font-semibold" style={{ color: accentColor }}>Notes</p>
            <p className="mt-1">{invoice.notes}</p>
          </div>
        )}
        {settings.invoice_footer_note && (
          <p className="mt-10 text-center text-sm italic text-slate-400">{settings.invoice_footer_note}</p>
        )}
      </div>
    </div>
  );
}

// ─── Minimal (no accent color — black & white) ────────────────────────────────
function MinimalTemplate({ invoice, clinic, settings }: TemplateProps) {
  const totalPaid = invoice.payments.reduce((s, p) => s + p.amount_centavos, 0);
  const balance = invoice.total_centavos - totalPaid;

  return (
    <div className="min-h-screen bg-white p-12 font-sans text-slate-900" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {clinic.logo_url && (
            <img src={clinic.logo_url} alt={clinic.name} width={56} height={56} className="object-contain" />
          )}
          <div>
            <h1 className="text-xl font-bold">{clinic.name}</h1>
            {settings.invoice_header_note && <p className="text-xs text-slate-500 mt-0.5">{settings.invoice_header_note}</p>}
            <p className="text-sm text-slate-500">{clinicAddress(clinic)}</p>
            {clinic.phone && <p className="text-sm text-slate-500">{clinic.phone}</p>}
            {clinic.email && <p className="text-sm text-slate-500">{clinic.email}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold uppercase tracking-tight">Invoice</p>
          <p className="mt-1 text-base font-medium text-slate-600">{invoice.invoice_number}</p>
          <p className="text-sm text-slate-500">{fmtDate(invoice.created_at)}</p>
          {invoice.due_date && <p className="text-sm text-slate-500">Due: {fmtDate(invoice.due_date)}</p>}
        </div>
      </div>
      <hr className="my-6 border-slate-900" />
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Bill To</p>
        <p className="mt-1 font-semibold">{invoice.patients?.full_name}</p>
        {invoice.patients?.phone && <p className="text-sm text-slate-500">{invoice.patients.phone}</p>}
        {invoice.patients?.email && <p className="text-sm text-slate-500">{invoice.patients.email}</p>}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-y border-slate-900">
            <th className="py-2 text-left font-semibold uppercase tracking-wide">Description</th>
            <th className="py-2 text-right font-semibold uppercase tracking-wide">Qty</th>
            <th className="py-2 text-right font-semibold uppercase tracking-wide">Unit Price</th>
            <th className="py-2 text-right font-semibold uppercase tracking-wide">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {invoice.invoice_items.map((item) => (
            <tr key={item.id}>
              <td className="py-2.5">{item.description}</td>
              <td className="py-2.5 text-right text-slate-600">{item.quantity}</td>
              <td className="py-2.5 text-right text-slate-600">{php(item.unit_price_centavos)}</td>
              <td className="py-2.5 text-right font-medium">{php(item.total_centavos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 border-t border-slate-900 pt-3 text-sm">
        <div className="ml-auto w-56 space-y-1">
          <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{php(invoice.subtotal_centavos)}</span></div>
          {invoice.discount_centavos > 0 && (
            <div className="flex justify-between"><span>Discount</span><span>−{php(invoice.discount_centavos)}</span></div>
          )}
          {totalPaid > 0 && (
            <div className="flex justify-between"><span>Amount Paid</span><span>−{php(totalPaid)}</span></div>
          )}
          <div className="flex justify-between border-t border-slate-900 pt-2 text-base font-bold">
            <span>{totalPaid > 0 ? "Balance Due" : "Total"}</span>
            <span>{php(Math.max(0, totalPaid > 0 ? balance : invoice.total_centavos))}</span>
          </div>
        </div>
      </div>
      {invoice.notes && (
        <div className="mt-8 border-l-2 border-slate-300 pl-4 text-sm italic text-slate-600">{invoice.notes}</div>
      )}
      {settings.invoice_footer_note && (
        <p className="mt-12 text-center text-sm text-slate-400">{settings.invoice_footer_note}</p>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profile = await getCurrentProfile();
    if (!profile?.clinic_id || !profileHasPermission(profile, "invoices:view")) {
      return <AccessCard title="Print Invoice" message="Access denied." />;
    }

    const supabase = await createSupabaseServerClient();
    const [{ data: invoice }, { data: clinic }, { data: settings }] = await Promise.all([
      supabase
        .from("invoices")
        .select("*, patients(id, full_name, phone, email), invoice_items(*), payments(*)")
        .eq("id", id)
        .eq("clinic_id", profile.clinic_id)
        .single<InvoiceWithRelations>(),
      supabase
        .from("clinics")
        .select("*")
        .eq("id", profile.clinic_id)
        .single<Clinic>(),
      supabase
        .from("clinic_settings")
        .select("invoice_template, invoice_accent_color, invoice_header_note, invoice_footer_note")
        .eq("clinic_id", profile.clinic_id)
        .maybeSingle<Pick<ClinicSettings, "invoice_template" | "invoice_accent_color" | "invoice_header_note" | "invoice_footer_note">>(),
    ]);

    if (!invoice || !clinic) {
      return <AccessCard title="Print Invoice" message="Invoice not found." />;
    }

    const template = settings?.invoice_template ?? "classic";
    // Color priority: saved override → clinic primary_color → fallback blue
    const accentColor = settings?.invoice_accent_color ?? clinic.primary_color ?? "#2563eb";
    const tplSettings: TemplateProps["settings"] = {
      invoice_header_note: settings?.invoice_header_note ?? null,
      invoice_footer_note: settings?.invoice_footer_note ?? "Thank you for your business!",
    };

    return (
      <>
        <div className="print:hidden flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3">
          <Link
            href={`/invoices/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-sm font-medium text-slate-700">{invoice.invoice_number}</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400 capitalize">{template} template</span>
            <span className="inline-block h-4 w-4 rounded-full border border-slate-200" style={{ backgroundColor: accentColor }} />
            <PrintButton />
          </div>
        </div>

        {template === "modern" ? (
          <ModernTemplate invoice={invoice} clinic={clinic} accentColor={accentColor} settings={tplSettings} />
        ) : template === "minimal" ? (
          <MinimalTemplate invoice={invoice} clinic={clinic} accentColor={accentColor} settings={tplSettings} />
        ) : (
          <ClassicTemplate invoice={invoice} clinic={clinic} accentColor={accentColor} settings={tplSettings} />
        )}
      </>
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load invoice.";
    return <AccessCard title="Print Invoice" message={message} />;
  }
}
