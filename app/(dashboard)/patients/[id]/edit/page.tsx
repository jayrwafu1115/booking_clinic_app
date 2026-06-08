import { PatientForm } from "@/components/core/patient-form";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { getPatientData } from "@/server/queries/core";

export const dynamic = "force-dynamic";

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getPatientData(id);

    if (!data || !data.canManage) {
      return <AccessCard title="Edit unavailable" message="You do not have permission to edit this patient." />;
    }

    return (
      <div className="space-y-6">
        <ModuleHeader eyebrow="Patients" title="Edit Patient" description="Update contact, demographic, emergency, and note fields." />
        <PatientForm patient={data.patient} />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load patient.";
    return <AccessCard title="Patient could not load" message={message} />;
  }
}
