import Link from "next/link";
import { ArrowLeft, ListChecks, Pencil } from "lucide-react";
import { ConfirmActionForm } from "@/components/core/confirm-action-form";
import { AccessCard } from "@/components/settings/access-card";
import { Button } from "@/components/ui/button";
import { deactivateServiceAction } from "@/server/actions/core";
import { getServiceData } from "@/server/queries/core";
import { formatPesoFromCentavos } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function ServiceViewPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getServiceData(id);

    if (!data || !data.service) {
      return <AccessCard title="Service not found" message="This service does not exist or you do not have access." />;
    }

    const service = data.service;

    return (
      <div className="space-y-6">
        {/* Back + actions */}
        <div className="flex items-center justify-between gap-4">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-slate-500 hover:text-slate-900 -ml-2">
            <Link href="/services">
              <ArrowLeft className="h-4 w-4" />
              Back to Services
            </Link>
          </Button>
          {data.canManage && (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href={`/services/${service.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <ConfirmActionForm
                action={deactivateServiceAction}
                id={service.id}
                label="Deactivate"
                confirmMessage="Deactivate this service? Patients will no longer be able to book it online."
                disabled={!service.active}
              />
            </div>
          )}
        </div>

        {/* Profile header */}
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${service.color}20` }}
          >
            <ListChecks className="h-7 w-7" style={{ color: service.color }} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-950">{service.name}</h1>
              <span className={service.active
                ? "rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700"
                : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"
              }>
                {service.active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-1 text-slate-500">{service.category ?? "Uncategorized"}</p>
          </div>
        </div>

        {service.description && (
          <p className="text-sm text-slate-600">{service.description}</p>
        )}

        {/* Details card */}
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <div className="border-b border-border bg-slate-50/60 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Service Details</p>
          </div>
          <div className="divide-y divide-border">
            <DetailRow label="Price" value={formatPesoFromCentavos(service.price_centavos)} />
            <DetailRow label="Duration" value={`${service.duration_minutes} minutes`} />
            <DetailRow label="Category" value={service.category ?? "Uncategorized"} />
            <DetailRow label="Online Booking" value={service.online_booking_enabled ? "Enabled" : "Disabled (front desk only)"} />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load service.";
    return <AccessCard title="Service could not load" message={message} />;
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-6 px-5 py-3.5">
      <span className="w-36 flex-shrink-0 text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}
