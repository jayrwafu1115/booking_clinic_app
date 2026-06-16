import { Plus, Stethoscope } from "lucide-react";
import { DoctorsTable } from "@/components/doctors/doctors-table";
import { EmptyState } from "@/components/core/empty-state";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { getDoctorsData } from "@/server/queries/core";

export const dynamic = "force-dynamic";

export default async function DoctorsPage() {
  try {
    const data = await getDoctorsData();

    if (!data) {
      return <AccessCard title="Doctors unavailable" message="Sign in with a clinic account to view doctors." />;
    }

    return (
      <div className="space-y-6">
        <ModuleHeader
          eyebrow="Clinic Management"
          title="Doctors"
          description="Manage provider profiles, specialties, license details, and appointment availability links."
          action={data.canManage ? { href: "/doctors/new", label: "New doctor", icon: Plus } : undefined}
          icon={Stethoscope}
        />
        {data.doctors.length === 0 ? (
          <EmptyState icon={Stethoscope} title="No doctors yet" description="Add clinic providers so schedules and appointments can be assigned." />
        ) : (
          <DoctorsTable doctors={data.doctors} />
        )}
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load doctors.";
    return <AccessCard title="Doctors could not load" message={message} />;
  }
}
