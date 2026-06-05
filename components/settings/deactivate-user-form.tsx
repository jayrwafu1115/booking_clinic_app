"use client";

import { useActionState } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { deactivateUserAction } from "@/server/actions/settings";

export function DeactivateUserForm({ userId, disabled }: { userId: string; disabled?: boolean }) {
  const [state, formAction] = useActionState(deactivateUserAction, {});

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <SubmitButton className="h-10 w-full bg-red-600 px-3 text-white hover:bg-red-700 sm:w-auto" disabled={disabled}>
        {disabled ? "Inactive" : "Deactivate"}
      </SubmitButton>
      <AuthStatus message={state.message} success={state.success} />
    </form>
  );
}
