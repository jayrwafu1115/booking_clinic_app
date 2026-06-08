"use client";

import { useState, useTransition } from "react";
import { setClinicStatusAction } from "@/server/actions/super-admin";

const OPTIONS = [
  { value: "active", label: "Active", description: "Clinic is fully operational" },
  { value: "inactive", label: "Inactive", description: "Clinic is disabled but data preserved" },
  { value: "suspended", label: "Suspended", description: "Clinic access blocked (payment issue)" }
] as const;

export function AdminClinicStatusForm({
  clinicId,
  currentStatus
}: {
  clinicId: string;
  currentStatus: string;
}) {
  const [selected, setSelected] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleSave() {
    if (selected === currentStatus) return;
    setMessage(null);
    startTransition(async () => {
      const result = await setClinicStatusAction(clinicId, selected as "active" | "inactive" | "suspended");
      setMessage(result.success ? { type: "success", text: "Status updated" } : { type: "error", text: result.error ?? "Failed" });
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {OPTIONS.map((opt) => (
          <label key={opt.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${selected === opt.value ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
            <input
              type="radio"
              name="clinic_status"
              value={opt.value}
              checked={selected === opt.value}
              onChange={() => setSelected(opt.value)}
              className="accent-blue-600"
            />
            <div>
              <p className="text-sm font-medium text-slate-800">{opt.label}</p>
              <p className="text-xs text-slate-500">{opt.description}</p>
            </div>
          </label>
        ))}
      </div>

      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-green-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={isPending || selected === currentStatus}
        className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Update Status"}
      </button>
    </div>
  );
}
