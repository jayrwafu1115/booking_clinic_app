import { AlertCircle, Bot, Building2, CalendarCheck, Check, CreditCard, Lock, Users, Zap } from "lucide-react";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBillingData } from "@/server/queries/billing";
import { UpgradePlanButton } from "@/components/billing/upgrade-plan-button";
import { FREE_TIER_MAX_DOCTORS, FREE_TIER_MAX_PATIENTS, FREE_TIER_MAX_SERVICES } from "@/lib/constants/app";
import type { BillingData } from "@/server/queries/billing";
import type { ClinicSubscriptionStatus, SubscriptionPlan } from "@/types/database";

export const dynamic = "force-dynamic";

function php(centavos: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(
    centavos / 100
  );
}

const STATUS_META: Record<ClinicSubscriptionStatus, { label: string; className: string }> = {
  free:      { label: "Free",         className: "bg-slate-100 text-slate-600 ring-slate-200" },
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
  const { subscription } = data;
  const status = subscription?.status ?? "free";
  const planName = subscription?.plan?.name ?? "Free";

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

        {status === "free" && (
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-700">Free plan limits</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat icon={Users} label="Patients" value={`${FREE_TIER_MAX_PATIENTS} max`} />
              <Stat icon={Building2} label="Doctors" value={`${FREE_TIER_MAX_DOCTORS} max`} />
              <Stat icon={CalendarCheck} label="Services" value={`${FREE_TIER_MAX_SERVICES} max`} />
              <Stat icon={Lock} label="SMS notifications" value="Not included" />
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
            <Stat icon={Users} label="Max users" value="Unlimited" />
            <Stat icon={Building2} label="Max doctors" value="Unlimited" />
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
  Pro: [
    "Unlimited users & doctors",
    "Appointment booking & calendar",
    "Patient records management",
    "AI booking assistant",
    "Embeddable chat widget",
    "SMS & email notifications",
    "Advanced reports & analytics",
    "Public clinic website",
    "Waitlist management",
    "Patient data export",
    "Priority support",
  ],
};

const SUPPORT_EMAIL = "support@bookclinicph.com";

function PlanCard({ plan, currentPlanId }: { plan: SubscriptionPlan; currentPlanId: string | null; clinicName: string }) {
  const isCurrent = plan.id === currentPlanId;
  const features = PLAN_FEATURES[plan.name] ?? [];

  return (
    <div className="relative flex flex-col rounded-2xl border border-blue-500 p-6 shadow-sm ring-1 ring-blue-500">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
          <Zap className="h-3 w-3" /> All Features Included
        </span>
      </div>

      <div className="mb-4">
        <p className="text-lg font-bold text-slate-900">{plan.name}</p>
        <p className="mt-1 text-sm text-slate-500">Everything you need to run your clinic — no limits.</p>
        <div className="mt-3 flex items-end gap-1">
          <span className="text-3xl font-bold text-slate-900">{php(plan.price_monthly_centavos)}</span>
          <span className="mb-1 text-sm text-slate-500">/ month</span>
        </div>
      </div>

      <ul className="mb-6 flex-1 grid grid-cols-2 gap-x-4 gap-y-2">
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
        <UpgradePlanButton planId={plan.id} isPro />
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
        <div className="mx-auto max-w-lg">
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
