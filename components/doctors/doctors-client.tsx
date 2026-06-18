"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Stethoscope } from "lucide-react";
import { EmptyState } from "@/components/core/empty-state";
import { Button } from "@/components/ui/button";
import { DoctorDrawer } from "@/components/doctors/doctor-drawer";
import { DoctorsTable } from "@/components/doctors/doctors-table";
import type { Doctor, Profile } from "@/types/database";

interface DoctorsClientProps {
  doctors: Doctor[];
  doctorProfiles: Profile[];
  canManage: boolean;
}

export function DoctorsClient({ doctors, doctorProfiles, canManage }: DoctorsClientProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDoctor, setDrawerDoctor] = useState<Doctor | undefined>(undefined);

  function openEditDrawer(doctor: Doctor) {
    setDrawerDoctor(doctor);
    setDrawerOpen(true);
  }

  function openNewDrawer() {
    setDrawerDoctor(undefined);
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
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Clinic Management</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">Doctors</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Manage provider profiles, specialties, license details, and appointment availability links.
            </p>
          </div>
        </div>
        {canManage && (
          <Button onClick={openNewDrawer} className="gap-2 flex-shrink-0 self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            New doctor
          </Button>
        )}
      </div>

      {doctors.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No doctors yet"
          description="Add clinic providers so schedules and appointments can be assigned."
        />
      ) : (
        <DoctorsTable doctors={doctors} canManage={canManage} onRowClick={openEditDrawer} />
      )}

      {drawerOpen && (
        <DoctorDrawer
          doctor={drawerDoctor}
          doctorProfiles={doctorProfiles}
          onClose={() => setDrawerOpen(false)}
          onSuccess={handleDrawerSuccess}
        />
      )}
    </div>
  );
}
