"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/core/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createPatientAction, updatePatientAction } from "@/server/actions/core";
import type { Patient } from "@/types/database";
import { titleize } from "@/lib/utils/format";

const genders = ["male", "female", "other", "prefer_not_to_say"] as const;

export function PatientForm({ patient }: { patient?: Patient }) {
  const action = patient ? updatePatientAction : createPatientAction;
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      {patient ? <input type="hidden" name="id" value={patient.id} /> : null}
      <AuthStatus message={state.message} success={state.success} />

      <Card>
        <CardHeader>
          <CardTitle>Patient Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField label="Full name">
            <Input name="fullName" defaultValue={patient?.full_name ?? ""} required />
          </FormField>
          <FormField label="Phone">
            <Input name="phone" type="tel" defaultValue={patient?.phone ?? ""} required />
          </FormField>
          <FormField label="Email">
            <Input name="email" type="email" defaultValue={patient?.email ?? ""} />
          </FormField>
          <FormField label="Birth date">
            <Input name="birthDate" type="date" defaultValue={patient?.birth_date ?? ""} />
          </FormField>
          <FormField label="Gender">
            <select
              name="gender"
              defaultValue={patient?.gender ?? ""}
              className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-100"
            >
              <option value="">Not set</option>
              {genders.map((gender) => (
                <option key={gender} value={gender}>
                  {titleize(gender)}
                </option>
              ))}
            </select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField label="Address line 1">
            <Input name="addressLine1" defaultValue={patient?.address_line_1 ?? ""} />
          </FormField>
          <FormField label="Address line 2">
            <Input name="addressLine2" defaultValue={patient?.address_line_2 ?? ""} />
          </FormField>
          <FormField label="Barangay">
            <Input name="barangay" defaultValue={patient?.barangay ?? ""} />
          </FormField>
          <FormField label="City / Municipality">
            <Input name="city" defaultValue={patient?.city ?? ""} />
          </FormField>
          <FormField label="Province">
            <Input name="province" defaultValue={patient?.province ?? ""} />
          </FormField>
          <FormField label="Region">
            <Input name="region" defaultValue={patient?.region ?? ""} />
          </FormField>
          <FormField label="Postal code">
            <Input name="postalCode" defaultValue={patient?.postal_code ?? ""} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency & Notes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField label="Emergency contact name">
            <Input name="emergencyContactName" defaultValue={patient?.emergency_contact_name ?? ""} />
          </FormField>
          <FormField label="Emergency contact phone">
            <Input name="emergencyContactPhone" type="tel" defaultValue={patient?.emergency_contact_phone ?? ""} />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Notes">
              <textarea
                name="notes"
                defaultValue={patient?.notes ?? ""}
                rows={5}
                className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href={patient ? `/patients/${patient.id}` : "/patients"}>Cancel</Link>
        </Button>
        <SubmitButton className="w-full sm:w-auto">{patient ? "Save patient" : "Create patient"}</SubmitButton>
      </div>
    </form>
  );
}
