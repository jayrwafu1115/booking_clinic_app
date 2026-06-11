import { redirect } from "next/navigation";
import { getClinicPlanFeatures } from "@/server/queries/billing";

export default async function AiLayout({ children }: { children: React.ReactNode }) {
  const { aiEnabled } = await getClinicPlanFeatures();
  if (!aiEnabled) redirect("/billing");
  return <>{children}</>;
}
