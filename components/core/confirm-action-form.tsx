"use client";

import { useActionState, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertTriangle, X } from "lucide-react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";

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
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, {});

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
            <DialogPrimitive.Title className="sr-only">Confirm action</DialogPrimitive.Title>

            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-sm text-slate-700">{confirmMessage}</p>
            </div>

            <form
              action={formAction}
              onSubmit={() => setOpen(false)}
              className="mt-6 space-y-3"
            >
              <input type="hidden" name="id" value={id} />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <SubmitButton className="flex-1 bg-red-600 text-white hover:bg-red-700">
                  Confirm
                </SubmitButton>
              </div>
              <AuthStatus message={state.message} success={state.success} />
            </form>

            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {state.message && !open && (
        <AuthStatus message={state.message} success={state.success} />
      )}
    </>
  );
}
