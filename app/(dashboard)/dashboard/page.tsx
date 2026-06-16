import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { getDashboardMetrics } from "@/server/queries/dashboard";
import { getOnboardingStatus } from "@/server/queries/onboarding";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let metrics = null;
  let onboarding = null;

  try {
    [metrics, onboarding] = await Promise.all([
      getDashboardMetrics(),
      getOnboardingStatus(),
    ]);
  } catch {
    metrics = null;
  }

  return (
    <div className="space-y-6">
      {onboarding && !onboarding.isComplete && (
        <OnboardingChecklist status={onboarding} />
      )}
      <DashboardOverview metrics={metrics} />
    </div>
  );
}
