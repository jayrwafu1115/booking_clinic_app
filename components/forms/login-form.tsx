"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, magicLinkAction } from "@/server/actions/auth";

export function LoginForm() {
  const [loginState, loginFormAction] = useActionState(loginAction, {});
  const [magicState, magicFormAction] = useActionState(magicLinkAction, {});

  return (
    <div className="space-y-5">
      <form action={loginFormAction} className="space-y-4">
        <AuthStatus message={loginState.message} success={loginState.success} />
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link className="text-sm font-medium text-blue-600 hover:text-blue-700" href="/forgot-password">
              Forgot?
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
        </div>
        <SubmitButton>Sign in</SubmitButton>
      </form>

      <form action={magicFormAction} className="space-y-3 border-t border-border pt-5">
        <AuthStatus message={magicState.message} success={magicState.success} />
        <Input name="email" type="email" placeholder="Email for magic link" required />
        <SubmitButton>Send magic link</SubmitButton>
      </form>
    </div>
  );
}
