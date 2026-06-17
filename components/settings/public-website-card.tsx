import Link from "next/link";
import { ExternalLink, Globe, Lock } from "lucide-react";

type PublicWebsiteCardProps = {
  clinicSlug: string;
  enabled: boolean;
};

export function PublicWebsiteCard({ clinicSlug, enabled }: PublicWebsiteCardProps) {
  const path = `/${clinicSlug}`;

  if (!enabled) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Public Clinic Website</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Get a professional, mobile-friendly website for your clinic — services, doctors, clinic hours, and the
              AI booking assistant, all in one shareable page. Available on the <strong>Pro</strong> plan.
            </p>
            <Link
              href="/billing"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <Globe className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">Public Clinic Website</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Your clinic website is live. Share this link with patients or add it to your social media pages — it
            shows your services, doctors, clinic hours, and lets patients book online.
          </p>
          <p className="mt-3 truncate rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700 ring-1 ring-slate-200">
            {path}
          </p>
          <a
            href={path}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            View Website
          </a>
        </div>
      </div>
    </section>
  );
}
