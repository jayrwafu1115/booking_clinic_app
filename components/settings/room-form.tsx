"use client";

import { useActionState } from "react";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { upsertRoomAction, deleteRoomAction } from "@/server/actions/rooms";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Room } from "@/types/database";

type Props =
  | { mode: "create"; room?: undefined }
  | { mode: "edit"; room: Room };

export function RoomForm({ mode, room }: Props) {
  const [open, setOpen] = useState(false);
  const [upsertState, upsertAction] = useActionState(upsertRoomAction, {});
  const [deleteState, deleteAction] = useActionState(deleteRoomAction, {});

  if (mode === "create") {
    return (
      <form
        action={async (fd) => { await upsertAction(fd); }}
        className="space-y-4"
      >
        <Field label="Room name" name="name" required defaultValue="" />
        <Field label="Description" name="description" defaultValue="" />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Capacity</label>
          <input type="number" name="capacity" min={1} max={100} defaultValue={1}
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked /> Active
        </label>
        {upsertState.message && (
          <p className={`text-sm ${upsertState.success ? "text-green-700" : "text-red-600"}`}>{upsertState.message}</p>
        )}
        <Button type="submit" className="w-full">Add room</Button>
      </form>
    );
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Edit Room — {room.name}</DialogTitle>
          <form action={async (fd) => { await upsertAction(fd); setOpen(false); }} className="space-y-4 pt-2">
            <input type="hidden" name="id" value={room.id} />
            <Field label="Room name" name="name" required defaultValue={room.name} />
            <Field label="Description" name="description" defaultValue={room.description ?? ""} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Capacity</label>
              <input type="number" name="capacity" min={1} max={100} defaultValue={room.capacity}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={room.active} /> Active
            </label>
            {upsertState.message && (
              <p className={`text-sm ${upsertState.success ? "text-green-700" : "text-red-600"}`}>{upsertState.message}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
          <form action={deleteAction} className="border-t pt-3">
            <input type="hidden" name="id" value={room.id} />
            {deleteState.message && (
              <p className="mb-2 text-sm text-red-600">{deleteState.message}</p>
            )}
            <Button type="submit" variant="outline" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700">
              Delete room
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, name, required, defaultValue }: { label: string; name: string; required?: boolean; defaultValue: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input type="text" name={name} required={required} defaultValue={defaultValue}
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" />
    </div>
  );
}
