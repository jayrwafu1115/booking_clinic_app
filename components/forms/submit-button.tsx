"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  className,
  disabled
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button className={className ?? "w-full"} disabled={pending || disabled} type="submit">
      {pending ? "Please wait..." : children}
    </Button>
  );
}
