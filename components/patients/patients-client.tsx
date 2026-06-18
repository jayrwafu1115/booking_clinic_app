"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Download, Plus, Search, UserRound } from "lucide-react";
import { EmptyState } from "@/components/core/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PatientDrawer } from "@/components/patients/patient-drawer";
import type { PaginatedPatients } from "@/server/queries/core";
import type { Patient, PatientStatus } from "@/types/database";
import { formatManilaDate, titleize } from "@/lib/utils/format";

type FilterTab = "all" | PatientStatus;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" }
];

const STATUS_BADGE: Record<PatientStatus, string> = {
  active: "bg-green-50 text-green-700",
  inactive: "bg-slate-100 text-slate-500"
};

function paginationHref(page: number, query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("page", String(page));
  return `/patients?${params.toString()}`;
}

export function PatientsClient({ data }: { data: PaginatedPatients }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPatient, setDrawerPatient] = useState<Patient | undefined>(undefined);

  const visiblePatients =
    activeTab === "all" ? data.patients : data.patients.filter((p) => p.status === activeTab);

  function openEditDrawer(patient: Patient) {
    setDrawerPatient(patient);
    setDrawerOpen(true);
  }

  function openNewDrawer() {
    setDrawerPatient(undefined);
    setDrawerOpen(true);
  }

  function handleDrawerSuccess() {
    setDrawerOpen(false);
    router.refresh();
  }

  const { statusCounts } = data;

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-2xl bg-blue-50 p-3 text-blue-600">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Clinic Management</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">Patients</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Search and manage patient records for your clinic tenant.
            </p>
          </div>
        </div>
        {data.canManage && (
          <Button onClick={openNewDrawer} className="gap-2 flex-shrink-0 self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            New patient
          </Button>
        )}
      </div>

      {/* Stat Summary Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="px-4 py-3.5">
          <p className="text-2xl font-semibold tabular-nums text-slate-900">{data.total.toLocaleString()}</p>
          <p className="mt-0.5 text-xs text-slate-500">Total Patients</p>
        </Card>
        <Card className="px-4 py-3.5">
          <p className="text-2xl font-semibold tabular-nums text-green-600">{statusCounts.active.toLocaleString()}</p>
          <p className="mt-0.5 text-xs text-slate-500">Active</p>
        </Card>
        <Card className="px-4 py-3.5">
          <p className="text-2xl font-semibold tabular-nums text-slate-400">{statusCounts.inactive.toLocaleString()}</p>
          <p className="mt-0.5 text-xs text-slate-500">Inactive</p>
        </Card>
      </div>

      {/* Toolbar: Search + Export */}
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

      {/* Filter Tabs */}
      <div className="flex border-b border-border -mt-2">
        {FILTER_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none ${
              activeTab === key
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table or Empty State */}
      {visiblePatients.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title={activeTab === "all" ? "No patients found" : `No ${activeTab} patients`}
          description={
            activeTab === "all"
              ? "Create your first patient record or adjust the search terms."
              : "No patients with this status on the current page."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hidden sm:table-cell">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hidden md:table-cell">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hidden lg:table-cell">Birth Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hidden xl:table-cell">Created</th>
                  <th className="w-8 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visiblePatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className={`group border-b border-border last:border-0 transition-colors hover:bg-slate-50 ${
                      data.canManage ? "cursor-pointer" : ""
                    }`}
                    onClick={data.canManage ? () => openEditDrawer(patient) : undefined}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
                          <UserRound className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{patient.full_name}</p>
                          {patient.gender && (
                            <p className="text-xs text-slate-400">{titleize(patient.gender)}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3.5 text-slate-500 sm:table-cell">{patient.phone}</td>
                    <td className="hidden px-4 py-3.5 text-slate-500 md:table-cell">
                      {patient.email ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="hidden px-4 py-3.5 text-slate-500 lg:table-cell">
                      {formatManilaDate(patient.birth_date)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[patient.status]}`}>
                        {titleize(patient.status)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3.5 text-slate-500 xl:table-cell">
                      {formatManilaDate(patient.created_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
      )}

      {/* Patient Drawer */}
      {drawerOpen && (
        <PatientDrawer
          patient={drawerPatient}
          onClose={() => setDrawerOpen(false)}
          onSuccess={handleDrawerSuccess}
          canManage={data.canManage}
        />
      )}
    </div>
  );
}
