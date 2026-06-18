import { AccessCard } from "@/components/settings/access-card";
import { ServicesClient } from "@/components/services/services-client";
import { getServicesData } from "@/server/queries/core";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  try {
    const data = await getServicesData();

    if (!data) {
      return <AccessCard title="Services unavailable" message="Sign in with a clinic account to view services." />;
    }

    return <ServicesClient services={data.services} canManage={data.canManage} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load services.";
    return <AccessCard title="Services could not load" message={message} />;
  }
}
