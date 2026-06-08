import { ModuleHeader } from "@/components/core/module-header";
import { ServiceForm } from "@/components/core/service-form";
import { AccessCard } from "@/components/settings/access-card";
import { getServiceData } from "@/server/queries/core";

export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  try {
    const data = await getServiceData();

    if (!data || !data.canManage) {
      return <AccessCard title="Service setup unavailable" message="Clinic owners can create services." />;
    }

    return (
      <div className="space-y-6">
        <ModuleHeader eyebrow="Services" title="New Service" description="Create a bookable clinic service with duration and PHP pricing." />
        <ServiceForm />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load service form.";
    return <AccessCard title="Service form could not load" message={message} />;
  }
}
