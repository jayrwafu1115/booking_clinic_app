"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/paymongo/client";
import { createAuditLog } from "@/server/audit/create-audit-log";
import type { SubscriptionPlan } from "@/types/database";

type BillingActionState = { message?: string };

export async function initiatePlanUpgradeAction(
  _: BillingActionState,
  formData: FormData
): Promise<BillingActionState> {
  try {
    const planId = formData.get("planId");
    if (!planId || typeof planId !== "string") {
      return { message: "Invalid plan selected." };
    }

    const user = await requireUser();
    const profile = await getCurrentProfile();
    if (!profile?.clinic_id) {
      return { message: "Clinic profile required." };
    }

    const supabase = await createSupabaseServerClient();

    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .eq("active", true)
      .single<SubscriptionPlan>();

    if (planError || !plan) {
      return { message: "Plan not found." };
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const successUrl = (process.env.PAYMONGO_SUCCESS_REDIRECT_URL ?? `${appUrl}/billing/success`).replace(/\/$/, "");
    const cancelUrl = (process.env.PAYMONGO_CANCEL_REDIRECT_URL ?? `${appUrl}/billing/cancelled`).replace(/\/$/, "");

    const session = await createCheckoutSession({
      lineItems: [
        {
          name: `${plan.name} Plan — Monthly`,
          amount: plan.price_monthly_centavos,
          currency: "PHP",
          quantity: 1
        }
      ],
      successUrl,
      cancelUrl,
      metadata: {
        clinic_id: profile.clinic_id,
        plan_id: plan.id
      },
      description: `Book Clinic PH — ${plan.name} Plan`
    });

    await createAuditLog({
      clinicId: profile.clinic_id,
      actorId: user.id,
      action: "billing.upgrade_initiated",
      entityType: "clinic_subscription",
      metadata: {
        plan_id: plan.id,
        plan_name: plan.name,
        checkout_session_id: session.id
      }
    });

    redirect(session.checkoutUrl);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return { message: error instanceof Error ? error.message : "Something went wrong." };
  }
}
