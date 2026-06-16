"use client";

import { useActionState } from "react";
import { updateQueueStatusAction } from "@/server/actions/queue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QueueEntryWithRelations } from "@/types/database";

const STATUS_BADGE: Record<string, string> = {
  waiting:  "bg-blue-50 text-blue-700",
  called:   "bg-amber-50 text-amber-700",
  serving:  "bg-green-50 text-green-700",
  done:     "bg-slate-100 text-slate-500",
  skipped:  "bg-red-50 text-red-500",
};

const NEXT_STATUS: Record<string, string | null> = {
  waiting:  "called",
  called:   "serving",
  serving:  "done",
  done:     null,
  skipped:  null,
};

const NEXT_LABEL: Record<string, string> = {
  waiting: "Call",
  called:  "Serve",
  serving: "Done",
};

function QueueRow({ entry, canManage }: { entry: QueueEntryWithRelations; canManage: boolean }) {
  const [state, formAction] = useActionState(updateQueueStatusAction, {});
  const next = NEXT_STATUS[entry.status];

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-700">
        #{entry.queue_number}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900">{entry.patient_name}</p>
        <p className="truncate text-xs text-slate-500">
          {entry.services?.name ?? "Walk-in"}
          {entry.doctors ? ` · ${entry.doctors.full_name}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`hidden rounded-full px-2 py-0.5 text-xs font-medium capitalize sm:inline-flex ${STATUS_BADGE[entry.status]}`}>
          {entry.status}
        </span>
        {canManage && next && (
          <form action={formAction}>
            <input type="hidden" name="id" value={entry.id} />
            <input type="hidden" name="status" value={next} />
            <Button type="submit" size="sm" variant="outline">{NEXT_LABEL[entry.status]}</Button>
          </form>
        )}
        {canManage && entry.status === "waiting" && (
          <form action={formAction}>
            <input type="hidden" name="id" value={entry.id} />
            <input type="hidden" name="status" value="skipped" />
            <Button type="submit" size="sm" variant="ghost" className="text-slate-400 hover:text-red-500">Skip</Button>
          </form>
        )}
      </div>
      {state.message && <p className="text-xs text-red-600">{state.message}</p>}
    </div>
  );
}

export function QueueBoard({
  entries,
  canManage,
  title,
  muted = false,
}: {
  entries: QueueEntryWithRelations[];
  canManage: boolean;
  title: string;
  muted?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className={muted ? "text-slate-400" : ""}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-sm text-slate-400">No entries.</p>
        ) : (
          entries.map((e) => (
            <QueueRow key={e.id} entry={e} canManage={canManage} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
