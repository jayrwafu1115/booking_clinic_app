import { ClipboardList } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ModuleHeader } from "@/components/core/module-header";
import { Card, CardContent } from "@/components/ui/card";
import { WaitlistActions } from "@/components/appointments/waitlist-actions";
import { AddToWaitlistForm } from "@/components/appointments/add-to-waitlist-form";

export const dynamic = "force-dynamic";

type WaitlistEntry = {
  id: string;
  patient_name: string;
  patient_phone: string;
  patient_email: string | null;
  preferred_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  notified_at: string | null;
  services: { name: string } | null;
  doctors: { full_name: string } | null;
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  waiting:  { label: "Waiting",  className: "bg-blue-50 text-blue-700 ring-blue-200" },
  notified: { label: "Notified", className: "bg-green-50 text-green-700 ring-green-200" },
  booked:   { label: "Booked",   className: "bg-slate-100 text-slate-600 ring-slate-200" },
  expired:  { label: "Expired",  className: "bg-red-50 text-red-600 ring-red-200" },
};

export default async function WaitlistPage() {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("appointment_waitlist")
    .select("*, services(name), doctors(full_name)")
    .eq("clinic_id", profile.clinic_id)
    .in("status", ["waiting", "notified"])
    .order("created_at", { ascending: true })
    .returns<WaitlistEntry[]>();

  const entries = data ?? [];

  return (
    <div className="space-y-8">
      <ModuleHeader
        eyebrow="Appointments"
        title="Waitlist"
        description="Patients waiting for an available slot. Notify them when a cancellation opens up."
        icon={ClipboardList}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Waitlist entries */}
        <div className="space-y-3">
          {entries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <ClipboardList className="h-10 w-10 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">No one on the waitlist</p>
                <p className="text-xs text-slate-500">Use the form to add a patient who wants the next available slot.</p>
              </CardContent>
            </Card>
          ) : (
            entries.map((entry) => {
              const meta = STATUS_LABEL[entry.status] ?? STATUS_LABEL.waiting;
              return (
                <Card key={entry.id}>
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900">{entry.patient_name}</p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${meta.className}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                        <span>📞 {entry.patient_phone}</span>
                        {entry.patient_email && <span>✉️ {entry.patient_email}</span>}
                        {entry.services?.name && <span>Service: {entry.services.name}</span>}
                        {entry.doctors?.full_name && <span>Doctor: {entry.doctors.full_name}</span>}
                        {entry.preferred_date && <span>Preferred: {entry.preferred_date}</span>}
                      </div>
                      {entry.notes && (
                        <p className="mt-1.5 text-xs text-slate-500 italic">{entry.notes}</p>
                      )}
                    </div>
                    <WaitlistActions entryId={entry.id} status={entry.status} />
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Add to waitlist form */}
        <div>
          <AddToWaitlistForm />
        </div>
      </div>
    </div>
  );
}
