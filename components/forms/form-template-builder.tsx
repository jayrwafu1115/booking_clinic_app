"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { upsertFormTemplateAction } from "@/server/actions/forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FormField, FormFieldType, FormTemplate } from "@/types/database";

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio (single choice)" },
  { value: "checkbox", label: "Checkbox (multi-choice)" },
  { value: "date", label: "Date" },
  { value: "number", label: "Number" },
];

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export function FormTemplateBuilder({ template }: { template?: FormTemplate }) {
  const [state, formAction] = useActionState(upsertFormTemplateAction, {});
  const [fields, setFields] = useState<FormField[]>(template?.fields ?? []);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function addField() {
    setFields((prev) => [...prev, { id: genId(), type: "text", label: "", required: false }]);
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  function updateField(id: string, patch: Partial<FormField>) {
    setFields((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f));
  }

  function updateOptions(id: string, raw: string) {
    const options = raw.split("\n").map((s) => s.trim()).filter(Boolean);
    updateField(id, { options });
  }

  function handleDragStart(i: number) {
    setDragIndex(i);
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) return;
    setFields((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(i, 0, moved);
      return next;
    });
    setDragIndex(i);
  }

  function handleDragEnd() {
    setDragIndex(null);
  }

  const needsOptions = (type: FormFieldType) => ["select", "radio", "checkbox"].includes(type);

  return (
    <form action={formAction} className="space-y-6">
      {template && <input type="hidden" name="id" value={template.id} />}
      <input type="hidden" name="fields" value={JSON.stringify(fields)} />

      <Card>
        <CardHeader><CardTitle>Template Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Form name *</label>
            <input type="text" name="name" required defaultValue={template?.name ?? ""}
              className="h-10 w-full rounded-xl border border-input px-3 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <input type="text" name="description" defaultValue={template?.description ?? ""}
              className="h-10 w-full rounded-xl border border-input px-3 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={template?.active ?? true} /> Active
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Fields ({fields.length})</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addField} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add field
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.length === 0 && (
            <p className="text-sm text-slate-400">No fields yet. Add your first field above.</p>
          )}
          {fields.map((field, i) => (
            <div
              key={field.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              className={`rounded-2xl border p-4 space-y-3 transition-opacity ${
                dragIndex === i ? "border-blue-300 bg-blue-50/40 opacity-50" : "border-slate-200"
              }`}
            >
              <div className="flex items-start gap-2">
                <GripVertical className="mt-2.5 h-4 w-4 shrink-0 cursor-grab text-slate-300 active:cursor-grabbing" />
                <div className="flex-1 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Label *</label>
                    <input type="text" required value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      className="h-9 w-full rounded-xl border border-slate-200 px-3 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Field type</label>
                    <select value={field.type}
                      onChange={(e) => updateField(field.id, { type: e.target.value as FormFieldType })}
                      className="h-9 w-full rounded-xl border border-slate-200 px-3 text-sm">
                      {FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  {needsOptions(field.type) && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-medium text-slate-500">Options (one per line)</label>
                      <textarea
                        value={(field.options ?? []).join("\n")}
                        onChange={(e) => updateOptions(field.id, e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={field.required}
                      onChange={(e) => updateField(field.id, { required: e.target.checked })} />
                    Required
                  </label>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeField(field.id)}
                  className="mt-1 h-8 w-8 p-0 text-slate-400 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {state.message && (
        <p className={`text-sm ${state.success ? "text-green-700" : "text-red-600"}`}>{state.message}</p>
      )}
      <Button type="submit">{template ? "Save changes" : "Create form template"}</Button>
    </form>
  );
}
