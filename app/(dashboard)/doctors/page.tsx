import { AccessCard } from "@/components/settings/access-card";
import { DoctorsClient } from "@/components/doctors/doctors-client";
import { getDoctorsData } from "@/server/queries/core";

export const dynamic = "force-dynamic";

export default async function DoctorsPage() {
  try {
    const data = await getDoctorsData();

    if (!data) {
      return <AccessCard title="Doctors unavailable" message="Sign in with a clinic account to view doctors." />;
    }

    return (
      <DoctorsClient
        doctors={data.doctors}
        doctorProfiles={data.doctorProfiles}
        canManage={data.canManage}
      />
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load doctors.";
    return <AccessCard title="Doctors could not load" message={message} />;
  }
}
