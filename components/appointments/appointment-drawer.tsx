"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormField } from "@/components/core/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  APPOINTMENT_SOURCES,
  APPOINTMENT_STATUS_META,
  STATUS_TRANSITIONS,
} from "@/lib/constants/appointments";
import { titleize } from "@/lib/utils/format";
import { utcIsoToManilaLocalInput } from "@/lib/utils/manila-time";
import { getNoteByAppointment } from "@/server/queries/notes";
import {
  createAppointmentDrawerAction,
  updateAppointmentDrawerAction,
  updateAppointmentStatusAction,
} from "@/server/actions/appointments";
import { upsertClinicalNoteAction, lockClinicalNoteAction } from "@/server/actions/notes";
import type { AppointmentWithRelations, ClinicalNote, Doctor, Patient, Service } from "@/types/database";

type DrawerView = "details" | "status" | "soap";

interface AppointmentDrawerProps {
  appointment?: AppointmentWithRelations;
  patients: Patient[];
  doctors: Doctor[];
  services: Service[];
  canManage: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TABS: { id: DrawerView; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "status",  label: "Status" },
  { id: "soap",    label: "SOAP Notes" },
];

export function AppointmentDrawer({
  appointment,
  patients,
  doctors,
  services,
  canManage,
  onClose,
  onSuccess,
}: AppointmentDrawerProps) {
  const isNew = !appointment;
  const statusMeta = appointment ? APPOINTMENT_STATUS_META[appointment.status] : null;

  // ── View state ────────────────────────────────────────────────────────────
  const [view, setView] = useState<DrawerView>("details");

  // ── Details form ──────────────────────────────────────────────────────────
  const detailsAction = isNew ? createAppointmentDrawerAction : updateAppointmentDrawerAction;
  const [detailsState, detailsFormAction] = useActionState(detailsAction, {});
  const [serviceId, setServiceId] = useState(appointment?.service_id ?? services[0]?.id ?? "");
  const selectedService = useMemo(() => services.find((s) => s.id === serviceId), [serviceId, services]);

  // ── Status form ───────────────────────────────────────────────────────────
  const [statusState, statusFormAction] = useActionState(updateAppointmentStatusAction, {});
  const availableTransitions = appointment ? STATUS_TRANSITIONS[appointment.status] : [];

  // ── SOAP state ────────────────────────────────────────────────────────────
  const [soapData, setSoapData] = useState<{ note: ClinicalNote | null; canManage: boolean } | null>(null);
  const [soapLoading, setSoapLoading] = useState(false);
  const [upsertState, upsertFormAction] = useActionState(upsertClinicalNoteAction, {});
  const [lockState, lockFormAction] = useActionState(lockClinicalNoteAction, {});

  // ── Success callbacks ─────────────────────────────────────────────────────
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (detailsState.success) onSuccessRef.current();
  }, [detailsState.success]);

  useEffect(() => {
    if (statusState.success) onSuccessRef.current();
  }, [statusState.success]);

  // ── Load SOAP note lazily when tab is first opened ────────────────────────
  function handleTabChange(tab: DrawerView) {
    setView(tab);
    if (tab === "soap" && !soapData && appointment) {
      setSoapLoading(true);
      getNoteByAppointment(appointment.id).then((result) => {
        setSoapData(result ?? { note: null, canManage: false });
        setSoapLoading(false);
      });
    }
  }

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent>
        {/* ── Header ────────────────────────────────────────────────────── */}
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate">
                {isNew ? "New Appointment" : (appointment.patients?.full_name ?? "Appointment")}
              </SheetTitle>
              {appointment && (
                <p className="font-mono text-xs text-slate-400 mt-0.5">
                  #{appointment.id.slice(0, 8).toUpperCase()}
                </p>
              )}
            </div>
            {isNew ? (
              <span className="inline-flex flex-shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                New
              </span>
            ) : statusMeta ? (
              <span
                className="inline-flex flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${statusMeta.color}18`, color: statusMeta.color }}
              >
                {statusMeta.label}
              </span>
            ) : null}
          </div>
        </SheetHeader>

        {/* ── Tab bar (existing appointments only) ──────────────────────── */}
        {!isNew && (
          <div className="flex border-b border-border px-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  view === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Details view ──────────────────────────────────────────────── */}
        {view === "details" && (
          <form action={detailsFormAction} className="flex min-h-0 flex-1 flex-col">
            {appointment && <input type="hidden" name="id" value={appointment.id} />}

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <AuthStatus message={detailsState.message} success={detailsState.success} />

              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Appointment Details</p>

                <FormField label="Patient">
                  <select
                    name="patientId"
                    defaultValue={appointment?.patient_id ?? ""}
                    required
                    className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100"
                  >
                    <option value="">Select patient</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} · {p.phone}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Service">
                  <select
                    name="serviceId"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    required
                    className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100"
                  >
                    <option value="">Select service</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.duration_minutes} min
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Doctor">
                  <select
                    name="doctorId"
                    defaultValue={appointment?.doctor_id ?? ""}
                    className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100"
                  >
                    <option value="">No doctor assigned</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>{d.full_name}</option>
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
                    className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100"
                  >
                    {APPOINTMENT_SOURCES.map((src) => (
                      <option key={src} value={src}>{titleize(src)}</option>
                    ))}
                  </select>
                </FormField>

                {selectedService && (
                  <div className="rounded-xl border border-border bg-slate-50 px-3 py-2.5">
                    <p className="text-xs text-slate-500">
                      Duration:{" "}
                      <span className="font-medium text-slate-700">{selectedService.duration_minutes} minutes</span>
                    </p>
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Notes</p>
                <textarea
                  name="notes"
                  defaultValue={appointment?.notes ?? ""}
                  rows={4}
                  placeholder="Optional notes about this appointment..."
                  className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100 resize-none"
                />
              </section>
            </div>

            <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-4">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <SubmitButton className="w-auto px-5">
                {isNew ? "Create appointment" : "Save changes"}
              </SubmitButton>
            </div>
          </form>
        )}

        {/* ── Status view ───────────────────────────────────────────────── */}
        {view === "status" && appointment && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="rounded-xl border border-border bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Current status</p>
                <p className="mt-0.5 text-sm font-semibold" style={{ color: statusMeta?.color }}>
                  {statusMeta?.label ?? appointment.status}
                </p>
              </div>

              {availableTransitions.length === 0 ? (
                <p className="text-sm text-slate-500">No further status transitions are available.</p>
              ) : (
                <form action={statusFormAction} className="space-y-3">
                  <input type="hidden" name="id" value={appointment.id} />
                  <AuthStatus message={statusState.message} success={statusState.success} />

                  <FormField label="New status">
                    <select
                      name="status"
                      defaultValue={availableTransitions[0]}
                      className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100"
                    >
                      {availableTransitions.map((s) => (
                        <option key={s} value={s}>
                          {APPOINTMENT_STATUS_META[s].label}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Cancellation reason">
                    <textarea
                      name="cancellationReason"
                      rows={3}
                      placeholder="Required when cancelling..."
                      className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100 resize-none"
                    />
                  </FormField>

                  <div className="flex items-center justify-end pt-1">
                    <SubmitButton className="w-auto px-5">Update status</SubmitButton>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ── SOAP view ─────────────────────────────────────────────────── */}
        {view === "soap" && appointment && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {soapLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : (
                <>
                  {soapData?.note?.is_locked && (
                    <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800 ring-1 ring-amber-200">
                      This note is locked and cannot be edited.
                    </div>
                  )}

                  <form action={upsertFormAction} className="space-y-4">
                    <input type="hidden" name="appointmentId" value={appointment.id} />
                    <input type="hidden" name="patientId" value={appointment.patient_id} />
                    {appointment.doctor_id && (
                      <input type="hidden" name="doctorId" value={appointment.doctor_id} />
                    )}
                    <AuthStatus message={upsertState.message} success={upsertState.success} />

                    {(["subjective", "objective", "assessment", "plan"] as const).map((field) => (
                      <div key={field} className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          {field === "subjective" ? "S — Subjective"
                           : field === "objective" ? "O — Objective"
                           : field === "assessment" ? "A — Assessment"
                           : "P — Plan"}
                        </label>
                        <Textarea
                          name={field}
                          rows={3}
                          readOnly={!canManage || (soapData?.note?.is_locked ?? false)}
                          defaultValue={soapData?.note?.[field] ?? ""}
                          placeholder={
                            field === "subjective" ? "Patient's complaints, symptoms..."
                            : field === "objective" ? "Measurable findings: vitals, exam results..."
                            : field === "assessment" ? "Diagnosis / clinical impression..."
                            : "Treatment plan, medications, follow-up..."
                          }
                          className={!canManage || (soapData?.note?.is_locked ?? false) ? "cursor-default opacity-70" : ""}
                        />
                      </div>
                    ))}

                    {canManage && !(soapData?.note?.is_locked) && (
                      <div className="flex items-center justify-end pt-1">
                        <SubmitButton className="w-auto px-5">Save note</SubmitButton>
                      </div>
                    )}
                  </form>

                  {soapData?.note && !soapData.note.is_locked && canManage && (
                    <div className="border-t border-dashed border-slate-200 pt-4">
                      <form action={lockFormAction} className="flex items-center gap-3">
                        <input type="hidden" name="noteId" value={soapData.note.id} />
                        <AuthStatus message={lockState.message} success={lockState.success} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-amber-700 hover:border-amber-300 hover:bg-amber-50 transition-colors"
                        >
                          Lock note
                        </button>
                        <p className="text-xs text-slate-400">Locked notes cannot be edited.</p>
                      </form>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
