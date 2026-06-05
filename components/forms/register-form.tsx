"use client";

import { useActionState } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAction } from "@/server/actions/auth";

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <AuthStatus message={state.message} success={state.success} />
      <div className="space-y-2">
        <Label htmlFor="clinicName">Clinic name</Label>
        <Input id="clinicName" name="clinicName" autoComplete="organization" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fullName">Owner full name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      <SubmitButton>Start free trial</SubmitButton>
    </form>
  );
}
