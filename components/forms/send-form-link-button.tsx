"use client";

import { useActionState, useState } from "react";
import { Copy } from "lucide-react";
import { sendFormLinkAction } from "@/server/actions/forms";
import { Button } from "@/components/ui/button";
import type { Patient } from "@/types/database";

export function SendFormLinkButton({
  templateId,
  patients,
}: {
  templateId: string;
  patients: Pick<Patient, "id" | "full_name">[];
}) {
  const [state, formAction] = useActionState(sendFormLinkAction, {});
  const [copied, setCopied] = useState(false);

  const link = state.token ? `${typeof window !== "undefined" ? window.location.origin : ""}/intake/${state.token}` : null;

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <form action={formAction} className="flex flex-wrap gap-3">
        <input type="hidden" name="templateId" value={templateId} />
        <select name="patientId" className="h-10 rounded-xl border border-input px-3 text-sm flex-1 min-w-[160px]">
          <option value="">— Assign to patient (optional) —</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
        <Button type="submit">Generate link</Button>
      </form>

      {link && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
          <code className="flex-1 truncate text-xs text-slate-700">{link}</code>
          <Button type="button" variant="ghost" size="sm" onClick={copy} className="gap-1.5 shrink-0">
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      )}

      {state.message && !state.success && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
    </div>
  );
}
