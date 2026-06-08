import { ModuleHeader } from "@/components/core/module-header";
import { ServiceForm } from "@/components/core/service-form";
import { AccessCard } from "@/components/settings/access-card";
import { getServiceData } from "@/server/queries/core";

export const dynamic = "force-dynamic";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getServiceData(id);

    if (!data || !data.canManage || !data.service) {
      return <AccessCard title="Edit unavailable" message="Clinic owners can edit services." />;
    }

    return (
      <div className="space-y-6">
        <ModuleHeader eyebrow="Services" title="Edit Service" description="Update duration, PHP pricing, category, color, and booking status." />
        <ServiceForm service={data.service} />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load service.";
    return <AccessCard title="Service could not load" message={message} />;
  }
}
