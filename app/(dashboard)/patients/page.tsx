import Link from "next/link";
import { ChevronRight, Download, Plus, Search, UserRound } from "lucide-react";
import { EmptyState } from "@/components/core/empty-state";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPatientsData } from "@/server/queries/core";
import { formatManilaDate, titleize } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

function paginationHref(page: number, query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
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

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <form className="relative flex-1 max-w-sm" method="get">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" name="q" defaultValue={data.query} placeholder="Search name, phone, or email…" />
          </form>
          {data.canManage && (
            <Button asChild variant="outline" size="sm" className="gap-2 flex-shrink-0">
              <a href="/api/export/patients" download>
                <Download className="h-4 w-4" />
                Export CSV
              </a>
            </Button>
          )}
        </div>

        {data.patients.length === 0 ? (
          <EmptyState icon={UserRound} title="No patients found" description="Create your first patient record or adjust the search terms." />
        ) : (
          <>
            {/* Vercel-style table */}
            <div className="overflow-hidden rounded-xl border border-border bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/60">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hidden sm:table-cell">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hidden md:table-cell">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hidden lg:table-cell">Birth Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hidden xl:table-cell">Created</th>
                      <th className="w-8 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.patients.map((patient) => (
                      <tr key={patient.id} className="group border-b border-border last:border-0 transition-colors hover:bg-slate-50">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
                              <UserRound className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                            <div>
                              <Link
                                className="font-medium text-slate-900 hover:text-blue-600"
                                href={`/patients/${patient.id}`}
                              >
                                {patient.full_name}
                              </Link>
                              {patient.gender && (
                                <p className="text-xs text-slate-400">{titleize(patient.gender)}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3.5 text-slate-500 sm:table-cell">{patient.phone}</td>
                        <td className="hidden px-4 py-3.5 text-slate-500 md:table-cell">{patient.email ?? <span className="text-slate-300">—</span>}</td>
                        <td className="hidden px-4 py-3.5 text-slate-500 lg:table-cell">{formatManilaDate(patient.birth_date)}</td>
                        <td className="hidden px-4 py-3.5 text-slate-500 xl:table-cell">{formatManilaDate(patient.created_at)}</td>
                        <td className="px-4 py-3.5">
                          <Link href={`/patients/${patient.id}`}>
                            <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table footer with pagination */}
              <div className="flex items-center justify-between border-t border-border bg-slate-50/40 px-4 py-2.5">
                <p className="text-xs text-slate-400">
                  Page {data.page} of {data.totalPages} · {data.total.toLocaleString()} patients
                </p>
                <div className="flex items-center gap-1">
                  {data.page <= 1 ? (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled>‹</Button>
                  ) : (
                    <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Link href={paginationHref(data.page - 1, data.query)}>‹</Link>
                    </Button>
                  )}
                  {data.page >= data.totalPages ? (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled>›</Button>
                  ) : (
                    <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Link href={paginationHref(data.page + 1, data.query)}>›</Link>
                    </Button>
                  )}
                </div>
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
