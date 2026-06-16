"use client";

import { useActionState } from "react";
import { Bell, Trash2 } from "lucide-react";
import { notifyWaitlistEntryAction, removeWaitlistEntryAction } from "@/server/actions/waitlist";
import { Button } from "@/components/ui/button";

type Props = { entryId: string; status: string };

export function WaitlistActions({ entryId, status }: Props) {
  const [notifyState, notifyAction, notifyPending] = useActionState(notifyWaitlistEntryAction, {});
  const [removeState, removeAction, removePending] = useActionState(removeWaitlistEntryAction, {});

  return (
    <div className="flex items-center gap-2 shrink-0">
      {status === "waiting" && (
        <form action={notifyAction}>
          <input type="hidden" name="id" value={entryId} />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={notifyPending}
            className="gap-1.5 text-xs"
          >
            <Bell className="h-3.5 w-3.5" />
            Notify
          </Button>
        </form>
      )}
      <form action={removeAction}>
        <input type="hidden" name="id" value={entryId} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          disabled={removePending}
          className="gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </form>
      {(notifyState.message || removeState.message) && (
        <p className="text-xs text-red-600">{notifyState.message ?? removeState.message}</p>
      )}
    </div>
  );
}
