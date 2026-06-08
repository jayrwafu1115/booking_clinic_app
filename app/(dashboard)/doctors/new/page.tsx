import { DoctorForm } from "@/components/core/doctor-form";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { getDoctorData } from "@/server/queries/core";

export const dynamic = "force-dynamic";

export default async function NewDoctorPage() {
  try {
    const data = await getDoctorData();

    if (!data || !data.canManage) {
      return <AccessCard title="Doctor setup unavailable" message="Clinic owners can create doctor records." />;
    }

    return (
      <div className="space-y-6">
        <ModuleHeader eyebrow="Doctors" title="New Doctor" description="Create a provider profile for scheduling and availability." />
        <DoctorForm doctorProfiles={data.doctorProfiles} />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load doctor form.";
    return <AccessCard title="Doctor form could not load" message={message} />;
  }
}
