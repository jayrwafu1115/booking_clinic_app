import { AlertCircle, Bot, Building2, CalendarCheck, Check, CreditCard, Users, Zap } from "lucide-react";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBillingData } from "@/server/queries/billing";
import { UpgradePlanButton } from "@/components/billing/upgrade-plan-button";
import type { BillingData, } from "@/server/queries/billing";
import type { ClinicSubscriptionStatus, SubscriptionPlan } from "@/types/database";

export const dynamic = "force-dynamic";

function php(centavos: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(
    centavos / 100
  );
}

const STATUS_META: Record<ClinicSubscriptionStatus, { label: string; className: string }> = {
  trial:     { label: "Free Trial",   className: "bg-blue-50 text-blue-700 ring-blue-200" },
  active:    { label: "Active",       className: "bg-green-50 text-green-700 ring-green-200" },
  past_due:  { label: "Past Due",     className: "bg-orange-50 text-orange-700 ring-orange-200" },
  cancelled: { label: "Cancelled",    className: "bg-slate-100 text-slate-600 ring-slate-200" },
  suspended: { label: "Suspended",    className: "bg-red-50 text-red-700 ring-red-200" },
};

function StatusBadge({ status }: { status: ClinicSubscriptionStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function CurrentPlanCard({ data }: { data: BillingData }) {
  const { subscription, trialDaysLeft } = data;
  const status = subscription?.status ?? "trial";
  const planName = subscription?.plan?.name ?? "Free Trial";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          Current Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-slate-900">{planName}</p>
            {subscription?.plan && (
              <p className="text-sm text-slate-500">
                {php(subscription.plan.price_monthly_centavos)} / month
              </p>
            )}
          </div>
          <StatusBadge status={status} />
        </div>

        {status === "trial" && trialDaysLeft !== null && (
          <div className={`flex items-start gap-3 rounded-xl p-4 ${trialDaysLeft <= 3 ? "bg-red-50" : "bg-blue-50"}`}>
            <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${trialDaysLeft <= 3 ? "text-red-600" : "text-blue-600"}`} />
            <div>
              <p className={`text-sm font-semibold ${trialDaysLeft <= 3 ? "text-red-800" : "text-blue-800"}`}>
                {trialDaysLeft === 0 ? "Trial expires today" : `${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left in trial`}
              </p>
              <p className={`text-xs mt-0.5 ${trialDaysLeft <= 3 ? "text-red-600" : "text-blue-600"}`}>
                Upgrade to a paid plan to keep access after your trial ends.
              </p>
            </div>
          </div>
        )}

        {status === "past_due" && (
          <div className="flex items-start gap-3 rounded-xl bg-orange-50 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
            <p className="text-sm text-orange-800">
              Your last payment failed. Please update your billing details to avoid service interruption.
            </p>
          </div>
        )}

        {status === "active" && subscription?.current_period_end && (
          <p className="text-sm text-slate-500">
            Next billing date:{" "}
            <span className="font-medium text-slate-700">
              {new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(new Date(subscription.current_period_end))}
            </span>
          </p>
        )}

        {subscription?.plan && (
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
            <Stat icon={Users} label="Max users" value={String(subscription.plan.max_users)} />
            <Stat icon={Building2} label="Max doctors" value={String(subscription.plan.max_doctors)} />
            <Stat icon={Bot} label="AI features" value={subscription.plan.ai_enabled ? "Included" : "Not included"} />
            <Stat icon={CalendarCheck} label="Online booking" value="Included" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

const PLAN_FEATURES: Record<string, string[]> = {
  Starter: [
    "Up to 5 users",
    "Up to 2 doctors",
    "Appointment booking",
    "Patient records",
    "Calendar view",
    "Email notifications",
    "Basic reports",
  ],
  Pro: [
    "Up to 15 users",
    "Up to 10 doctors",
    "Everything in Starter",
    "AI booking assistant",
    "Embeddable widget",
    "Advanced analytics",
  ],
  Enterprise: [
    "Up to 100 users",
    "Up to 50 doctors",
    "Everything in Pro",
    "Custom AI instructions",
  ],
};

const SUPPORT_EMAIL = "support@clinicflowaiph.com";

function PlanCard({ plan, currentPlanId }: { plan: SubscriptionPlan; currentPlanId: string | null; clinicName: string }) {
  const isCurrent = plan.id === currentPlanId;
  const isPro = plan.name === "Pro";
  const features = PLAN_FEATURES[plan.name] ?? [];
  const savings = Math.round(100 - (plan.price_annual_centavos / (plan.price_monthly_centavos * 12)) * 100);

  return (
    <div className={`relative flex flex-col rounded-2xl border p-6 ${isPro ? "border-blue-500 shadow-soft ring-1 ring-blue-500" : "border-border"}`}>
      {isPro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
            <Zap className="h-3 w-3" /> Most Popular
          </span>
        </div>
      )}

      <div className="mb-4">
        <p className="text-lg font-bold text-slate-900">{plan.name}</p>
        <div className="mt-2 flex items-end gap-1">
          <span className="text-3xl font-bold text-slate-900">{php(plan.price_monthly_centavos)}</span>
          <span className="mb-1 text-sm text-slate-500">/ month</span>
        </div>
        {plan.price_annual_centavos > 0 && (
          <p className="mt-1 text-xs text-green-600">
            {php(plan.price_annual_centavos)} / year — save {savings}%
          </p>
        )}
      </div>

      <ul className="mb-6 flex-1 space-y-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            {feature}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="flex h-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-500">
          Current plan
        </div>
      ) : (
        <UpgradePlanButton planId={plan.id} isPro={isPro} />
      )}
    </div>
  );
}

export default async function BillingPage() {
  const data = await getBillingData();

  if (!data) {
    return <AccessCard title="Billing unavailable" message="Sign in with a clinic account to view billing." />;
  }

  return (
    <div className="space-y-8">
      <ModuleHeader
        eyebrow="Account"
        title="Billing & Plans"
        description="Manage your subscription plan, view usage limits, and upgrade when you're ready."
        icon={CreditCard}
      />

      <CurrentPlanCard data={data} />

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Available Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {data.plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlanId={data.subscription?.plan_id ?? null}
              clinicName={data.clinicName}
            />
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          All prices in Philippine Peso (PHP). Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-blue-600 hover:underline">
            {SUPPORT_EMAIL}
          </a>{" "}
          to upgrade &mdash; we&apos;ll activate your plan within 24 hours.
        </p>
      </section>
    </div>
  );
}
