"use client";

import { useActionState, useState } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormField } from "@/components/core/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AI_PROVIDERS, AI_TONES, DEFAULT_AI_WELCOME_MESSAGE, getModelsForProvider } from "@/lib/constants/ai";
import { titleize } from "@/lib/utils/format";
import { updateAiSettingsAction } from "@/server/actions/ai";
import type { AiProviderOption, ClinicSettings } from "@/types/database";

export function AiSettingsForm({ settings, canManage }: { settings: ClinicSettings | null; canManage: boolean }) {
  const [state, formAction] = useActionState(updateAiSettingsAction, {});
  const [provider, setProvider] = useState<AiProviderOption>(settings?.ai_provider ?? "openai");
  const models = getModelsForProvider(provider);

  return (
    <form action={formAction} className="space-y-5">
      <AuthStatus message={state.message} success={state.success} />
      <fieldset disabled={!canManage} className="space-y-5 disabled:opacity-70">
        <Card>
          <CardHeader>
            <CardTitle>Assistant Configuration</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <label className="flex h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm font-medium text-slate-700">
              <input name="aiEnabled" type="checkbox" defaultChecked={settings?.ai_enabled ?? true} className="rounded border-slate-300 text-blue-600" />
              AI enabled
            </label>
            <label className="flex h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm font-medium text-slate-700">
              <input
                name="aiWidgetEnabled"
                type="checkbox"
                defaultChecked={settings?.ai_widget_enabled ?? true}
                className="rounded border-slate-300 text-blue-600"
              />
              Widget enabled
            </label>
            <FormField label="AI provider">
              <select
                name="aiProvider"
                value={provider}
                onChange={(event) => setProvider(event.target.value as AiProviderOption)}
                className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-100"
              >
                {AI_PROVIDERS.map((item) => (
                  <option key={item} value={item}>
                    {titleize(item)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Model">
              <select
                name="aiModel"
                defaultValue={(models as readonly string[]).includes(settings?.ai_model ?? "") ? settings?.ai_model : models[0]}
                className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-100"
              >
                {models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Tone">
              <select
                name="aiTone"
                defaultValue={settings?.ai_tone ?? "professional"}
                className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-100"
              >
                {AI_TONES.map((tone) => (
                  <option key={tone} value={tone}>
                    {titleize(tone)}
                  </option>
                ))}
              </select>
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Welcome message">
                <Input name="aiWelcomeMessage" defaultValue={settings?.ai_welcome_message ?? DEFAULT_AI_WELCOME_MESSAGE} required />
              </FormField>
            </div>
            <div className="md:col-span-2">
              <FormField label="Booking instructions">
                <textarea
                  name="aiBookingInstructions"
                  defaultValue={settings?.ai_booking_instructions ?? ""}
                  rows={5}
                  className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </FormField>
            </div>
          </CardContent>
        </Card>
      </fieldset>
      {canManage ? (
        <div className="flex justify-end">
          <SubmitButton className="w-full sm:w-auto">Save AI settings</SubmitButton>
        </div>
      ) : null}
    </form>
  );
}
