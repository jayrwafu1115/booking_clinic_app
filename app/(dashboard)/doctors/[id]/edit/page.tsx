import { DoctorForm } from "@/components/core/doctor-form";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { getDoctorData } from "@/server/queries/core";

export const dynamic = "force-dynamic";

export default async function EditDoctorPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getDoctorData(id);

    if (!data || !data.canManage || !data.doctor) {
      return <AccessCard title="Edit unavailable" message="Clinic owners can edit doctor records." />;
    }

    return (
      <div className="space-y-6">
        <ModuleHeader eyebrow="Doctors" title="Edit Doctor" description="Update provider profile, license, and active status." />
        <DoctorForm doctor={data.doctor} doctorProfiles={data.doctorProfiles} />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load doctor.";
    return <AccessCard title="Doctor could not load" message={message} />;
  }
}
