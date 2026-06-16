import { ShieldCheck } from "lucide-react";
import { ModuleHeader } from "@/components/core/module-header";
import { TwoFactorSettings } from "@/components/settings/two-factor-settings";

export const dynamic = "force-dynamic";

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-8">
      <ModuleHeader
        eyebrow="Settings"
        title="Security"
        description="Manage two-factor authentication and account security settings."
        icon={ShieldCheck}
      />
      <TwoFactorSettings />
    </div>
  );
}
