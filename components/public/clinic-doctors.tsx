import { initials } from "@/components/public/shared";
import type { PublicClinicDoctor } from "@/server/queries/public";

type ClinicDoctorsProps = {
  doctors: PublicClinicDoctor[];
};

export function ClinicDoctors({ doctors }: ClinicDoctorsProps) {
  if (doctors.length === 0) return null;

  return (
    <section id="doctors" className="border-y border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold text-slate-900">Meet Our Doctors</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Licensed professionals dedicated to your care.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {doctors.map((doctor) => (
            <article
              key={doctor.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-center shadow-sm"
            >
              {doctor.avatar_url ? (
                <div
                  role="img"
                  aria-label={doctor.full_name}
                  className="h-52 w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${doctor.avatar_url})` }}
                />
              ) : (
                <div className="flex h-52 w-full items-center justify-center bg-slate-100">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--brand)] text-2xl font-bold text-white">
                    {initials(doctor.full_name) || "Dr"}
                  </span>
                </div>
              )}
              <div className="p-5">
                <h3 className="truncate text-base font-semibold text-slate-900">{doctor.full_name}</h3>
                {doctor.specialization ? (
                  <p className="mt-1 truncate text-sm text-slate-600">{doctor.specialization}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
