import { cache } from "react";
import { getCurrentProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ClinicSubscription, SubscriptionPlan, Clinic } from "@/types/database";

export type PaymentRow = {
  id: string;
  start_at: string;
  status: string;
  patient_name: string | null;
  service_name: string | null;
  doctor_name: string | null;
  price_centavos: number;
  source: string;
};

export type PaymentsData = {
  rows: PaymentRow[];
  totalCentavos: number;
  thisMonthCentavos: number;
  totalCount: number;
};

export type BillingData = {
  subscription: (ClinicSubscription & { plan: SubscriptionPlan | null }) | null;
  plans: SubscriptionPlan[];
  trialDaysLeft: number | null;
  clinicName: string;
};

export async function getBillingData(): Promise<BillingData | null> {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return null;

  const supabase = await createSupabaseServerClient();
  const [subscriptionResult, plansResult, clinicResult] = await Promise.all([
    supabase
      .from("clinic_subscriptions")
      .select("*, plan:subscription_plans(*)")
      .eq("clinic_id", profile.clinic_id)
      .maybeSingle<ClinicSubscription & { plan: SubscriptionPlan | null }>(),
    supabase
      .from("subscription_plans")
      .select("*")
      .eq("active", true)
      .order("price_monthly_centavos", { ascending: true })
      .returns<SubscriptionPlan[]>(),
    supabase
      .from("clinics")
      .select("name")
      .eq("id", profile.clinic_id)
      .single<Pick<Clinic, "name">>()
  ]);

  const subscription = subscriptionResult.data ?? null;
  const plans = plansResult.data ?? [];
  const clinicName = clinicResult.data?.name ?? "My Clinic";

  let trialDaysLeft: number | null = null;
  if (subscription?.status === "trial" && subscription.trial_ends_at) {
    const ms = new Date(subscription.trial_ends_at).getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  return { subscription, plans, trialDaysLeft, clinicName };
}

export type ClinicPlanFeatures = {
  aiEnabled: boolean;
  maxUsers: number;
  maxDoctors: number;
  subscriptionStatus: string;
};

export const getClinicPlanFeatures = cache(async (): Promise<ClinicPlanFeatures> => {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) {
    return { aiEnabled: false, maxUsers: 0, maxDoctors: 0, subscriptionStatus: "none" };
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("clinic_subscriptions")
    .select("status, plan:subscription_plans(ai_enabled, max_users, max_doctors)")
    .eq("clinic_id", profile.clinic_id)
    .maybeSingle<{
      status: string;
      plan: { ai_enabled: boolean; max_users: number; max_doctors: number } | null;
    }>();

  const isTrial = data?.status === "trial";

  return {
    aiEnabled: isTrial ? true : (data?.plan?.ai_enabled ?? false),
    maxUsers: data?.plan?.max_users ?? 5,
    maxDoctors: data?.plan?.max_doctors ?? 2,
    subscriptionStatus: data?.status ?? "none",
  };
});

export async function getPaymentsData(): Promise<PaymentsData | null> {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return null;

  const supabase = await createSupabaseServerClient();

  type Row = {
    id: string;
    start_at: string;
    status: string;
    source: string;
    patients: { full_name: string } | null;
    services: { name: string; price_centavos: number } | null;
    doctors: { full_name: string } | null;
  };

  const { data, error } = await supabase
    .from("appointments")
    .select("id, start_at, status, source, patients(full_name), services(name, price_centavos), doctors(full_name)")
    .eq("clinic_id", profile.clinic_id)
    .eq("status", "completed")
    .order("start_at", { ascending: false })
    .limit(200)
    .returns<Row[]>();

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((r) => ({
    id: r.id,
    start_at: r.start_at,
    status: r.status,
    source: r.source,
    patient_name: r.patients?.full_name ?? null,
    service_name: r.services?.name ?? null,
    doctor_name: r.doctors?.full_name ?? null,
    price_centavos: r.services?.price_centavos ?? 0
  }));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const totalCentavos = rows.reduce((s, r) => s + r.price_centavos, 0);
  const thisMonthCentavos = rows
    .filter((r) => r.start_at >= monthStart)
    .reduce((s, r) => s + r.price_centavos, 0);

  return { rows, totalCentavos, thisMonthCentavos, totalCount: rows.length };
}
