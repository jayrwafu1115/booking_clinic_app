import Link from "next/link";
import { BotMessageSquare } from "lucide-react";
import { NewConversationForm } from "@/components/ai/new-conversation-form";
import { EmptyState } from "@/components/core/empty-state";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatManilaDateTime, titleize } from "@/lib/utils/format";
import { getAiConversationsData } from "@/server/queries/ai";

export const dynamic = "force-dynamic";

export default async function AiConversationsPage() {
  try {
    const data = await getAiConversationsData();

    if (!data) {
      return <AccessCard title="AI conversations unavailable" message="Sign in with a clinic account to view conversations." />;
    }

    return (
      <div className="space-y-6">
        <ModuleHeader
          eyebrow="AI Assistant"
          title="AI Conversations"
          description="Review dashboard/widget AI booking conversations and handoffs."
          icon={BotMessageSquare}
        />
        <Card>
          <CardContent className="p-5">
            <NewConversationForm />
          </CardContent>
        </Card>
        {data.conversations.length === 0 ? (
          <EmptyState icon={BotMessageSquare} title="No AI conversations yet" description="Start a dashboard conversation to test FAQ answers, provider responses, and booking prompts." />
        ) : (
          <section className="space-y-3">
            {data.conversations.map((conversation) => (
              <Card key={conversation.id}>
                <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">{titleize(conversation.channel)} conversation</p>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{titleize(conversation.status)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{formatManilaDateTime(conversation.created_at)}</p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/ai/conversations/${conversation.id}`}>Open</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load conversations.";
    return <AccessCard title="Conversations could not load" message={message} />;
  }
}
