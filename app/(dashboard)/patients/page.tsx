import { AccessCard } from "@/components/settings/access-card";
import { PatientsClient } from "@/components/patients/patients-client";
import { getPatientsData } from "@/server/queries/core";

export const dynamic = "force-dynamic";

export default async function PatientsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  try {
    const data = await getPatientsData(await searchParams);

    if (!data) {
      return (
        <AccessCard
          title="Patients unavailable"
          message="Sign in with a clinic account to view patient records."
        />
      );
    }

    return <PatientsClient data={data} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load patients.";
    return <AccessCard title="Patients could not load" message={message} />;
  }
}
