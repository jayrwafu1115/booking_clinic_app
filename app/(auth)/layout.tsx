import Link from "next/link";
import { APP_NAME } from "@/lib/constants/app";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:grid lg:grid-cols-[1fr_460px] lg:items-center">
        <section className="space-y-8">
          <Link href="/" className="inline-flex items-center gap-3 text-lg font-bold text-slate-950">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">CF</span>
            {APP_NAME}
          </Link>
          <div className="max-w-2xl space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Philippines clinics only</p>
            <h1 className="text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
              Appointment operations for modern local clinics.
            </h1>
            <p className="text-lg leading-8 text-slate-600">
              Manage front desk workflows, tenant-isolated clinic data, and AI-assisted booking from a clean Manila-time workspace.
            </p>
          </div>
        </section>
        {children}
      </div>
    </main>
  );
}
