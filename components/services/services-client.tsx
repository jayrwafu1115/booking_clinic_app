"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ListChecks, Plus } from "lucide-react";
import { EmptyState } from "@/components/core/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceDrawer } from "@/components/services/service-drawer";
import { ServicesTable } from "@/components/services/services-table";
import type { Service } from "@/types/database";

interface ServicesClientProps {
  services: Service[];
  canManage: boolean;
}

const dentalExamples = [
  "Dental Consultation",
  "Oral Prophylaxis / Dental Cleaning",
  "Tooth Extraction",
  "Tooth Filling",
  "Root Canal Treatment",
  "Teeth Whitening",
  "Braces Consultation"
];

const medicalExamples = [
  "General Consultation",
  "Follow-up Checkup",
  "Laboratory Review",
  "Vaccination",
  "Minor Procedure"
];

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

export function ServicesClient({ services, canManage }: ServicesClientProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerService, setDrawerService] = useState<Service | undefined>(undefined);

  function openEditDrawer(service: Service) {
    setDrawerService(service);
    setDrawerOpen(true);
  }

  function openNewDrawer() {
    setDrawerService(undefined);
    setDrawerOpen(true);
  }

  function handleDrawerSuccess() {
    setDrawerOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-2xl bg-blue-50 p-3 text-blue-600">
            <ListChecks className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Clinic Management</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">Services</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Configure durations, PHP pricing stored as centavos, categories, colors, and online booking availability.
            </p>
          </div>
        </div>
        {canManage && (
          <Button onClick={openNewDrawer} className="gap-2 flex-shrink-0 self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            New service
          </Button>
        )}
      </div>

      {services.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            icon={ListChecks}
            title="No services yet"
            description="Create services so appointments can later reserve the correct duration and price."
          />
          <section className="grid gap-4 lg:grid-cols-2">
            <ExampleList title="Dental examples" items={dentalExamples} />
            <ExampleList title="Medical examples" items={medicalExamples} />
          </section>
        </div>
      ) : (
        <ServicesTable services={services} canManage={canManage} onRowClick={openEditDrawer} />
      )}

      {drawerOpen && (
        <ServiceDrawer
          service={drawerService}
          onClose={() => setDrawerOpen(false)}
          onSuccess={handleDrawerSuccess}
        />
      )}
    </div>
  );
}
