import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { getAllClinicsAdmin } from "@/server/queries/super-admin";
import { ClinicsTable } from "@/components/admin/clinics-table";

export default async function AdminClinicsPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") redirect("/dashboard");

  const clinics = await getAllClinicsAdmin();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
          <Building2 className="h-5 w-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Clinics</h1>
          <p className="text-sm text-slate-500">{clinics.length.toLocaleString()} clinics on the platform</p>
        </div>
      </div>

      <ClinicsTable clinics={clinics} />
    </div>
  );
}
