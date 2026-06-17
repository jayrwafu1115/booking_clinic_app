import { cache } from "react";
import { getCurrentProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FREE_TIER_MAX_DOCTORS, FREE_TIER_MAX_PATIENTS, FREE_TIER_MAX_SERVICES } from "@/lib/constants/app";
import type { ClinicSubscription, SubscriptionPlan, Clinic } from "@/types/database";

export type PaymentRow = {
  id: string;
  invoice_number: string;
  created_at: string;
  patient_name: string | null;
  total_centavos: number;
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

  return { subscription, plans, clinicName };
}

export type ClinicPlanFeatures = {
  aiEnabled: boolean;
  maxUsers: number;
  maxDoctors: number;
  maxPatients: number;
  maxServices: number;
  smsEnabled: boolean;
  publicWebsiteEnabled: boolean;
  subscriptionStatus: string;
};

export const getClinicPlanFeatures = cache(async (): Promise<ClinicPlanFeatures> => {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) {
    return { aiEnabled: false, maxUsers: 0, maxDoctors: 0, maxPatients: 0, maxServices: 0, smsEnabled: false, publicWebsiteEnabled: false, subscriptionStatus: "none" };
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("clinic_subscriptions")
    .select("status, plan:subscription_plans(ai_enabled, max_users, max_doctors, features)")
    .eq("clinic_id", profile.clinic_id)
    .maybeSingle<{
      status: string;
      plan: { ai_enabled: boolean; max_users: number; max_doctors: number; features: string[] } | null;
    }>();

  const status = data?.status ?? "none";
  const isFree = status === "free";
  const isBlocked = status === "cancelled" || status === "suspended";
  const isActive = status === "active";

  if (isFree) {
    return {
      aiEnabled: false,
      maxUsers: 2147483647,
      maxDoctors: FREE_TIER_MAX_DOCTORS,
      maxPatients: FREE_TIER_MAX_PATIENTS,
      maxServices: FREE_TIER_MAX_SERVICES,
      smsEnabled: false,
      publicWebsiteEnabled: false,
      subscriptionStatus: status,
    };
  }

  if (isBlocked) {
    return { aiEnabled: false, maxUsers: 0, maxDoctors: 0, maxPatients: 0, maxServices: 0, smsEnabled: false, publicWebsiteEnabled: false, subscriptionStatus: status };
  }

  return {
    aiEnabled: isActive && (data?.plan?.ai_enabled ?? false),
    maxUsers: 2147483647,
    maxDoctors: 2147483647,
    maxPatients: 2147483647,
    maxServices: 2147483647,
    smsEnabled: isActive,
    publicWebsiteEnabled: isActive,
    subscriptionStatus: status,
  };
});

export async function getPaymentsData(): Promise<PaymentsData | null> {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return null;

  const supabase = await createSupabaseServerClient();

  type Row = {
    id: string;
    invoice_number: string;
    created_at: string;
    total_centavos: number;
    patients: { full_name: string } | null;
  };

  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, created_at, total_centavos, patients(full_name)")
    .eq("clinic_id", profile.clinic_id)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Row[]>();

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((r) => ({
    id: r.id,
    invoice_number: r.invoice_number,
    created_at: r.created_at,
    patient_name: r.patients?.full_name ?? null,
    total_centavos: r.total_centavos,
  }));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const totalCentavos = rows.reduce((s, r) => s + r.total_centavos, 0);
  const thisMonthCentavos = rows
    .filter((r) => r.created_at >= monthStart)
    .reduce((s, r) => s + r.total_centavos, 0);

  return { rows, totalCentavos, thisMonthCentavos, totalCount: rows.length };
}
