import { cache } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Clinic, ClinicType } from "@/types/database";

export type PublicClinicService = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  duration_minutes: number;
  price_centavos: number;
  color: string;
  icon: string | null;
  image_url: string | null;
};

export type PublicClinicFaq = {
  id: string;
  question: string;
  answer: string;
};

export type PublicClinicDoctor = {
  id: string;
  full_name: string;
  specialization: string | null;
  avatar_url: string | null;
};

export type PublicClinicHours = {
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
};

export type PublicClinicSite = {
  clinic: Pick<
    Clinic,
    | "id"
    | "name"
    | "slug"
    | "email"
    | "phone"
    | "address_line_1"
    | "address_line_2"
    | "barangay"
    | "city"
    | "province"
    | "postal_code"
    | "logo_url"
    | "primary_color"
    | "hero_image_urls"
    | "facebook_url"
    | "instagram_url"
    | "tiktok_url"
    | "youtube_url"
  >;
  clinicType: ClinicType;
  aiWidgetEnabled: boolean;
  services: PublicClinicService[];
  doctors: PublicClinicDoctor[];
  hours: PublicClinicHours[];
  faqs: PublicClinicFaq[];
};

/**
 * Public, unauthenticated query for the clinic website at /c/[clinicSlug].
 * Uses the admin client (no session). Returns null unless the clinic is
 * active AND has a paid subscription whose plan includes "public_website"
 * (Enterprise only) — trials never qualify.
 */
export const getPublicClinicSite = cache(async (clinicSlug: string): Promise<PublicClinicSite | null> => {
  const supabase = createSupabaseAdminClient();

  const { data: clinic } = await supabase
    .from("clinics")
    .select(
      "id, name, slug, email, phone, address_line_1, address_line_2, barangay, city, province, postal_code, logo_url, primary_color, hero_image_urls, facebook_url, instagram_url, tiktok_url, youtube_url"
    )
    .eq("slug", clinicSlug)
    .eq("status", "active")
    .maybeSingle<PublicClinicSite["clinic"]>();

  if (!clinic) return null;

  const { data: subscription } = await supabase
    .from("clinic_subscriptions")
    .select("status, plan:subscription_plans(features)")
    .eq("clinic_id", clinic.id)
    .maybeSingle<{ status: string; plan: { features: string[] } | null }>();

  const isEntitled =
    subscription?.status === "active" && (subscription.plan?.features ?? []).includes("public_website");
  if (!isEntitled) return null;

  const [settingsResult, servicesResult, doctorsResult, hoursResult, faqsResult] = await Promise.all([
    supabase
      .from("clinic_settings")
      .select("clinic_type, ai_enabled, ai_widget_enabled")
      .eq("clinic_id", clinic.id)
      .maybeSingle<{ clinic_type: ClinicType; ai_enabled: boolean; ai_widget_enabled: boolean }>(),
    supabase
      .from("services")
      .select("id, name, description, category, duration_minutes, price_centavos, color, icon, image_url")
      .eq("clinic_id", clinic.id)
      .eq("active", true)
      .eq("online_booking_enabled", true)
      .order("name", { ascending: true })
      .returns<PublicClinicService[]>(),
    supabase
      .from("doctors")
      .select("id, full_name, specialization, avatar_url")
      .eq("clinic_id", clinic.id)
      .eq("active", true)
      .order("full_name", { ascending: true })
      .returns<PublicClinicDoctor[]>(),
    supabase
      .from("availability_rules")
      .select("day_of_week, is_open, open_time, close_time")
      .eq("clinic_id", clinic.id)
      .is("doctor_id", null)
      .order("day_of_week", { ascending: true })
      .returns<PublicClinicHours[]>(),
    supabase
      .from("faq_items")
      .select("id, question, answer")
      .eq("clinic_id", clinic.id)
      .eq("active", true)
      .order("created_at", { ascending: true })
      .returns<PublicClinicFaq[]>()
  ]);

  return {
    clinic,
    clinicType: settingsResult.data?.clinic_type ?? "medical",
    aiWidgetEnabled: Boolean(settingsResult.data?.ai_enabled && settingsResult.data?.ai_widget_enabled),
    services: servicesResult.data ?? [],
    doctors: doctorsResult.data ?? [],
    hours: hoursResult.data ?? [],
    faqs: faqsResult.data ?? []
  };
});
