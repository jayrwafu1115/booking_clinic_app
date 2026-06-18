"use client";

import { useActionState, useEffect, useRef } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormField } from "@/components/core/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createDoctorDrawerAction, updateDoctorDrawerAction } from "@/server/actions/doctors";
import type { Doctor, Profile } from "@/types/database";

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

interface DoctorDrawerProps {
  doctor?: Doctor;
  doctorProfiles: Profile[];
  onClose: () => void;
  onSuccess: () => void;
}

export function DoctorDrawer({ doctor, doctorProfiles, onClose, onSuccess }: DoctorDrawerProps) {
  const isNew = !doctor;
  const action = isNew ? createDoctorDrawerAction : updateDoctorDrawerAction;
  const [state, formAction] = useActionState(action, {});

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (state.success) onSuccessRef.current();
  }, [state.success]);

  const displayName = doctor?.full_name ?? "New Doctor";

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent>
        {/* Header */}
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${getAvatarColor(displayName)}`}
            >
              {getInitials(displayName) || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate">{displayName}</SheetTitle>
              {doctor && (
                <p className="font-mono text-xs text-slate-400 mt-0.5">
                  #{doctor.id.slice(0, 8).toUpperCase()}
                </p>
              )}
            </div>
            <span
              className={
                isNew
                  ? "inline-flex flex-shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                  : doctor?.active
                  ? "inline-flex flex-shrink-0 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700"
                  : "inline-flex flex-shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500"
              }
            >
              {isNew ? "New" : doctor?.active ? "Active" : "Inactive"}
            </span>
          </div>
        </SheetHeader>

        {/* Form — wraps scrollable body + sticky footer so useFormStatus works */}
        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          {doctor && <input type="hidden" name="id" value={doctor.id} />}

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <AuthStatus message={state.message} success={state.success} />

            {/* Doctor Details */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Doctor Details</p>
              <FormField label="Linked doctor profile">
                <select
                  name="profileId"
                  defaultValue={doctor?.profile_id ?? ""}
                  className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100"
                >
                  <option value="">Not linked</option>
                  {doctorProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name} · {profile.email}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Full name">
                <Input name="fullName" defaultValue={doctor?.full_name ?? ""} required />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Specialization">
                  <Input name="specialization" defaultValue={doctor?.specialization ?? ""} />
                </FormField>
                <FormField label="License number">
                  <Input name="licenseNo" defaultValue={doctor?.license_no ?? ""} />
                </FormField>
                <FormField label="Email">
                  <Input name="email" type="email" defaultValue={doctor?.email ?? ""} />
                </FormField>
                <FormField label="Phone">
                  <Input name="phone" type="tel" defaultValue={doctor?.phone ?? ""} />
                </FormField>
                <div className="col-span-2">
                  <FormField label="Avatar URL">
                    <Input name="avatarUrl" defaultValue={doctor?.avatar_url ?? ""} placeholder="https://..." />
                  </FormField>
                </div>
              </div>
            </section>

            {/* Settings */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Settings</p>
              <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-border px-3 text-sm font-medium text-slate-700">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={doctor?.active ?? true}
                  className="rounded border-slate-300 text-blue-600"
                />
                Active
              </label>
            </section>
          </div>

          {/* Sticky footer */}
          <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-4">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <SubmitButton className="w-auto px-5">
              {isNew ? "Create doctor" : "Save changes"}
            </SubmitButton>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
