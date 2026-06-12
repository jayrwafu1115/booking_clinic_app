import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { SocialLinks } from "@/components/public/social-links";
import { DAY_NAMES, formatAddress, formatTime } from "@/components/public/shared";
import type { PublicClinicSite } from "@/server/queries/public";

type ClinicInfoProps = {
  site: PublicClinicSite;
};

export function ClinicInfo({ site }: ClinicInfoProps) {
  const { clinic, hours } = site;
  const address = formatAddress(clinic);
  const hasContact = Boolean(clinic.phone || clinic.email || address);
  const openDays = hours.filter((rule) => rule.is_open && rule.open_time && rule.close_time);

  if (!hasContact && openDays.length === 0) return null;

  return (
    <section id="contact" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-bold text-slate-900">Visit Us</h2>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Walk in, call, or book online — whichever works best for you.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {hasContact ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Contact Details</h3>
            <ul className="mt-5 space-y-4 text-sm text-slate-600">
              {address ? (
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
                  <span className="leading-6">{address}</span>
                </li>
              ) : null}
              {clinic.phone ? (
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
                  <a href={`tel:${clinic.phone}`} className="font-medium text-slate-900 transition hover:text-[var(--brand)]">
                    {clinic.phone}
                  </a>
                </li>
              ) : null}
              {clinic.email ? (
                <li className="flex items-center gap-3">
                  <Mail className="h-5 w-5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
                  <a href={`mailto:${clinic.email}`} className="font-medium text-slate-900 transition hover:text-[var(--brand)]">
                    {clinic.email}
                  </a>
                </li>
              ) : null}
            </ul>
            <SocialLinks clinic={clinic} className="mt-6 flex items-center gap-2" />
          </div>
        ) : null}

        {openDays.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Clock className="h-5 w-5 text-[var(--brand)]" aria-hidden="true" />
              Clinic Hours
            </h3>
            <dl className="mt-5 space-y-2.5 text-sm">
              {openDays.map((rule) => (
                <div key={rule.day_of_week} className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-slate-900">{DAY_NAMES[rule.day_of_week] ?? ""}</dt>
                  <dd className="text-slate-600">
                    {formatTime(rule.open_time)} – {formatTime(rule.close_time)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-xs text-slate-500">All times are Philippine Standard Time (Asia/Manila).</p>
          </div>
        ) : null}
      </div>

      {address ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <iframe
            title={`Map showing the location of ${clinic.name}`}
            src={`https://www.google.com/maps?q=${encodeURIComponent(`${clinic.name}, ${address}, Philippines`)}&output=embed`}
            className="h-80 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      ) : null}
    </section>
  );
}
