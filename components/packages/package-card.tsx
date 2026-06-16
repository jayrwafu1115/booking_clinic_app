"use client";

import { useActionState, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { sellPackageAction, redeemSessionAction } from "@/server/actions/packages";
import { PackageForm } from "./package-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { TreatmentPackage, Patient, PatientPackage } from "@/types/database";

function php(centavos: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(centavos / 100);
}

const STATUS_BADGE: Record<string, string> = {
  active:    "bg-green-50 text-green-700",
  expired:   "bg-slate-100 text-slate-500",
  exhausted: "bg-blue-50 text-blue-700",
  cancelled: "bg-red-50 text-red-500",
};

type PatientPackageRow = PatientPackage & { patients: Pick<Patient, "id" | "full_name"> | null };

export function PackageCard({
  pkg,
  patients,
  soldPackages,
  canManage,
}: {
  pkg: TreatmentPackage;
  patients: Pick<Patient, "id" | "full_name">[];
  soldPackages: PatientPackageRow[];
  canManage: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [sellState, sellAction] = useActionState(sellPackageAction, {});
  const [redeemState, redeemAction] = useActionState(redeemSessionAction, {});

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">{pkg.name}</h3>
              {pkg.active ? (
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Inactive</span>
              )}
            </div>
            {pkg.description && <p className="mt-1 text-sm text-slate-500">{pkg.description}</p>}
            <p className="mt-2 text-sm text-slate-600">
              {pkg.session_count} sessions · {php(pkg.price_centavos)} · Valid {pkg.validity_days} days
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage && <PackageForm mode="edit" pkg={pkg} />}
            {canManage && (
              <Button variant="outline" size="sm" onClick={() => setSellOpen(true)}>
                Sell
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="border-t border-slate-100 pt-4">
          {soldPackages.length === 0 ? (
            <p className="text-sm text-slate-400">No patients have purchased this package yet.</p>
          ) : (
            <div className="space-y-3">
              {soldPackages.map((pp) => (
                <div key={pp.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-800">{pp.patients?.full_name ?? "Unknown"}</p>
                    <p className="text-xs text-slate-500">
                      {pp.sessions_used}/{pp.sessions_total} sessions · expires {new Date(pp.expires_at).toLocaleDateString("en-PH")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[pp.status] ?? "bg-slate-100"}`}>
                      {pp.status}
                    </span>
                    {canManage && pp.status === "active" && (
                      <form action={redeemAction}>
                        <input type="hidden" name="patientPackageId" value={pp.id} />
                        <Button type="submit" size="sm" variant="outline">Redeem</Button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {redeemState.message && (
            <p className={`mt-2 text-sm ${redeemState.success ? "text-green-700" : "text-red-600"}`}>{redeemState.message}</p>
          )}
        </CardContent>
      )}

      <Dialog open={sellOpen} onOpenChange={setSellOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Sell Package — {pkg.name}</DialogTitle>
          <form
            action={async (fd) => { await sellAction(fd); setSellOpen(false); }}
            className="space-y-4 pt-2"
          >
            <input type="hidden" name="packageId" value={pkg.id} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Patient *</label>
              <select name="patientId" required className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm">
                <option value="">— Select patient —</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Amount paid (PHP)</label>
              <input type="number" name="paidAmountPesos" defaultValue={(pkg.price_centavos / 100).toFixed(2)} step="0.01" min={0}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Payment method</label>
              <select name="paymentMethod" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm">
                <option value="">— Optional —</option>
                {["cash","gcash","card","bank_transfer","philhealth","hmo"].map((m) => (
                  <option key={m} value={m}>{m.replace("_"," ").toUpperCase()}</option>
                ))}
              </select>
            </div>
            {sellState.message && (
              <p className={`text-sm ${sellState.success ? "text-green-700" : "text-red-600"}`}>{sellState.message}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setSellOpen(false)}>Cancel</Button>
              <Button type="submit">Sell package</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
