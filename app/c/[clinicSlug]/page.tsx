import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { BookNowButton } from "@/components/public/book-now-button";
import { ClinicDoctors } from "@/components/public/clinic-doctors";
import { ClinicFaq } from "@/components/public/clinic-faq";
import { ClinicFooter } from "@/components/public/clinic-footer";
import { ClinicHeader } from "@/components/public/clinic-header";
import { ClinicHero } from "@/components/public/clinic-hero";
import { ClinicInfo } from "@/components/public/clinic-info";
import { ClinicServices } from "@/components/public/clinic-services";
import { CLINIC_TYPE_LABELS } from "@/components/public/shared";
import { BookingWidget } from "@/components/widget/booking-widget";
import { getPublicClinicSite } from "@/server/queries/public";
import { getPublicWidgetConfig } from "@/server/widget/chat";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ clinicSlug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { clinicSlug } = await params;
  const site = await getPublicClinicSite(clinicSlug).catch(() => null);

  if (!site) {
    return { title: "Clinic not found" };
  }

  const location = [site.clinic.city, site.clinic.province].filter(Boolean).join(", ");
  const description = `${CLINIC_TYPE_LABELS[site.clinicType]}${location ? ` in ${location}` : ""}. View services, meet our doctors, and book your appointment online.`;

  return {
    title: `${site.clinic.name} — Book an Appointment Online`,
    description,
    openGraph: {
      title: site.clinic.name,
      description,
      type: "website"
    }
  };
}

export default async function PublicClinicSitePage({ params }: PageProps) {
  const { clinicSlug } = await params;
  const site = await getPublicClinicSite(clinicSlug).catch(() => null);

  if (!site) {
    notFound();
  }

  const widgetConfig = site.aiWidgetEnabled ? await getPublicWidgetConfig(clinicSlug).catch(() => null) : null;
  const widgetEnabled = Boolean(widgetConfig);

  return (
    <div className="min-h-screen bg-slate-50" style={{ "--brand": site.clinic.primary_color || "#2563EB" } as CSSProperties}>
      <ClinicHeader
        clinic={site.clinic}
        widgetEnabled={widgetEnabled}
        hasDoctors={site.doctors.length > 0}
        hasFaqs={site.faqs.length > 0}
      />
      <main>
        <ClinicHero site={{ ...site, aiWidgetEnabled: widgetEnabled }} />
        <ClinicServices services={site.services} widgetEnabled={widgetEnabled} />
        <ClinicDoctors doctors={site.doctors} />
        <ClinicFaq faqs={site.faqs} />
        <ClinicInfo site={site} />

        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-16 text-center sm:px-6">
            <h2 className="text-3xl font-bold text-slate-900">Ready to book your visit?</h2>
            <p className="max-w-xl text-base leading-7 text-slate-600">
              {widgetEnabled
                ? "Our AI assistant can find an available slot and confirm your appointment in under a minute."
                : "Reach out through the contact details above and we will schedule you right away."}
            </p>
            <BookNowButton
              widgetEnabled={widgetEnabled}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:opacity-90"
            >
              <CalendarCheck className="h-5 w-5" aria-hidden="true" />
              Book an Appointment
            </BookNowButton>
          </div>
        </section>
      </main>
      <ClinicFooter clinic={site.clinic} />

      {widgetConfig ? <BookingWidget {...widgetConfig} embedded /> : null}
    </div>
  );
}
