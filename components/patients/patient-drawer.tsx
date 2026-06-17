"use client";

import { useActionState, useEffect, useRef } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormField } from "@/components/core/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createPatientDrawerAction, updatePatientDrawerAction } from "@/server/actions/patients";
import type { Patient } from "@/types/database";
import { titleize } from "@/lib/utils/format";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700"
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string) {
  const code = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "critical", label: "Critical" },
  { value: "inactive", label: "Inactive" }
] as const;

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  critical: "bg-red-50 text-red-700",
  inactive: "bg-slate-100 text-slate-500"
};

const GENDERS = ["male", "female", "other", "prefer_not_to_say"] as const;

interface PatientDrawerProps {
  patient?: Patient;
  onClose: () => void;
  onSuccess: () => void;
  canManage: boolean;
}

export function PatientDrawer({ patient, onClose, onSuccess, canManage }: PatientDrawerProps) {
  const isNew = !patient;
  const action = isNew ? createPatientDrawerAction : updatePatientDrawerAction;
  const [state, formAction] = useActionState(action, {});

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (state.success) {
      onSuccessRef.current();
    }
  }, [state.success]);

  const displayName = patient?.full_name ?? "New Patient";
  const initials = getInitials(displayName);
  const avatarColor = getAvatarColor(displayName);
  const currentStatus = patient?.status ?? "active";

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent>
        {/* Header */}
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor}`}
            >
              {initials || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate">{displayName}</SheetTitle>
              {patient && (
                <p className="font-mono text-xs text-slate-400 mt-0.5">
                  #{patient.id.slice(0, 8).toUpperCase()}
                </p>
              )}
            </div>
            <span
              className={`inline-flex flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                STATUS_BADGE[currentStatus] ?? STATUS_BADGE.active
              }`}
            >
              {isNew ? "New Patient" : titleize(currentStatus)}
            </span>
          </div>
        </SheetHeader>

        {/* Form — wraps scrollable body + sticky footer so useFormStatus works */}
        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          {patient && <input type="hidden" name="id" value={patient.id} />}

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <AuthStatus message={state.message} success={state.success} />

            {/* Patient Details */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Patient Details
              </p>
              <FormField label="Full name">
                <Input
                  name="fullName"
                  defaultValue={patient?.full_name ?? ""}
                  required
                  autoComplete="name"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Phone">
                  <Input
                    name="phone"
                    type="tel"
                    defaultValue={patient?.phone ?? ""}
                    required
                    autoComplete="tel"
                  />
                </FormField>
                <FormField label="Birth date">
                  <Input
                    name="birthDate"
                    type="date"
                    defaultValue={patient?.birth_date ?? ""}
                    autoComplete="bday"
                  />
                </FormField>
                <FormField label="Email">
                  <Input
                    name="email"
                    type="email"
                    defaultValue={patient?.email ?? ""}
                    autoComplete="email"
                  />
                </FormField>
                <FormField label="Gender">
                  <select
                    name="gender"
                    defaultValue={patient?.gender ?? ""}
                    className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100"
                  >
                    <option value="">Not set</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {titleize(g)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <div className="col-span-2">
                  <FormField label="Status">
                    <select
                      name="status"
                      defaultValue={patient?.status ?? "active"}
                      className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100"
                    >
                      {STATUS_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              </div>
            </section>

            {/* Address */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Address
              </p>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Address line 1">
                  <Input
                    name="addressLine1"
                    defaultValue={patient?.address_line_1 ?? ""}
                    autoComplete="address-line1"
                  />
                </FormField>
                <FormField label="Address line 2">
                  <Input
                    name="addressLine2"
                    defaultValue={patient?.address_line_2 ?? ""}
                    autoComplete="address-line2"
                  />
                </FormField>
                <FormField label="Barangay">
                  <Input
                    name="barangay"
                    defaultValue={patient?.barangay ?? ""}
                    autoComplete="address-level3"
                  />
                </FormField>
                <FormField label="City / Municipality">
                  <Input
                    name="city"
                    defaultValue={patient?.city ?? ""}
                    autoComplete="address-level2"
                  />
                </FormField>
                <FormField label="Province">
                  <Input
                    name="province"
                    defaultValue={patient?.province ?? ""}
                    autoComplete="address-level1"
                  />
                </FormField>
                <FormField label="Region">
                  <Input
                    name="region"
                    defaultValue={patient?.region ?? ""}
                    autoComplete="off"
                  />
                </FormField>
                <FormField label="Postal code">
                  <Input
                    name="postalCode"
                    defaultValue={patient?.postal_code ?? ""}
                    autoComplete="postal-code"
                  />
                </FormField>
              </div>
            </section>

            {/* Emergency & Notes */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Emergency & Notes
              </p>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Emergency contact name">
                  <Input
                    name="emergencyContactName"
                    defaultValue={patient?.emergency_contact_name ?? ""}
                  />
                </FormField>
                <FormField label="Emergency contact phone">
                  <Input
                    name="emergencyContactPhone"
                    type="tel"
                    defaultValue={patient?.emergency_contact_phone ?? ""}
                  />
                </FormField>
                <div className="col-span-2">
                  <FormField label="Notes">
                    <textarea
                      name="notes"
                      defaultValue={patient?.notes ?? ""}
                      rows={4}
                      className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100 resize-none"
                    />
                  </FormField>
                </div>
              </div>
            </section>
          </div>

          {/* Sticky footer */}
          <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-4">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <SubmitButton className="w-auto px-5">
              {isNew ? "Create patient" : "Save changes"}
            </SubmitButton>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
