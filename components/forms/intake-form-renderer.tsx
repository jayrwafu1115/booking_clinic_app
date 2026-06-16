"use client";

import { useRef, useState, useActionState } from "react";
import { Printer } from "lucide-react";
import { submitIntakeFormAction } from "@/server/actions/forms";
import { Button } from "@/components/ui/button";
import type { FormField } from "@/types/database";

export function IntakeFormRenderer({ token, fields }: { token: string; fields: FormField[] }) {
  const [state, formAction] = useActionState(submitIntakeFormAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, string | string[]> | null>(null);

  function captureAnswers() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    const captured: Record<string, string | string[]> = {};
    for (const field of fields) {
      if (field.type === "checkbox") {
        captured[field.id] = fd.getAll(`${field.id}[]`) as string[];
      } else {
        captured[field.id] = (fd.get(field.id) as string) ?? "";
      }
    }
    setSubmittedAnswers(captured);
  }

  if (state.success) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-5">
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600">Submitted! ✓</p>
          <p className="mt-2 text-sm text-slate-500">{state.message}</p>
        </div>

        {submittedAnswers && fields.length > 0 && (
          <div className="border-t border-slate-100 pt-4 divide-y divide-slate-100">
            {fields.map((field) => {
              const answer = submittedAnswers[field.id];
              const display = Array.isArray(answer)
                ? answer.length > 0 ? answer.join(", ") : "—"
                : answer || "—";
              return (
                <div key={field.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-xs font-semibold text-slate-500">{field.label}</p>
                  <p className="mt-0.5 text-sm text-slate-900">{display}</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-1 flex justify-center print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" />
            Print a copy
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={captureAnswers} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 space-y-5">
      <input type="hidden" name="token" value={token} />

      {fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </label>
          <FieldInput field={field} />
        </div>
      ))}

      {state.message && !state.success && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}

      <Button type="submit" className="w-full">Submit form</Button>
    </form>
  );
}

function FieldInput({ field }: { field: FormField }) {
  const base = "w-full rounded-xl border border-input px-3 text-sm";

  switch (field.type) {
    case "textarea":
      return <textarea name={field.id} required={field.required} rows={3} className={`${base} py-2`} />;
    case "select":
      return (
        <select name={field.id} required={field.required} className={`${base} h-10`}>
          <option value="">— Select —</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case "radio":
      return (
        <div className="space-y-2">
          {(field.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="radio" name={field.id} value={o} required={field.required} />
              {o}
            </label>
          ))}
        </div>
      );
    case "checkbox":
      return (
        <div className="space-y-2">
          {(field.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name={`${field.id}[]`} value={o} />
              {o}
            </label>
          ))}
        </div>
      );
    case "date":
      return <input type="date" name={field.id} required={field.required} className={`${base} h-10`} />;
    case "number":
      return <input type="number" name={field.id} required={field.required} className={`${base} h-10`} />;
    default:
      return <input type="text" name={field.id} required={field.required} className={`${base} h-10`} />;
  }
}
