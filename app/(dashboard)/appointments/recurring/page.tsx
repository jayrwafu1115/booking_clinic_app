import { RefreshCw } from "lucide-react";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { RecurringAppointmentForm } from "@/components/appointments/recurring-appointment-form";
import { getAppointmentOptions } from "@/server/queries/appointments";

export const dynamic = "force-dynamic";

export default async function RecurringAppointmentPage() {
  try {
    const data = await getAppointmentOptions();
    if (!data?.canManage) return <AccessCard title="Recurring Appointments" message="You do not have permission to manage appointments." />;

    return (
      <div className="space-y-6">
        <ModuleHeader
          eyebrow="Appointments"
          title="New Recurring Series"
          description="Schedule a repeating appointment series — weekly, biweekly, or monthly."
          icon={RefreshCw}
        />
        <RecurringAppointmentForm patients={data.patients} doctors={data.doctors} services={data.services} />
      </div>
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load recurring form.";
    return <AccessCard title="Recurring Appointments" message={msg} />;
  }
}
