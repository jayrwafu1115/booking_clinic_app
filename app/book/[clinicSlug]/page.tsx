import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PublicBookingFlow } from "@/components/booking/public-booking-flow";
import type { Clinic, Doctor, Service } from "@/types/database";

export const dynamic = "force-dynamic";

type BookingClinic = Pick<Clinic, "id" | "name" | "slug" | "logo_url" | "primary_color" | "phone" | "email">;

export default async function PublicBookingPage({ params }: { params: Promise<{ clinicSlug: string }> }) {
  const { clinicSlug } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, name, slug, logo_url, primary_color, phone, email")
    .eq("slug", clinicSlug)
    .eq("status", "active")
    .maybeSingle<BookingClinic>();

  if (!clinic) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="mx-auto max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center">
          <p className="text-lg font-bold text-slate-800">Clinic not found</p>
          <p className="mt-2 text-sm text-slate-500">This clinic page is not available.</p>
        </div>
      </div>
    );
  }

  const [servicesResult, doctorsResult] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, description, duration_minutes, price_centavos, color, category")
      .eq("clinic_id", clinic.id)
      .eq("active", true)
      .eq("online_booking_enabled", true)
      .order("name")
      .returns<Pick<Service, "id" | "name" | "description" | "duration_minutes" | "price_centavos" | "color" | "category">[]>(),
    supabase
      .from("doctors")
      .select("id, full_name, specialization, avatar_url")
      .eq("clinic_id", clinic.id)
      .eq("active", true)
      .order("full_name")
      .returns<Pick<Doctor, "id" | "full_name" | "specialization" | "avatar_url">[]>(),
  ]);

  const services = servicesResult.data ?? [];
  const doctors  = doctorsResult.data ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {clinic.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clinic.logo_url} alt={clinic.name} className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-white" style={{ backgroundColor: clinic.primary_color }}>
              {clinic.name[0]}
            </span>
          )}
          <div>
            <p className="font-bold text-slate-900">{clinic.name}</p>
            <p className="text-xs text-slate-500">Online Booking</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl py-8 px-4">
        {services.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center">
            <p className="text-slate-500">No services are available for online booking at this time.</p>
          </div>
        ) : (
          <PublicBookingFlow
            clinicSlug={clinicSlug}
            services={services}
            doctors={doctors}
          />
        )}
      </main>
    </div>
  );
}
