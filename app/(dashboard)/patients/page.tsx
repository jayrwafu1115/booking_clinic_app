import Link from "next/link";
import { Download, Plus, Search, UserRound } from "lucide-react";
import { EmptyState } from "@/components/core/empty-state";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPatientsData } from "@/server/queries/core";
import { formatManilaDate, titleize } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

function paginationHref(page: number, query: string) {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
  params.set("page", String(page));
  return `/patients?${params.toString()}`;
}

export default async function PatientsPage({ searchParams }: { searchParams?: Promise<{ q?: string; page?: string }> }) {
  try {
    const data = await getPatientsData(await searchParams);

    if (!data) {
      return <AccessCard title="Patients unavailable" message="Sign in with a clinic account to view patient records." />;
    }

    return (
      <div className="space-y-6">
        <ModuleHeader
          eyebrow="Clinic Management"
          title="Patients"
          description="Search and manage patient records for your clinic tenant."
          action={data.canManage ? { href: "/patients/new", label: "New patient", icon: Plus } : undefined}
          icon={UserRound}
        />
        {data.canManage && (
          <div className="flex justify-end">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href="/api/export/patients" download>
                <Download className="h-4 w-4" />
                Export CSV
              </a>
            </Button>
          </div>
        )}

        <Card>
          <CardContent className="p-4">
            <form className="flex flex-col gap-3 sm:flex-row" method="get">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-9" name="q" defaultValue={data.query} placeholder="Search name, phone, or email" />
              </div>
              <Button type="submit">Search</Button>
            </form>
          </CardContent>
        </Card>

        {data.patients.length === 0 ? (
          <EmptyState icon={UserRound} title="No patients found" description="Create your first patient record or adjust the search terms." />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.patients.map((patient) => (
                <Link key={patient.id} href={`/patients/${patient.id}`} className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Card className="h-full transition-colors hover:border-blue-200">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{patient.full_name}</p>
                          <p className="mt-1 text-sm text-slate-500">{patient.phone}</p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {patient.gender ? titleize(patient.gender) : "Patient"}
                        </span>
                      </div>
                      <p className="mt-4 text-sm text-slate-500">{patient.email ?? "No email on file"}</p>
                      <p className="mt-2 text-xs text-slate-400">Created {formatManilaDate(patient.created_at)}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Patient Table</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.14em] text-slate-400">
                    <tr className="border-b border-border">
                      <th className="py-3 pr-4 font-semibold">Name</th>
                      <th className="py-3 pr-4 font-semibold">Phone</th>
                      <th className="py-3 pr-4 font-semibold">Email</th>
                      <th className="py-3 pr-4 font-semibold">Birth Date</th>
                      <th className="py-3 pr-4 font-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.patients.map((patient) => (
                      <tr key={patient.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4 font-medium text-slate-950">
                          <Link className="text-blue-600 hover:text-blue-700" href={`/patients/${patient.id}`}>
                            {patient.full_name}
                          </Link>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{patient.phone}</td>
                        <td className="py-3 pr-4 text-slate-600">{patient.email ?? "None"}</td>
                        <td className="py-3 pr-4 text-slate-600">{formatManilaDate(patient.birth_date)}</td>
                        <td className="py-3 pr-4 text-slate-600">{formatManilaDate(patient.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page {data.page} of {data.totalPages} · {data.total} patients
              </p>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link aria-disabled={data.page <= 1} href={paginationHref(Math.max(data.page - 1, 1), data.query)}>
                    Previous
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link aria-disabled={data.page >= data.totalPages} href={paginationHref(Math.min(data.page + 1, data.totalPages), data.query)}>
                    Next
                  </Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load patients.";
    return <AccessCard title="Patients could not load" message={message} />;
  }
}
