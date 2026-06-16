"use client";

import { useActionState, useState } from "react";
import { Bell, Trash2 } from "lucide-react";
import { notifyWaitlistEntryAction, removeWaitlistEntryAction } from "@/server/actions/waitlist";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Props = { entryId: string; status: string };

export function WaitlistActions({ entryId, status }: Props) {
  const [notifyState, notifyAction, notifyPending] = useActionState(notifyWaitlistEntryAction, {});
  const [removeState, removeAction, removePending] = useActionState(removeWaitlistEntryAction, {});
  const [confirmOpen, setConfirmOpen] = useState(false);

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
            <Bell className="h-3.5 w-3.5" aria-hidden="true" />
            Notify
          </Button>
        </form>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Remove from waitlist"
        disabled={removePending}
        onClick={() => setConfirmOpen(true)}
        className="gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Remove from waitlist?</DialogTitle>
          <p className="text-sm text-slate-600">This entry will be permanently removed from the waitlist.</p>
          <form
            action={removeAction}
            onSubmit={() => setConfirmOpen(false)}
            className="mt-4 flex gap-3"
          >
            <input type="hidden" name="id" value={entryId} />
            <Button type="button" variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-red-600 text-white hover:bg-red-700">
              Remove
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {(notifyState.message || removeState.message) && (
        <p className="text-xs text-red-600">{notifyState.message ?? removeState.message}</p>
      )}
    </div>
  );
}
