"use client";

import { useState } from "react";
import { CalendarDays, Check } from "lucide-react";

export function IcalCopyButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const appUrl = typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? "");
  const feedUrl = `${appUrl}/api/calendar/feed/${token}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition-colors"
      title="Copy iCal calendar feed URL for Google / Outlook / Apple Calendar"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <CalendarDays className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied!" : "Copy calendar feed URL"}
    </button>
  );
}
