"use client";

import { useActionState } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ASSIGNABLE_USER_ROLES } from "@/lib/constants/app";
import { inviteUserAction } from "@/server/actions/settings";

function roleLabel(role: string) {
  return role
    .split("_")
    .map((word) => word.replace(/^\w/, (letter) => letter.toUpperCase()))
    .join(" ");
}

export function InviteUserForm() {
  const [state, formAction] = useActionState(inviteUserAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite User</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
          <div className="md:col-span-3">
            <AuthStatus message={state.message} success={state.success} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" name="email" type="email" placeholder="name@clinic.ph" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              name="role"
              defaultValue="receptionist"
              className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-100"
            >
              {ASSIGNABLE_USER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </div>
          <SubmitButton className="w-full md:w-auto">Create invite</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
