import Link from "next/link";
import { CalendarClock, FileText, Pencil, Receipt, Stethoscope } from "lucide-react";
import { ConfirmActionForm } from "@/components/core/confirm-action-form";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deletePatientAction } from "@/server/actions/core";
import { getPatientData } from "@/server/queries/core";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";
import { formatManilaDate, formatManilaDateTime, titleize } from "@/lib/utils/format";
import type { AppointmentStatus, AppointmentWithRelations, ClinicalNote, Invoice, PatientPackage, TreatmentPackage } from "@/types/database";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  booked:      "bg-blue-50 text-blue-700",
  confirmed:   "bg-indigo-50 text-indigo-700",
  checked_in:  "bg-purple-50 text-purple-700",
  in_progress: "bg-yellow-50 text-yellow-700",
  completed:   "bg-green-50 text-green-700",
  cancelled:   "bg-slate-100 text-slate-500",
  no_show:     "bg-red-50 text-red-600",
};

const INV_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent:  "bg-blue-50 text-blue-700",
  paid:  "bg-green-50 text-green-700",
  void:  "bg-red-50 text-red-500",
};

const PKG_BADGE: Record<string, string> = {
  active:    "bg-green-50 text-green-700",
  expired:   "bg-slate-100 text-slate-500",
  exhausted: "bg-blue-50 text-blue-700",
  cancelled: "bg-red-50 text-red-500",
};

function php(centavos: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(centavos / 100);
}

function AppointmentRow({ appt }: { appt: AppointmentWithRelations }) {
  const label = appt.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-800">
          {appt.services?.name ?? "Unknown service"}
        </p>
        <p className="text-xs text-slate-500">
          {formatManilaDateTime(appt.start_at)}
          {appt.doctors ? ` · ${appt.doctors.full_name}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[appt.status]}`}>{label}</span>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/appointments/${appt.id}`}>View</Link>
        </Button>
      </div>
    </div>
  );
}

export default async function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profile = await getCurrentProfile();
    const [data] = await Promise.all([getPatientData(id)]);

    if (!data) {
      return <AccessCard title="Patient unavailable" message="Sign in with a clinic account to view this record." />;
    }

    const { patient, appointments } = data;
    const clinicId = profile?.clinic_id;

    // Fetch invoices, notes, packages for this patient if permissions allow
    let invoices: Invoice[] = [];
    let notes: (ClinicalNote & { appointments: { start_at: string; services: { name: string } | null } | null })[] = [];
    let packages: (PatientPackage & { treatment_packages: Pick<TreatmentPackage, "id" | "name"> | null })[] = [];

    if (clinicId) {
      const supabase = await createSupabaseServerClient();
      const canViewInvoices = profileHasPermission(profile!, "invoices:view");
      const canViewNotes = profileHasPermission(profile!, "notes:view");
      const canViewPkgs = profileHasPermission(profile!, "packages:view");

      const fetches = await Promise.all([
        canViewInvoices
          ? supabase.from("invoices").select("*").eq("clinic_id", clinicId).eq("patient_id", id).order("created_at", { ascending: false }).limit(10).returns<Invoice[]>()
          : Promise.resolve({ data: [] }),
        canViewNotes
          ? supabase.from("clinical_notes").select("*, appointments(start_at, services(name))").eq("clinic_id", clinicId).eq("patient_id", id).order("created_at", { ascending: false }).limit(10)
          : Promise.resolve({ data: [] }),
        canViewPkgs
          ? supabase.from("patient_packages").select("*, treatment_packages(id, name)").eq("clinic_id", clinicId).eq("patient_id", id).order("purchased_at", { ascending: false }).returns<(PatientPackage & { treatment_packages: Pick<TreatmentPackage, "id" | "name"> | null })[]>()
          : Promise.resolve({ data: [] }),
      ]);

      invoices = (fetches[0].data ?? []) as Invoice[];
      notes = (fetches[1].data ?? []) as typeof notes;
      packages = (fetches[2].data ?? []) as typeof packages;
    }

    return (
      <div className="space-y-6">
        <ModuleHeader eyebrow="Patients" title={patient.full_name} description="Patient profile, appointment history, and clinical records." />
        <div className="flex flex-col gap-3 sm:flex-row">
          {data.canManage ? (
            <>
              <Button asChild variant="outline">
                <Link href={`/patients/${patient.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  Edit patient
                </Link>
              </Button>
              <ConfirmActionForm
                action={deletePatientAction}
                id={patient.id}
                label="Delete patient"
                confirmMessage="Delete this patient record? This cannot be undone."
              />
            </>
          ) : null}
          {data.canManage && (
            <Button asChild variant="outline">
              <Link href={`/invoices/new?patientId=${patient.id}`}>
                <Receipt className="h-4 w-4" />
                New invoice
              </Link>
            </Button>
          )}
        </div>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <Card>
            <CardHeader><CardTitle>Contact & Demographics</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail label="Phone" value={patient.phone} />
              <Detail label="Email" value={patient.email ?? "None"} />
              <Detail label="Birth date" value={formatManilaDate(patient.birth_date)} />
              <Detail label="Gender" value={patient.gender ? titleize(patient.gender) : "Not set"} />
              <Detail label="Emergency contact" value={patient.emergency_contact_name ?? "Not set"} />
              <Detail label="Emergency phone" value={patient.emergency_contact_phone ?? "Not set"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Address</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>{patient.address_line_1 ?? "No address line 1"}</p>
              <p>{patient.address_line_2 ?? "No address line 2"}</p>
              <p>{[patient.barangay, patient.city, patient.province, patient.region, patient.postal_code].filter(Boolean).join(", ") || "No locality set"}</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {/* Appointment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-blue-600" />
                Appointment History
                {appointments.length > 0 && (
                  <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{appointments.length}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <p className="text-sm text-slate-500">No appointments on record.</p>
              ) : (
                <div>{appointments.map((appt) => <AppointmentRow key={appt.id} appt={appt} />)}</div>
              )}
            </CardContent>
          </Card>

          {/* Medical Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Medical / Treatment Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-slate-600">
              {patient.notes ?? <span className="text-slate-400">No notes recorded.</span>}
            </CardContent>
          </Card>
        </section>

        {/* Invoices */}
        {invoices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-600" />
                Invoices
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-mono text-xs font-medium text-slate-700">{inv.invoice_number}</p>
                    <p className="text-xs text-slate-400">{new Date(inv.created_at).toLocaleDateString("en-PH")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{php(inv.total_centavos)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${INV_BADGE[inv.status] ?? "bg-slate-100"}`}>{inv.status}</span>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/invoices/${inv.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* SOAP Notes */}
        {notes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-blue-600" />
                Clinical Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100">
              {notes.map((note) => (
                <div key={note.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">
                      {note.appointments?.services?.name ?? "Appointment"} · {note.appointments?.start_at ? formatManilaDate(note.appointments.start_at) : "—"}
                    </p>
                    {note.is_locked && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Locked</span>
                    )}
                  </div>
                  {note.assessment && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">A: {note.assessment}</p>
                  )}
                  {note.plan && (
                    <p className="text-xs text-slate-500 line-clamp-1">P: {note.plan}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Treatment Packages */}
        {packages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-600" />
                Treatment Packages
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100">
              {packages.map((pp) => (
                <div key={pp.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-slate-800">{pp.treatment_packages?.name ?? "Package"}</p>
                    <p className="text-xs text-slate-500">
                      {pp.sessions_used}/{pp.sessions_total} sessions · expires {new Date(pp.expires_at).toLocaleDateString("en-PH")}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PKG_BADGE[pp.status] ?? "bg-slate-100"}`}>{pp.status}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load patient.";
    return <AccessCard title="Patient could not load" message={message} />;
  }
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
