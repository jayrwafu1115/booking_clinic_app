"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormField } from "@/components/core/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createServiceDrawerAction, updateServiceDrawerAction } from "@/server/actions/services";
import type { Service } from "@/types/database";

const DEFAULT_COLOR = "#2563EB";

interface ServiceDrawerProps {
  service?: Service;
  onClose: () => void;
  onSuccess: () => void;
}

export function ServiceDrawer({ service, onClose, onSuccess }: ServiceDrawerProps) {
  const isNew = !service;
  const action = isNew ? createServiceDrawerAction : updateServiceDrawerAction;
  const [state, formAction] = useActionState(action, {});
  const [color, setColor] = useState(service?.color ?? DEFAULT_COLOR);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (state.success) onSuccessRef.current();
  }, [state.success]);

  const displayName = service?.name ?? "New Service";

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent>
        {/* Header */}
        <SheetHeader>
          <div className="flex items-center gap-3">
            <span
              className="h-10 w-10 flex-shrink-0 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: color }}
            />
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate">{displayName}</SheetTitle>
              {service && (
                <p className="font-mono text-xs text-slate-400 mt-0.5">
                  #{service.id.slice(0, 8).toUpperCase()}
                </p>
              )}
            </div>
            <span
              className={
                isNew
                  ? "inline-flex flex-shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                  : service?.active
                  ? "inline-flex flex-shrink-0 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700"
                  : "inline-flex flex-shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500"
              }
            >
              {isNew ? "New" : service?.active ? "Active" : "Inactive"}
            </span>
          </div>
        </SheetHeader>

        {/* Form — wraps scrollable body + sticky footer so useFormStatus works */}
        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          {service && <input type="hidden" name="id" value={service.id} />}

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <AuthStatus message={state.message} success={state.success} />

            {/* Service Details */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Service Details</p>
              <FormField label="Name">
                <Input name="name" defaultValue={service?.name ?? ""} required />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Category">
                  <Input name="category" defaultValue={service?.category ?? ""} placeholder="Dental, Medical..." />
                </FormField>
                <FormField label="Duration (minutes)">
                  <Input
                    name="durationMinutes"
                    type="number"
                    min={1}
                    defaultValue={service?.duration_minutes ?? 30}
                    required
                  />
                </FormField>
                <FormField label="Price (PHP)">
                  <Input
                    name="pricePesos"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={service ? (service.price_centavos / 100).toFixed(2) : "0.00"}
                  />
                </FormField>
                <FormField label="Color">
                  <div className="flex gap-2">
                    <Input
                      className="w-14 p-1 h-11"
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    />
                    <Input
                      name="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      required
                    />
                  </div>
                </FormField>
                <FormField label="Icon">
                  <Input name="icon" defaultValue={service?.icon ?? ""} placeholder="stethoscope, tooth..." />
                </FormField>
                <div className="col-span-2">
                  <FormField label="Image URL">
                    <Input name="imageUrl" defaultValue={service?.image_url ?? ""} placeholder="https://..." />
                  </FormField>
                </div>
              </div>
            </section>

            {/* Description */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Description</p>
              <textarea
                name="description"
                defaultValue={service?.description ?? ""}
                rows={3}
                placeholder="Describe this service…"
                className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100 resize-none"
              />
            </section>

            {/* Settings */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Settings</p>
              <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-border px-3 text-sm font-medium text-slate-700">
                <input
                  name="onlineBookingEnabled"
                  type="checkbox"
                  defaultChecked={service?.online_booking_enabled ?? true}
                  className="rounded border-slate-300 text-blue-600"
                />
                Online booking enabled
              </label>
              <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-border px-3 text-sm font-medium text-slate-700">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={service?.active ?? true}
                  className="rounded border-slate-300 text-blue-600"
                />
                Active
              </label>
            </section>
          </div>

          {/* Sticky footer */}
          <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-4">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <SubmitButton className="w-auto px-5">
              {isNew ? "Create service" : "Save changes"}
            </SubmitButton>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
