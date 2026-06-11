"use client";

import { useActionState } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInviteAction } from "@/server/actions/auth";

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [state, formAction] = useActionState(acceptInviteAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <AuthStatus message={state.message} success={state.success} />
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="email" value={email} />
      <div className="space-y-2">
        <Label htmlFor="email-display">Email</Label>
        <Input id="email-display" value={email} disabled className="bg-slate-50 text-slate-500" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone <span className="text-slate-400">(optional)</span></Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        <p className="text-xs text-slate-400">Minimum 8 characters.</p>
      </div>
      <SubmitButton>Accept invitation</SubmitButton>
    </form>
  );
}
