"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { patientCancelAppointmentAction, patientConfirmAppointmentAction } from "@/server/actions/public-appointments";

type Result = { success: boolean; message: string };

export function PatientConfirmActions({ token, status }: { token: string; status: string }) {
  const [result, setResult] = useState<Result | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [reason, setReason] = useState("");

  const canConfirm = status === "booked";
  const canCancel = ["booked", "confirmed", "checked_in"].includes(status);

  if (!canConfirm && !canCancel) return null;

  function handleConfirm() {
    startTransition(async () => {
      const res = await patientConfirmAppointmentAction(token);
      setResult(res);
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const res = await patientCancelAppointmentAction(token, reason || undefined);
      setResult(res);
    });
  }

  if (result) {
    return (
      <div className={`flex items-start gap-3 rounded-xl p-4 ${result.success ? "bg-green-50 ring-1 ring-green-200" : "bg-red-50 ring-1 ring-red-200"}`}>
        {result.success
          ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />}
        <p className={`text-sm font-medium ${result.success ? "text-green-800" : "text-red-800"}`}>
          {result.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        {canConfirm && (
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Confirm Appointment
          </Button>
        )}
        {canCancel && !showCancelForm && (
          <Button
            variant="outline"
            onClick={() => setShowCancelForm(true)}
            disabled={isPending}
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancel Appointment
          </Button>
        )}
      </div>

      {showCancelForm && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-red-800">Reason for cancellation (optional)</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Schedule conflict, feeling better, etc."
            rows={2}
            className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleCancel}
              disabled={isPending}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm cancellation"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCancelForm(false)} disabled={isPending}>
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
