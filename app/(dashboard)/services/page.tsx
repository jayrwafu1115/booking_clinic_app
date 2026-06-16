import { ListChecks, Plus } from "lucide-react";
import { ServicesTable } from "@/components/services/services-table";
import { EmptyState } from "@/components/core/empty-state";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServicesData } from "@/server/queries/core";

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
          <ServicesTable services={data.services} />
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
