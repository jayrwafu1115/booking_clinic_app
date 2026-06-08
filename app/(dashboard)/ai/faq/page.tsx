import { BookOpen } from "lucide-react";
import { FaqItemForm } from "@/components/ai/faq-item-form";
import { EmptyState } from "@/components/core/empty-state";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { getFaqItemsData } from "@/server/queries/ai";

export const dynamic = "force-dynamic";

export default async function AiFaqPage() {
  try {
    const data = await getFaqItemsData();

    if (!data) {
      return <AccessCard title="FAQ unavailable" message="Sign in with a clinic account to manage AI FAQ knowledge." />;
    }

    return (
      <div className="space-y-6">
        <ModuleHeader
          eyebrow="AI Assistant"
          title="FAQ Knowledge Base"
          description="FAQ answers are checked before the LLM when the patient question is a strong match."
          icon={BookOpen}
        />
        <FaqItemForm canManage={data.canManage} />
        {data.items.length === 0 ? (
          <EmptyState icon={BookOpen} title="No FAQ items yet" description="Add common questions so the assistant can answer simple clinic questions without calling the LLM." />
        ) : (
          <section className="grid gap-4 xl:grid-cols-2">
            {data.items.map((item) => (
              <FaqItemForm key={item.id} item={item} canManage={data.canManage} />
            ))}
          </section>
        )}
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load FAQ items.";
    return <AccessCard title="FAQ could not load" message={message} />;
  }
}
