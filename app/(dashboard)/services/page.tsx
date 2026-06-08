import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import { ConfirmActionForm } from "@/components/core/confirm-action-form";
import { EmptyState } from "@/components/core/empty-state";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deactivateServiceAction } from "@/server/actions/core";
import { getServicesData } from "@/server/queries/core";
import { formatPesoFromCentavos } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const dentalExamples = [
  "Dental Consultation",
  "Oral Prophylaxis / Dental Cleaning",
  "Tooth Extraction",
  "Tooth Filling",
  "Root Canal Treatment",
  "Teeth Whitening",
  "Braces Consultation"
];

const medicalExamples = ["General Consultation", "Follow-up Checkup", "Laboratory Review", "Vaccination", "Minor Procedure"];

export default async function ServicesPage() {
  try {
    const data = await getServicesData();

    if (!data) {
      return <AccessCard title="Services unavailable" message="Sign in with a clinic account to view services." />;
    }

    return (
      <div className="space-y-6">
        <ModuleHeader
          eyebrow="Clinic Management"
          title="Services"
          description="Configure durations, PHP pricing stored as centavos, categories, colors, and online booking availability."
          action={data.canManage ? { href: "/services/new", label: "New service", icon: Plus } : undefined}
          icon={ListChecks}
        />

        {data.services.length === 0 ? (
          <div className="space-y-4">
            <EmptyState icon={ListChecks} title="No services yet" description="Create services so appointments can later reserve the correct duration and price." />
            <section className="grid gap-4 lg:grid-cols-2">
              <ExampleList title="Dental examples" items={dentalExamples} />
              <ExampleList title="Medical examples" items={medicalExamples} />
            </section>
          </div>
        ) : (
          <section className="grid gap-4 xl:grid-cols-2">
            {data.services.map((service) => (
              <Card key={service.id}>
                <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: service.color }} />
                      <p className="font-semibold text-slate-950">{service.name}</p>
                      <span className={service.active ? "rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700" : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"}>
                        {service.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{service.category ?? "Uncategorized"} · {service.duration_minutes} minutes</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{formatPesoFromCentavos(service.price_centavos)}</p>
                    <p className="mt-1 text-xs text-slate-400">{service.online_booking_enabled ? "Online booking enabled" : "Front desk only"}</p>
                  </div>
                  {data.canManage ? (
                    <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/services/${service.id}/edit`}>Edit</Link>
                      </Button>
                      <ConfirmActionForm
                        action={deactivateServiceAction}
                        id={service.id}
                        label="Deactivate"
                        confirmMessage="Deactivate this service? Patients will no longer be able to book it online."
                        disabled={!service.active}
                      />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load services.";
    return <AccessCard title="Services could not load" message={message} />;
  }
}

function ExampleList({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {item}
          </span>
        ))}
      </CardContent>
    </Card>
  );
}
