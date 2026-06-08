"use client";

import { useActionState } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { createAiConversationAction } from "@/server/actions/ai";

export function NewConversationForm() {
  const [state, formAction] = useActionState(createAiConversationAction, {});

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="channel" value="dashboard" />
      <AuthStatus message={state.message} success={state.success} />
      <SubmitButton className="w-full sm:w-auto">Start dashboard conversation</SubmitButton>
    </form>
  );
}
