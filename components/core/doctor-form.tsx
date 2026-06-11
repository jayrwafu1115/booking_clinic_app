"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/core/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createDoctorAction, updateDoctorAction } from "@/server/actions/core";
import type { Doctor, Profile } from "@/types/database";

export function DoctorForm({ doctor, doctorProfiles }: { doctor?: Doctor | null; doctorProfiles: Profile[] }) {
  const action = doctor ? updateDoctorAction : createDoctorAction;
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      {doctor ? <input type="hidden" name="id" value={doctor.id} /> : null}
      <AuthStatus message={state.message} success={state.success} />
      <Card>
        <CardHeader>
          <CardTitle>Doctor Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField label="Linked doctor profile">
            <select
              name="profileId"
              defaultValue={doctor?.profile_id ?? ""}
              className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-100"
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
          <FormField label="Avatar URL">
            <Input name="avatarUrl" defaultValue={doctor?.avatar_url ?? ""} placeholder="https://..." />
          </FormField>
          <label className="flex h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm font-medium text-slate-700">
            <input name="active" type="checkbox" defaultChecked={doctor?.active ?? true} className="rounded border-slate-300 text-blue-600" />
            Active
          </label>
        </CardContent>
      </Card>
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href={doctor ? `/doctors/${doctor.id}` : "/doctors"}>Cancel</Link>
        </Button>
        <SubmitButton className="w-full sm:w-auto">{doctor ? "Save doctor" : "Create doctor"}</SubmitButton>
      </div>
    </form>
  );
}
