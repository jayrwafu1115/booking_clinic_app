import { cloneElement, Children, useId } from "react";
import type { ReactElement } from "react";
import { Label } from "@/components/ui/label";

export function FormField({ label, children }: { label: string; children: ReactElement<{ id?: string }> }) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {cloneElement(Children.only(children), { id })}
    </div>
  );
}
