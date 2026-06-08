"use client";

import { useActionState } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { sendAiMessageAction } from "@/server/actions/ai";

export function ConversationMessageForm({ conversationId }: { conversationId: string }) {
  const [state, formAction] = useActionState(sendAiMessageAction, {});

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="conversationId" value={conversationId} />
      <AuthStatus message={state.message} success={state.success} />
      <textarea
        name="content"
        rows={4}
        placeholder="Type a patient message or test prompt..."
        className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        required
      />
      <SubmitButton className="w-full sm:w-auto">Send to assistant</SubmitButton>
    </form>
  );
}
