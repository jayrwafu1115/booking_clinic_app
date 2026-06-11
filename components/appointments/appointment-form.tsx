"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/core/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { APPOINTMENT_SOURCES } from "@/lib/constants/appointments";
import { titleize } from "@/lib/utils/format";
import { utcIsoToManilaLocalInput } from "@/lib/utils/manila-time";
import { createAppointmentAction, updateAppointmentAction } from "@/server/actions/appointments";
import type { AppointmentWithRelations, Doctor, Patient, Service } from "@/types/database";

export function AppointmentForm({
  appointment,
  patients,
  doctors,
  services
}: {
  appointment?: AppointmentWithRelations | null;
  patients: Patient[];
  doctors: Doctor[];
  services: Service[];
}) {
  const action = appointment ? updateAppointmentAction : createAppointmentAction;
  const [state, formAction] = useActionState(action, {});
  const router = useRouter();
  const [serviceId, setServiceId] = useState(appointment?.service_id ?? services[0]?.id ?? "");
  const selectedService = useMemo(() => services.find((service) => service.id === serviceId), [serviceId, services]);

  return (
    <form action={formAction} className="space-y-5">
      {appointment ? <input type="hidden" name="id" value={appointment.id} /> : null}
      <AuthStatus message={state.message} success={state.success} />
      <Card>
        <CardHeader>
          <CardTitle>Appointment Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField label="Patient">
            <select
              name="patientId"
              defaultValue={appointment?.patient_id ?? ""}
              required
              className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-100"
            >
              <option value="">Select patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.full_name} · {patient.phone}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Doctor">
            <select
              name="doctorId"
              defaultValue={appointment?.doctor_id ?? ""}
              className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-100"
            >
              <option value="">No doctor assigned</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.full_name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Service">
            <select
              name="serviceId"
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
              required
              className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-100"
            >
              <option value="">Select service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {service.duration_minutes} min
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Start time">
            <Input
              name="startAt"
              type="datetime-local"
              defaultValue={appointment ? utcIsoToManilaLocalInput(appointment.start_at) : ""}
              required
            />
          </FormField>
          <FormField label="Source">
            <select
              name="source"
              defaultValue={appointment?.source ?? "manual"}
              className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-100"
            >
              {APPOINTMENT_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {titleize(source)}
                </option>
              ))}
            </select>
          </FormField>
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold text-slate-950">Calculated duration</p>
            <p className="mt-1 text-sm text-slate-500">
              {selectedService ? `${selectedService.duration_minutes} minutes from selected service` : "Select a service"}
            </p>
          </div>
          <div className="md:col-span-2">
            <FormField label="Notes">
              <textarea
                name="notes"
                defaultValue={appointment?.notes ?? ""}
                rows={4}
                className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </FormField>
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => appointment ? router.back() : router.push("/appointments")}>
          Cancel
        </Button>
        <SubmitButton className="w-full sm:w-auto">{appointment ? "Save appointment" : "Create appointment"}</SubmitButton>
      </div>
    </form>
  );
}
