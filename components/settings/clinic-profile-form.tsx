"use client";

import { useActionState, useState } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CLINIC_TYPES, DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { updateClinicProfileAction } from "@/server/actions/settings";
import type { Clinic, ClinicSettings } from "@/types/database";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function ClinicProfileForm({
  clinic,
  settings,
  canEdit
}: {
  clinic: Clinic;
  settings: ClinicSettings | null;
  canEdit: boolean;
}) {
  const [state, formAction] = useActionState(updateClinicProfileAction, {});
  const [primaryColor, setPrimaryColor] = useState(clinic.primary_color);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="clinicId" value={clinic.id} />
      <input type="hidden" name="timezone" value={DEFAULT_TIMEZONE} />
      <input type="hidden" name="currency" value={DEFAULT_CURRENCY} />
      <AuthStatus message={state.message} success={state.success} />

      <fieldset disabled={!canEdit} className="space-y-5 disabled:opacity-70">
        <Card>
          <CardHeader>
            <CardTitle>Clinic Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Clinic name">
              <Input name="name" defaultValue={clinic.name} required />
            </Field>
            <Field label="Clinic slug">
              <Input name="slug" defaultValue={clinic.slug} required />
            </Field>
            <Field label="Clinic type">
              <select
                name="clinicType"
                defaultValue={settings?.clinic_type ?? "medical"}
                className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-100"
              >
                {CLINIC_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/^\w/, (letter) => letter.toUpperCase())}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Email">
              <Input name="email" type="email" defaultValue={clinic.email ?? ""} />
            </Field>
            <Field label="Phone">
              <Input name="phone" type="tel" defaultValue={clinic.phone ?? ""} />
            </Field>
            <Field label="Logo">
              <Input name="logoUrl" defaultValue={clinic.logo_url ?? ""} placeholder="https://..." />
            </Field>
            <Field label="Primary color">
              <div className="flex gap-3">
                <Input
                  className="w-16 p-1"
                  type="color"
                  value={primaryColor}
                  onChange={(event) => setPrimaryColor(event.target.value)}
                />
                <Input name="primaryColor" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} required />
              </div>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Philippines Address</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Address line 1">
              <Input name="addressLine1" defaultValue={clinic.address_line_1 ?? ""} />
            </Field>
            <Field label="Address line 2">
              <Input name="addressLine2" defaultValue={clinic.address_line_2 ?? ""} />
            </Field>
            <Field label="Barangay">
              <Input name="barangay" defaultValue={clinic.barangay ?? ""} />
            </Field>
            <Field label="City / Municipality">
              <Input name="city" defaultValue={clinic.city ?? ""} />
            </Field>
            <Field label="Province">
              <Input name="province" defaultValue={clinic.province ?? ""} />
            </Field>
            <Field label="Region">
              <Input name="region" defaultValue={clinic.region ?? ""} />
            </Field>
            <Field label="Postal code">
              <Input name="postalCode" defaultValue={clinic.postal_code ?? ""} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance & Defaults</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="PRC number">
              <Input name="prcNumber" defaultValue={settings?.prc_number ?? ""} />
            </Field>
            <Field label="PTR number">
              <Input name="ptrNumber" defaultValue={settings?.ptr_number ?? ""} />
            </Field>
            <Field label="TIN">
              <Input name="tin" defaultValue={settings?.tin ?? ""} />
            </Field>
            <Field label="PhilHealth accreditation number">
              <Input name="philhealthAccreditationNo" defaultValue={settings?.philhealth_accreditation_no ?? ""} />
            </Field>
            <Field label="Timezone">
              <Input value={DEFAULT_TIMEZONE} readOnly />
            </Field>
            <Field label="Currency">
              <Input value={DEFAULT_CURRENCY} readOnly />
            </Field>
          </CardContent>
        </Card>
      </fieldset>

      <div className="flex justify-end">
        {canEdit ? <SubmitButton className="w-full sm:w-auto">Save clinic settings</SubmitButton> : null}
      </div>
    </form>
  );
}
