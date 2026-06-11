import Link from "next/link";
import { BotMessageSquare, User } from "lucide-react";
import { Suspense } from "react";
import { ConversationsFilterBar } from "@/components/ai/conversations-filter-bar";
import { EmptyState } from "@/components/core/empty-state";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatManilaDateTime, titleize } from "@/lib/utils/format";
import { getAiConversationsData } from "@/server/queries/ai";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ search?: string; dateFrom?: string; dateTo?: string }>;
};

export default async function AiConversationsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  try {
    const data = await getAiConversationsData({
      search: params.search,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo
    });

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
        <Suspense>
          <ConversationsFilterBar />
        </Suspense>

        {data.conversations.length === 0 ? (
          <EmptyState
            icon={BotMessageSquare}
            title="No conversations found"
            description={
              params.search || params.dateFrom || params.dateTo
                ? "No conversations match your filters. Try adjusting the search or date range."
                : "Start a dashboard conversation to test FAQ answers, provider responses, and booking prompts."
            }
          />
        ) : (
          <section className="space-y-3">
            {data.conversations.map((conversation) => {
              const patientName = conversation.patients?.full_name;
              const title = patientName
                ? patientName
                : `${titleize(conversation.channel)} conversation`;

              return (
                <Card key={conversation.id}>
                  <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {patientName && (
                          <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        )}
                        <p className="font-semibold text-slate-950">{title}</p>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {titleize(conversation.status)}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                          {titleize(conversation.channel)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{formatManilaDateTime(conversation.created_at)}</p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/ai/conversations/${conversation.id}`}>Open</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        )}
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load conversations.";
    return <AccessCard title="Conversations could not load" message={message} />;
  }
}
