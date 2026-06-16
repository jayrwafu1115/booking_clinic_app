"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { updateClinicSubscriptionAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { AdminClinicRow } from "@/server/queries/super-admin";
import type { ClinicSubscription, SubscriptionPlan } from "@/types/database";

type SubDetail = Pick<ClinicSubscription, "clinic_id" | "plan_id" | "current_period_start" | "current_period_end" | "trial_ends_at">;

type Props = {
  clinic: AdminClinicRow;
  plans: Pick<SubscriptionPlan, "id" | "name" | "price_monthly_centavos">[];
  sub: SubDetail | null;
};

const STATUSES = ["free", "active", "past_due", "cancelled", "suspended"] as const;

function php(centavos: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(centavos / 100);
}

export function EditSubscriptionForm({ clinic, plans, sub }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(updateClinicSubscriptionAction, {});

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Update Subscription — {clinic.name}</DialogTitle>

          <form
            action={async (fd) => {
              await formAction(fd);
              setOpen(false);
            }}
            className="space-y-4 pt-2"
          >
            <input type="hidden" name="clinicId" value={clinic.id} />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Plan</label>
              <select
                name="planId"
                defaultValue={sub?.plan_id ?? ""}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
              >
                <option value="">— No plan —</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({php(p.price_monthly_centavos)}/mo)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Status</label>
              <select
                name="status"
                defaultValue={clinic.subscription_status === "none" ? "free" : clinic.subscription_status}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Period start</label>
                <input
                  type="date"
                  name="periodStart"
                  defaultValue={sub?.current_period_start ? sub.current_period_start.slice(0, 10) : ""}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Period end</label>
                <input
                  type="date"
                  name="periodEnd"
                  defaultValue={sub?.current_period_end ? sub.current_period_end.slice(0, 10) : ""}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                />
              </div>
            </div>

            {state.message && (
              <p className={`text-sm ${state.success ? "text-green-700" : "text-red-600"}`}>
                {state.message}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
