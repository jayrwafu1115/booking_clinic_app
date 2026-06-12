import { Clock } from "lucide-react";
import { BookNowButton } from "@/components/public/book-now-button";
import { formatPesoFromCentavos } from "@/lib/utils/format";
import type { PublicClinicService } from "@/server/queries/public";

type ClinicServicesProps = {
  services: PublicClinicService[];
  widgetEnabled: boolean;
};

export function ClinicServices({ services, widgetEnabled }: ClinicServicesProps) {
  if (services.length === 0) return null;

  return (
    <section id="services" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-bold text-slate-900">Our Services</h2>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Clear pricing, no surprises. Every service below can be booked online.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <article
            key={service.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            {service.image_url ? (
              <div
                role="img"
                aria-label={service.name}
                className="h-44 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${service.image_url})` }}
              />
            ) : null}
            <div className="flex flex-1 flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900">{service.name}</h3>
                <span aria-hidden="true" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: service.color }} />
              </div>
              {service.category ? (
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{service.category}</p>
              ) : null}
              {service.description ? (
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{service.description}</p>
              ) : null}

              <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                <div>
                  <p className="text-xl font-bold text-slate-900">
                    {service.price_centavos > 0 ? formatPesoFromCentavos(service.price_centavos) : "Free consultation"}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {service.duration_minutes} mins
                  </p>
                </div>
                <BookNowButton
                  widgetEnabled={widgetEnabled}
                  className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Book
                </BookNowButton>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
