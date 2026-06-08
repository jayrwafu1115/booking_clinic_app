import { AiSettingsForm } from "@/components/ai/ai-settings-form";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { getAiSettingsData } from "@/server/queries/ai";

export const dynamic = "force-dynamic";

export default async function AiSettingsPage() {
  try {
    const data = await getAiSettingsData();

    if (!data) {
      return <AccessCard title="AI settings unavailable" message="Sign in with a clinic account to view AI settings." />;
    }

    return (
      <div className="space-y-6">
        <ModuleHeader
          eyebrow="AI Assistant"
          title="AI Settings"
          description="Configure provider, model, tone, welcome message, and booking behavior for the clinic assistant."
        />
        {!data.canManage ? <AccessCard title="Read-only access" message="Clinic owners can update AI assistant settings." /> : null}
        <AiSettingsForm settings={data.settings} canManage={data.canManage} />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load AI settings.";
    return <AccessCard title="AI settings could not load" message={message} />;
  }
}
