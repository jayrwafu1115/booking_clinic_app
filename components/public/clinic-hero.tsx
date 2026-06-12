import { Bot, CalendarCheck, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { BookNowButton } from "@/components/public/book-now-button";
import { HeroCarousel } from "@/components/public/hero-carousel";
import { CLINIC_TYPE_LABELS } from "@/components/public/shared";
import type { PublicClinicSite } from "@/server/queries/public";

type ClinicHeroProps = {
  site: PublicClinicSite;
};

export function ClinicHero({ site }: ClinicHeroProps) {
  const { clinic, clinicType, aiWidgetEnabled, services } = site;
  const location = [clinic.city, clinic.province].filter(Boolean).join(", ");
  const heroImages = clinic.hero_image_urls ?? [];
  const hasBanner = heroImages.length > 0;

  return (
    <section id="top" className="relative overflow-hidden bg-slate-900">
      <HeroCarousel images={heroImages} />
      <div
        aria-hidden="true"
        className={`absolute inset-0 ${hasBanner ? "" : "opacity-90"}`}
        style={{
          background: hasBanner
            ? "linear-gradient(100deg, rgba(2, 6, 23, 0.82) 0%, rgba(2, 6, 23, 0.55) 55%, rgba(2, 6, 23, 0.25) 100%)"
            : "linear-gradient(135deg, var(--brand) 0%, #0f172a 85%)"
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-white/20">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {CLINIC_TYPE_LABELS[clinicType]}
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-tight text-white sm:text-5xl">{clinic.name}</h1>
          {location ? (
            <p className="mt-3 inline-flex items-center gap-2 text-base text-white/80">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              {location}
            </p>
          ) : null}
          <p className="mt-5 max-w-xl text-lg leading-7 text-white/85">
            Quality care, made easy to book. View our services and reserve your appointment online in minutes — no
            phone queue needed.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <BookNowButton
              widgetEnabled={aiWidgetEnabled}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-slate-900 shadow-lg transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              <CalendarCheck className="h-5 w-5" aria-hidden="true" />
              Book an Appointment
            </BookNowButton>
            <a
              href="#services"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              View Services
            </a>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4 text-sm text-white/80">
            {aiWidgetEnabled ? (
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4" aria-hidden="true" />
                <dt className="sr-only">Booking</dt>
                <dd>24/7 AI-assisted booking</dd>
              </div>
            ) : null}
            {services.length > 0 ? (
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <dt className="sr-only">Services</dt>
                <dd>
                  {services.length} {services.length === 1 ? "service" : "services"} available
                </dd>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <dt className="sr-only">Trust</dt>
              <dd>Transparent pricing in PHP</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
