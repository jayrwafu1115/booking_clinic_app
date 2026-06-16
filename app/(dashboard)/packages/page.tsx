import { Package, Plus } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { EmptyState } from "@/components/core/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageCard } from "@/components/packages/package-card";
import { PackageForm } from "@/components/packages/package-form";
import type { TreatmentPackage, Patient, PatientPackage } from "@/types/database";

export const dynamic = "force-dynamic";

type PatientPackageRow = PatientPackage & { patients: Pick<Patient, "id" | "full_name"> | null };

export default async function PackagesPage() {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return <AccessCard title="Packages" message="Sign in with a clinic account." />;
  if (!profileHasPermission(profile, "packages:view")) return <AccessCard title="Packages" message="You do not have permission to view packages." />;

  const clinicId = profile.clinic_id;
  const supabase = await createSupabaseServerClient();

  const [pkgsResult, patientsResult, soldResult] = await Promise.all([
    supabase.from("treatment_packages").select("*").eq("clinic_id", clinicId).order("name").returns<TreatmentPackage[]>(),
    supabase.from("patients").select("id, full_name").eq("clinic_id", clinicId).order("full_name").returns<Pick<Patient, "id" | "full_name">[]>(),
    supabase.from("patient_packages").select("*, patients(id, full_name)").eq("clinic_id", clinicId).order("purchased_at", { ascending: false }).returns<PatientPackageRow[]>(),
  ]);

  const packages = pkgsResult.data ?? [];
  const patients = patientsResult.data ?? [];
  const soldPackages = soldResult.data ?? [];
  const canManage = profileHasPermission(profile, "packages:manage");

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Billing"
        title="Treatment Packages"
        description="Create session bundles, sell to patients, and track redemptions."
        icon={Package}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {packages.length === 0 ? (
            <EmptyState icon={Package} title="No packages yet" description="Create your first treatment package." />
          ) : (
            packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                patients={patients}
                soldPackages={soldPackages.filter((sp) => sp.package_id === pkg.id)}
                canManage={canManage}
              />
            ))
          )}
        </div>

        {canManage && (
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Package
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PackageForm mode="create" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
