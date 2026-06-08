import { PatientForm } from "@/components/core/patient-form";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { getCurrentProfile } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function NewPatientPage() {
  try {
    const profile = await getCurrentProfile();

    if (!profileHasPermission(profile, "patients:manage")) {
      return <AccessCard title="Patient setup unavailable" message="Your current role cannot create patient records." />;
    }

    return (
      <div className="space-y-6">
        <ModuleHeader eyebrow="Patients" title="New Patient" description="Create a tenant-scoped patient profile for appointments and future treatment history." />
        <PatientForm />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load patient form.";
    return <AccessCard title="Patient form could not load" message={message} />;
  }
}
