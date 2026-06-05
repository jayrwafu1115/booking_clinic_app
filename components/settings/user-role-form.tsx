"use client";

import { useActionState } from "react";
import { AuthStatus } from "@/components/forms/auth-status";
import { SubmitButton } from "@/components/forms/submit-button";
import { ASSIGNABLE_USER_ROLES } from "@/lib/constants/app";
import { updateUserRoleAction } from "@/server/actions/settings";
import type { AssignableUserRole } from "@/types/database";

function roleLabel(role: string) {
  return role
    .split("_")
    .map((word) => word.replace(/^\w/, (letter) => letter.toUpperCase()))
    .join(" ");
}

export function UserRoleForm({
  userId,
  role,
  disabled
}: {
  userId: string;
  role: AssignableUserRole;
  disabled?: boolean;
}) {
  const [state, formAction] = useActionState(updateUserRoleAction, {});

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          name="role"
          defaultValue={role}
          disabled={disabled}
          className="h-10 rounded-xl border border-input bg-white px-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-100 disabled:opacity-60"
        >
          {ASSIGNABLE_USER_ROLES.map((item) => (
            <option key={item} value={item}>
              {roleLabel(item)}
            </option>
          ))}
        </select>
        <SubmitButton className="h-10 w-full px-3 sm:w-auto" disabled={disabled}>
          Update
        </SubmitButton>
      </div>
      <AuthStatus message={state.message} success={state.success} />
    </form>
  );
}
