import Link from "next/link";
import { Plus, Stethoscope } from "lucide-react";
import { IcalCopyButton } from "@/components/doctors/ical-copy-button";
import { ConfirmActionForm } from "@/components/core/confirm-action-form";
import { EmptyState } from "@/components/core/empty-state";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deactivateDoctorAction } from "@/server/actions/core";
import { getDoctorsData } from "@/server/queries/core";

export const dynamic = "force-dynamic";

export default async function DoctorsPage() {
  try {
    const data = await getDoctorsData();

    if (!data) {
      return <AccessCard title="Doctors unavailable" message="Sign in with a clinic account to view doctors." />;
    }

    return (
      <div className="space-y-6">
        <ModuleHeader
          eyebrow="Clinic Management"
          title="Doctors"
          description="Manage provider profiles, specialties, license details, and appointment availability links."
          action={data.canManage ? { href: "/doctors/new", label: "New doctor", icon: Plus } : undefined}
          icon={Stethoscope}
        />
        {data.doctors.length === 0 ? (
          <EmptyState icon={Stethoscope} title="No doctors yet" description="Add clinic providers so schedules and appointments can be assigned." />
        ) : (
          <section className="grid gap-4 xl:grid-cols-2">
            {data.doctors.map((doctor) => (
              <Card key={doctor.id}>
                <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">{doctor.full_name}</p>
                      <span className={doctor.active ? "rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700" : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"}>
                        {doctor.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{doctor.specialization ?? "No specialization set"}</p>
                    <p className="mt-2 text-sm text-slate-600">{doctor.email ?? "No email"} · {doctor.phone ?? "No phone"}</p>
                    <p className="mt-1 text-xs text-slate-400">License: {doctor.license_no ?? "Not set"}</p>
                    {doctor.ical_token && (
                      <IcalCopyButton token={doctor.ical_token} />
                    )}
                  </div>
                  {data.canManage ? (
                    <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/doctors/${doctor.id}/edit`}>Edit</Link>
                      </Button>
                      <ConfirmActionForm
                        action={deactivateDoctorAction}
                        id={doctor.id}
                        label="Deactivate"
                        confirmMessage="Deactivate this doctor? Existing future scheduling rules may no longer be used."
                        disabled={!doctor.active}
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
    const message = error instanceof Error ? error.message : "Could not load doctors.";
    return <AccessCard title="Doctors could not load" message={message} />;
  }
}
