import { headers } from "next/headers";
import { Bot, Globe2 } from "lucide-react";
import { WidgetEmbedCard } from "@/components/ai/widget-embed-card";
import { ModuleHeader } from "@/components/core/module-header";
import { AccessCard } from "@/components/settings/access-card";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_AI_WELCOME_MESSAGE } from "@/lib/constants/ai";
import { getAiWidgetEmbedData } from "@/server/queries/ai";

export const dynamic = "force-dynamic";

async function getAppOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  if (configured) {
    return configured;
  }

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");

  if (!host) {
    return "https://yourdomain.com";
  }

  const protocol = headerStore.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export default async function AiWidgetPage() {
  try {
    const data = await getAiWidgetEmbedData();

    if (!data) {
      return <AccessCard title="Widget unavailable" message="Sign in with a clinic account to view widget embed settings." />;
    }

    const origin = await getAppOrigin();
    const widgetUrl = `${origin}/widget/${data.clinic.slug}`;
    const iframeSnippet = `<iframe
  src="${widgetUrl}"
  style="position:fixed;bottom:0;right:0;width:420px;height:680px;border:none;z-index:9999;background:transparent;"
  allow="clipboard-write"
></iframe>`;
    const scriptSnippet = `<script>
(function () {
  var iframe = document.createElement('iframe');
  iframe.src = '${widgetUrl}';
  iframe.style.cssText = 'position:fixed;bottom:0;right:0;width:420px;height:680px;border:none;z-index:9999;background:transparent;';
  iframe.allow = 'clipboard-write';
  document.body.appendChild(iframe);
})();
</script>`;
    const aiEnabled = data.settings?.ai_enabled ?? true;
    const widgetEnabled = data.settings?.ai_widget_enabled ?? true;

    return (
      <div className="space-y-6">
        <ModuleHeader
          eyebrow="AI Assistant"
          title="Widget & Embed"
          description="Publish the clinic AI booking assistant on external websites with a direct URL, iframe, or JavaScript embed."
          icon={Bot}
        />

        <Card>
          <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <Globe2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-950">{data.clinic.name}</p>
                <p className="mt-1 text-sm text-slate-600">{data.settings?.ai_welcome_message ?? DEFAULT_AI_WELCOME_MESSAGE}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <span className={aiEnabled ? "rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700" : "rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"}>
                AI {aiEnabled ? "enabled" : "disabled"}
              </span>
              <span
                className={
                  widgetEnabled
                    ? "rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                    : "rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                }
              >
                Widget {widgetEnabled ? "enabled" : "disabled"}
              </span>
            </div>
          </CardContent>
        </Card>

        <WidgetEmbedCard widgetUrl={widgetUrl} iframeSnippet={iframeSnippet} scriptSnippet={scriptSnippet} />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load widget embed settings.";
    return <AccessCard title="Widget settings could not load" message={message} />;
  }
}
