"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { upsertPackageAction } from "@/server/actions/packages";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { TreatmentPackage } from "@/types/database";

type Props =
  | { mode: "create"; pkg?: undefined }
  | { mode: "edit"; pkg: TreatmentPackage };

export function PackageForm({ mode, pkg }: Props) {
  const [open, setOpen] = useState(mode === "edit" ? false : undefined);
  const [state, formAction] = useActionState(upsertPackageAction, {});

  const fields = (
    <div className="space-y-4">
      {pkg && <input type="hidden" name="id" value={pkg.id} />}
      <Field label="Package name *" name="name" defaultValue={pkg?.name ?? ""} />
      <Field label="Description" name="description" defaultValue={pkg?.description ?? ""} />
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Sessions *" name="sessionCount" defaultValue={pkg?.session_count ?? 10} />
        <NumberField label="Price (PHP) *" name="pricePesos" defaultValue={pkg ? pkg.price_centavos / 100 : 0} step="0.01" />
      </div>
      <NumberField label="Validity (days)" name="validityDays" defaultValue={pkg?.validity_days ?? 365} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={pkg?.active ?? true} /> Active
      </label>
      {state.message && (
        <p className={`text-sm ${state.success ? "text-green-700" : "text-red-600"}`}>{state.message}</p>
      )}
    </div>
  );

  if (mode === "create") {
    return (
      <form action={formAction} className="space-y-4">
        {fields}
        <Button type="submit" className="w-full">Create package</Button>
      </form>
    );
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Edit Package</DialogTitle>
          <form action={async (fd) => { await formAction(fd); setOpen(false); }} className="space-y-4 pt-2">
            {fields}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input type="text" name={name} defaultValue={defaultValue} className="h-10 w-full rounded-xl border border-input px-3 text-sm" />
    </div>
  );
}

function NumberField({ label, name, defaultValue, step }: { label: string; name: string; defaultValue: number; step?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input type="number" name={name} defaultValue={defaultValue} step={step} min={0} className="h-10 w-full rounded-xl border border-input px-3 text-sm" />
    </div>
  );
}
