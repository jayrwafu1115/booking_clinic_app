"use client";

import { useActionState, useState } from "react";
import { Lock } from "lucide-react";
import { upsertClinicalNoteAction, lockClinicalNoteAction } from "@/server/actions/notes";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { ClinicalNote } from "@/types/database";

type Props = {
  appointmentId: string;
  patientId: string;
  doctorId?: string | null;
  note: ClinicalNote | null;
  canManage: boolean;
};

export function SoapNoteForm({ appointmentId, patientId, doctorId, note, canManage }: Props) {
  const [upsertState, upsertAction] = useActionState(upsertClinicalNoteAction, {});
  const [lockState, lockAction] = useActionState(lockClinicalNoteAction, {});
  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);

  const locked = note?.is_locked ?? false;
  const readonly = !canManage || locked;

  return (
    <div className="space-y-4">
      {locked && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800 ring-1 ring-amber-200">
          <Lock className="h-4 w-4 shrink-0" />
          This note was locked on {note?.locked_at ? new Date(note.locked_at).toLocaleDateString("en-PH") : "an unknown date"} and cannot be edited.
        </div>
      )}

      <form action={upsertAction} className="space-y-4">
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <input type="hidden" name="patientId" value={patientId} />
        {doctorId && <input type="hidden" name="doctorId" value={doctorId} />}

        {(["subjective", "objective", "assessment", "plan"] as const).map((field) => (
          <div key={field} className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {field === "subjective" ? "S — Subjective"
               : field === "objective" ? "O — Objective"
               : field === "assessment" ? "A — Assessment"
               : "P — Plan"}
            </label>
            <Textarea
              name={field}
              rows={3}
              readOnly={readonly}
              defaultValue={note?.[field] ?? ""}
              placeholder={
                field === "subjective" ? "Patient's complaints, symptoms in their own words..."
                : field === "objective" ? "Measurable findings: vitals, physical exam, test results..."
                : field === "assessment" ? "Diagnosis / clinical impression..."
                : "Treatment plan, medications, follow-up instructions..."
              }
              className={readonly ? "cursor-default opacity-70" : ""}
            />
          </div>
        ))}

        {!readonly && (
          <div className="flex items-center justify-between gap-3">
            <Button type="submit" size="sm">Save note</Button>
            {upsertState.message && (
              <p className={`text-sm ${upsertState.success ? "text-green-700" : "text-red-600"}`}>
                {upsertState.message}
              </p>
            )}
          </div>
        )}
      </form>

      {note && !locked && canManage && (
        <div className="border-t border-dashed border-slate-200 pt-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 text-amber-700 hover:border-amber-300 hover:bg-amber-50"
              onClick={() => setLockConfirmOpen(true)}
            >
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Lock note
            </Button>
            <p className="text-xs text-slate-400">Locked notes cannot be edited.</p>
            {lockState.message && (
              <p className={`text-sm ${lockState.success ? "text-green-700" : "text-red-600"}`}>
                {lockState.message}
              </p>
            )}
          </div>

          <Dialog open={lockConfirmOpen} onOpenChange={setLockConfirmOpen}>
            <DialogContent className="max-w-sm">
              <DialogTitle>Lock this note?</DialogTitle>
              <p className="text-sm text-slate-600">
                Locking is permanent — this note can no longer be edited after confirmation.
              </p>
              <form
                action={lockAction}
                onSubmit={() => setLockConfirmOpen(false)}
                className="mt-4 flex gap-3"
              >
                <input type="hidden" name="noteId" value={note.id} />
                <Button type="button" variant="outline" className="flex-1" onClick={() => setLockConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-amber-600 text-white hover:bg-amber-700">
                  Lock note
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
