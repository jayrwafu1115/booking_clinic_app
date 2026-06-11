import { Settings2 } from "lucide-react";
import { AiSettingsForm } from "@/components/ai/ai-settings-form";
import { NewConversationForm } from "@/components/ai/new-conversation-form";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          icon={Settings2}
        />
        {!data.canManage ? <AccessCard title="Read-only access" message="Clinic owners can update AI assistant settings." /> : null}
        <AiSettingsForm settings={data.settings} canManage={data.canManage} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test AI Assistant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-500">
              Start a test conversation from the dashboard to preview how the AI responds with your current settings and FAQ knowledge base before patients use the widget.
            </p>
            <NewConversationForm />
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load AI settings.";
    return <AccessCard title="AI settings could not load" message={message} />;
  }
}
