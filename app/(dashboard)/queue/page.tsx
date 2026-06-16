import { Ticket } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueueBoard } from "@/components/queue/queue-board";
import { AddToQueueForm } from "@/components/queue/add-to-queue-form";
import type { Doctor, Patient, QueueEntryWithRelations, Service } from "@/types/database";

export const dynamic = "force-dynamic";

const STATUS_ORDER = ["waiting", "called", "serving", "done", "skipped"] as const;

export default async function QueuePage() {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return <AccessCard title="Queue" message="Sign in with a clinic account." />;
  if (!profileHasPermission(profile, "queue:view")) return <AccessCard title="Queue" message="You do not have permission to view the queue." />;

  const clinicId = profile.clinic_id;
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createSupabaseServerClient();

  const [queueResult, patientsResult, doctorsResult, servicesResult] = await Promise.all([
    supabase
      .from("queue_entries")
      .select("*, doctors(id, full_name), services(id, name)")
      .eq("clinic_id", clinicId)
      .eq("queue_date", today)
      .order("queue_number")
      .returns<QueueEntryWithRelations[]>(),
    supabase.from("patients").select("id, full_name").eq("clinic_id", clinicId).order("full_name").returns<Pick<Patient, "id" | "full_name">[]>(),
    supabase.from("doctors").select("id, full_name").eq("clinic_id", clinicId).eq("active", true).returns<Pick<Doctor, "id" | "full_name">[]>(),
    supabase.from("services").select("id, name").eq("clinic_id", clinicId).eq("active", true).returns<Pick<Service, "id" | "name">[]>(),
  ]);

  const entries = queueResult.data ?? [];
  const active   = entries.filter((e) => e.status === "waiting" || e.status === "called" || e.status === "serving");
  const waitingCount = entries.filter((e) => e.status === "waiting" || e.status === "called").length;
  const finished = entries.filter((e) => e.status === "done" || e.status === "skipped");
  const canManage = profileHasPermission(profile, "queue:manage");

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Operations"
        title="Queue Management"
        description={`Walk-in token system for ${new Date(today).toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`}
        icon={Ticket}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-600 px-6 py-4 text-center text-white shadow-md">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Now Serving</p>
              <p className="mt-1 text-4xl font-bold">
                {entries.find((e) => e.status === "serving")?.queue_number ?? "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Waiting</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{waitingCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Done</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{finished.length}</p>
            </div>
          </div>

          <QueueBoard entries={active} canManage={canManage} title="Active Queue" />
          {finished.length > 0 && <QueueBoard entries={finished} canManage={false} title="Completed" muted />}
        </div>

        {canManage && (
          <Card className="h-fit">
            <CardHeader><CardTitle>Add Walk-in</CardTitle></CardHeader>
            <CardContent>
              <AddToQueueForm
                patients={patientsResult.data ?? []}
                doctors={doctorsResult.data ?? []}
                services={servicesResult.data ?? []}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
