import { BotMessageSquare } from "lucide-react";
import { ConversationMessageForm } from "@/components/ai/conversation-message-form";
import { HandoffForm } from "@/components/ai/handoff-form";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatManilaDateTime, titleize } from "@/lib/utils/format";
import { getAiConversationData } from "@/server/queries/ai";

export const dynamic = "force-dynamic";

export default async function AiConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getAiConversationData(id);

    if (!data) {
      return <AccessCard title="Conversation unavailable" message="Sign in with a clinic account to view this conversation." />;
    }

    return (
      <div className="space-y-6">
        <ModuleHeader
          eyebrow="AI Assistant"
          title={`${titleize(data.conversation.channel)} Conversation`}
          description="Messages are stored with clinic-scoped RLS. FAQ is checked before provider calls."
          icon={BotMessageSquare}
        />
        <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.conversation.ai_messages.length === 0 ? <p className="text-sm text-slate-500">No messages yet.</p> : null}
              {data.conversation.ai_messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "rounded-2xl border border-border p-4",
                    message.role === "user" ? "bg-blue-50" : message.role === "assistant" ? "bg-white" : "bg-slate-50"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{message.role}</p>
                    <p className="text-xs text-slate-400">{formatManilaDateTime(message.created_at)}</p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Conversation State</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>Status: {titleize(data.conversation.status)}</p>
                <p>Provider: {data.settings?.ai_provider ?? "openai"}</p>
                <p>Model: {data.settings?.ai_model ?? "gpt-4o-mini"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Reply</CardTitle>
              </CardHeader>
              <CardContent>
                <ConversationMessageForm conversationId={data.conversation.id} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Staff Handoff</CardTitle>
              </CardHeader>
              <CardContent>
                <HandoffForm conversationId={data.conversation.id} />
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load conversation.";
    return <AccessCard title="Conversation could not load" message={message} />;
  }
}
