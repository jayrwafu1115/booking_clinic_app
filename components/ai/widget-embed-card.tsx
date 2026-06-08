"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SnippetType = "url" | "iframe" | "script";

function SnippetBlock({
  label,
  value,
  copied,
  onCopy
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <Button type="button" variant="outline" size="sm" onClick={onCopy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="max-h-56 overflow-auto rounded-xl border border-border bg-slate-950 p-4 text-xs leading-5 text-blue-50">
        <code>{value}</code>
      </pre>
    </div>
  );
}

export function WidgetEmbedCard({
  widgetUrl,
  iframeSnippet,
  scriptSnippet
}: {
  widgetUrl: string;
  iframeSnippet: string;
  scriptSnippet: string;
}) {
  const [copied, setCopied] = useState<SnippetType | null>(null);

  async function copy(type: SnippetType, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Embeddable Widget</CardTitle>
          <p className="mt-1 text-sm text-slate-600">Use the clinic-specific URL or paste one of the snippets into a clinic website.</p>
        </div>
        <Button asChild variant="outline">
          <Link href={widgetUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open widget
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <SnippetBlock label="Widget URL" value={widgetUrl} copied={copied === "url"} onCopy={() => void copy("url", widgetUrl)} />
        <SnippetBlock
          label="Iframe snippet"
          value={iframeSnippet}
          copied={copied === "iframe"}
          onCopy={() => void copy("iframe", iframeSnippet)}
        />
        <SnippetBlock
          label="JavaScript snippet"
          value={scriptSnippet}
          copied={copied === "script"}
          onCopy={() => void copy("script", scriptSnippet)}
        />
      </CardContent>
    </Card>
  );
}
