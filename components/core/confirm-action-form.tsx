"use client";

import { useActionState } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";

type ActionState = {
  message?: string;
  success?: boolean;
};

export function ConfirmActionForm({
  action,
  id,
  label,
  confirmMessage,
  disabled
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  id: string;
  label: string;
  confirmMessage: string;
  disabled?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form
      action={formAction}
      className="space-y-2"
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton className="h-10 w-full bg-red-600 px-3 text-white hover:bg-red-700 sm:w-auto" disabled={disabled}>
        {label}
      </SubmitButton>
      <AuthStatus message={state.message} success={state.success} />
    </form>
  );
}
