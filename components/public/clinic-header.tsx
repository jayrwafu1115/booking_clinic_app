import { CalendarCheck } from "lucide-react";
import { BookNowButton } from "@/components/public/book-now-button";
import { initials } from "@/components/public/shared";
import type { PublicClinicSite } from "@/server/queries/public";

type ClinicHeaderProps = {
  clinic: PublicClinicSite["clinic"];
  widgetEnabled: boolean;
  hasDoctors: boolean;
  hasFaqs: boolean;
};

export function ClinicHeader({ clinic, widgetEnabled, hasDoctors, hasFaqs }: ClinicHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#top" className="flex min-w-0 items-center gap-3">
          {clinic.logo_url ? (
            <span
              aria-hidden="true"
              className="h-10 w-10 shrink-0 rounded-xl bg-cover bg-center ring-1 ring-slate-200"
              style={{ backgroundImage: `url(${clinic.logo_url})` }}
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-sm font-bold text-white"
            >
              {initials(clinic.name) || "C"}
            </span>
          )}
          <span className="truncate text-base font-semibold text-slate-900">{clinic.name}</span>
        </a>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <a href="#services" className="transition hover:text-slate-900">
            Services
          </a>
          {hasDoctors ? (
            <a href="#doctors" className="transition hover:text-slate-900">
              Doctors
            </a>
          ) : null}
          {hasFaqs ? (
            <a href="#faq" className="transition hover:text-slate-900">
              FAQ
            </a>
          ) : null}
          <a href="#contact" className="transition hover:text-slate-900">
            Contact
          </a>
        </nav>

        <BookNowButton
          widgetEnabled={widgetEnabled}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2"
        >
          <CalendarCheck className="h-4 w-4" aria-hidden="true" />
          Book Now
        </BookNowButton>
      </div>
    </header>
  );
}
