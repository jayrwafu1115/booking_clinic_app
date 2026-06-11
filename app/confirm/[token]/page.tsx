import { CalendarClock, CheckCircle, XCircle } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatManilaDateTime } from "@/lib/utils/format";
import type { Appointment, Clinic, Doctor, Patient, Service } from "@/types/database";

type ConfirmPageProps = {
  params: Promise<{ token: string }>;
};

type AppointmentRow = Appointment & {
  patients: Pick<Patient, "full_name" | "phone" | "email"> | null;
  doctors: Pick<Doctor, "full_name"> | null;
  services: Pick<Service, "name" | "duration_minutes" | "price_centavos"> | null;
  clinics: Pick<Clinic, "name" | "phone" | "email" | "address_line_1" | "city" | "province"> | null;
};

export default async function ConfirmPage({ params }: ConfirmPageProps) {
  const { token } = await params;

  const supabase = createSupabaseAdminClient();
  const { data: appointment } = await supabase
    .from("appointments")
    .select("*, patients(full_name, phone, email), doctors(full_name), services(name, duration_minutes, price_centavos), clinics(name, phone, email, address_line_1, city, province)")
    .eq("confirmation_token", token)
    .maybeSingle<AppointmentRow>();

  if (!appointment) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h1 className="text-lg font-semibold text-slate-900">Appointment not found</h1>
          <p className="mt-2 text-sm text-slate-500">This confirmation link is invalid or has expired.</p>
        </div>
      </main>
    );
  }

  const clinic = appointment.clinics;
  const clinicAddress = [clinic?.address_line_1, clinic?.city, clinic?.province].filter(Boolean).join(", ");

  const statusColor: Record<string, string> = {
    booked: "text-blue-700 bg-blue-50 ring-blue-200",
    confirmed: "text-emerald-700 bg-emerald-50 ring-emerald-200",
    cancelled: "text-red-700 bg-red-50 ring-red-200",
    completed: "text-slate-700 bg-slate-50 ring-slate-200",
    no_show: "text-orange-700 bg-orange-50 ring-orange-200",
  };

  const statusLabel: Record<string, string> = {
    booked: "Booked",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    completed: "Completed",
    no_show: "No Show",
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
          <h1 className="text-xl font-bold text-slate-900">Appointment Details</h1>
          <p className="mt-1 text-sm text-slate-500">{clinic?.name}</p>
        </div>

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Booking Info</p>
          </div>
          <dl className="divide-y divide-slate-100">
            <Row label="Status">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${statusColor[appointment.status] ?? "text-slate-700 bg-slate-50 ring-slate-200"}`}>
                {statusLabel[appointment.status] ?? appointment.status}
              </span>
            </Row>
            <Row label="Service">{appointment.services?.name ?? "—"}</Row>
            <Row label="Date & Time">{formatManilaDateTime(appointment.start_at)}</Row>
            {appointment.doctors?.full_name && <Row label="Doctor">{appointment.doctors.full_name}</Row>}
            <Row label="Patient">{appointment.patients?.full_name ?? "—"}</Row>
          </dl>
        </div>

        {clinic && (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clinic Contact</p>
            </div>
            <dl className="divide-y divide-slate-100">
              <Row label="Clinic">{clinic.name}</Row>
              {clinicAddress && <Row label="Address">{clinicAddress}</Row>}
              {clinic.phone && <Row label="Phone">{clinic.phone}</Row>}
              {clinic.email && <Row label="Email">{clinic.email}</Row>}
            </dl>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <CalendarClock className="h-3.5 w-3.5" />
          ClinicFlow AI PH — automated booking confirmation
        </div>
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 px-5 py-3">
      <dt className="w-28 shrink-0 text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="flex-1 text-sm text-slate-900">{children}</dd>
    </div>
  );
}
