"use client";

import { useActionState } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormField } from "@/components/core/form-field";
import { ConfirmActionForm } from "@/components/core/confirm-action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createFaqItemAction, deleteFaqItemAction, updateFaqItemAction } from "@/server/actions/ai";
import type { FaqItem } from "@/types/database";

export function FaqItemForm({ item, canManage }: { item?: FaqItem; canManage: boolean }) {
  const action = item ? updateFaqItemAction : createFaqItemAction;
  const [state, formAction] = useActionState(action, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>{item ? "Edit FAQ" : "New FAQ Item"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="space-y-4">
          {item ? <input type="hidden" name="id" value={item.id} /> : null}
          <AuthStatus message={state.message} success={state.success} />
          <fieldset disabled={!canManage} className="space-y-4 disabled:opacity-70">
            <FormField label="Question">
              <Input name="question" defaultValue={item?.question ?? ""} required />
            </FormField>
            <FormField label="Answer">
              <textarea
                name="answer"
                defaultValue={item?.answer ?? ""}
                rows={4}
                className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </FormField>
            <label className="flex h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm font-medium text-slate-700">
              <input name="active" type="checkbox" defaultChecked={item?.active ?? true} className="rounded border-slate-300 text-blue-600" />
              Active
            </label>
          </fieldset>
          {canManage ? <SubmitButton className="w-full sm:w-auto">{item ? "Save FAQ" : "Create FAQ"}</SubmitButton> : null}
        </form>
        {item && canManage ? (
          <ConfirmActionForm action={deleteFaqItemAction} id={item.id} label="Delete FAQ" confirmMessage="Delete this FAQ item?" />
        ) : null}
      </CardContent>
    </Card>
  );
}
