"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelInviteAction, resendInviteAction } from "@/server/actions/settings";

function ActionButton({ label, loadingLabel, className, children }: { label: string; loadingLabel: string; className?: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      className={`h-8 gap-1.5 px-3 text-xs ${className ?? ""}`}
    >
      {pending ? loadingLabel : <>{children}{label}</>}
    </Button>
  );
}

export function InviteActions({ inviteId }: { inviteId: string }) {
  const [cancelState, cancelAction] = useActionState(cancelInviteAction, {});
  const [resendState, resendAction] = useActionState(resendInviteAction, {});

  return (
    <div className="flex flex-wrap items-center gap-2">
      {resendState.message && (
        <span className={`text-xs ${resendState.success ? "text-green-600" : "text-red-600"}`}>
          {resendState.message}
        </span>
      )}
      {cancelState.message && !cancelState.success && (
        <span className="text-xs text-red-600">{cancelState.message}</span>
      )}

      <form action={resendAction}>
        <input type="hidden" name="id" value={inviteId} />
        <ActionButton label="Resend" loadingLabel="Sending…" className="text-blue-700 hover:bg-blue-50 hover:text-blue-800">
          <RefreshCw className="h-3 w-3" />
        </ActionButton>
      </form>

      <form action={cancelAction}>
        <input type="hidden" name="id" value={inviteId} />
        <ActionButton label="Cancel" loadingLabel="Cancelling…" className="text-red-600 hover:bg-red-50 hover:text-red-700">
          <X className="h-3 w-3" />
        </ActionButton>
      </form>
    </div>
  );
}
