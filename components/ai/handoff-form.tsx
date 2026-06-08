"use client";

import { useActionState } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { handoffConversationAction } from "@/server/actions/ai";

export function HandoffForm({ conversationId }: { conversationId: string }) {
  const [state, formAction] = useActionState(handoffConversationAction, {});

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="conversationId" value={conversationId} />
      <AuthStatus message={state.message} success={state.success} />
      <textarea
        name="reason"
        rows={3}
        placeholder="Reason for staff handoff"
        className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        required
      />
      <SubmitButton className="w-full sm:w-auto">Handoff to staff</SubmitButton>
    </form>
  );
}
