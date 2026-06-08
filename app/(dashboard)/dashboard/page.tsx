import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getDashboardMetrics } from "@/server/queries/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let metrics = null;

  try {
    metrics = await getDashboardMetrics();
  } catch {
    metrics = null;
  }

  return <DashboardOverview metrics={metrics} />;
}
