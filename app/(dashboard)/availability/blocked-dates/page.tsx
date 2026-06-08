import { Ban } from "lucide-react";
import { BlockedDateForm } from "@/components/core/blocked-date-form";
import { ConfirmActionForm } from "@/components/core/confirm-action-form";
import { EmptyState } from "@/components/core/empty-state";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteBlockedDateAction } from "@/server/actions/core";
import { getAvailabilityData } from "@/server/queries/core";
import { formatManilaDateTime } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function BlockedDatesPage() {
  try {
    const data = await getAvailabilityData();

    if (!data) {
      return <AccessCard title="Blocked dates unavailable" message="Sign in with a clinic account to manage blocked dates." />;
    }

    const doctorNameById = new Map(data.doctors.map((doctor) => [doctor.id, doctor.full_name]));

    return (
      <div className="space-y-6">
        <ModuleHeader
          eyebrow="Scheduling"
          title="Blocked Dates"
          description="Create clinic-wide closures or doctor-specific unavailable periods in Asia/Manila time."
          icon={Ban}
        />
        <BlockedDateForm doctors={data.doctors} canManage={data.canManage} />
        <Card>
          <CardHeader>
            <CardTitle>All Blocked Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.blockedDates.length === 0 ? (
              <EmptyState icon={Ban} title="No blocked dates yet" description="Add holidays, maintenance, staff events, or provider leave to protect appointment slots." />
            ) : (
              data.blockedDates.map((blockedDate) => (
                <div key={blockedDate.id} className="grid gap-3 rounded-2xl border border-border p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <p className="font-semibold text-slate-950">{blockedDate.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {blockedDate.doctor_id ? doctorNameById.get(blockedDate.doctor_id) ?? "Doctor-specific" : "Clinic-wide"} ·{" "}
                      {formatManilaDateTime(blockedDate.start_at)} to {formatManilaDateTime(blockedDate.end_at)}
                    </p>
                    {blockedDate.reason ? <p className="mt-2 text-sm text-slate-600">{blockedDate.reason}</p> : null}
                  </div>
                  {data.canManage ? (
                    <ConfirmActionForm
                      action={deleteBlockedDateAction}
                      id={blockedDate.id}
                      label="Remove"
                      confirmMessage="Remove this blocked date?"
                    />
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load blocked dates.";
    return <AccessCard title="Blocked dates could not load" message={message} />;
  }
}
