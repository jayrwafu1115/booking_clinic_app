"use client";

import { useActionState } from "react";
import { Loader2, Zap } from "lucide-react";
import { initiatePlanUpgradeAction } from "@/server/actions/billing";

type Props = {
  planId: string;
  isPro: boolean;
};

const initialState = { message: undefined };

export function UpgradePlanButton({ planId, isPro }: Props) {
  const [state, action, pending] = useActionState(initiatePlanUpgradeAction, initialState);

  return (
    <form action={action}>
      <input type="hidden" name="planId" value={planId} />
      {state?.message && (
        <p className="mb-2 text-center text-xs text-red-500">{state.message}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition disabled:opacity-60 ${
          isPro
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-slate-900 text-white hover:bg-slate-700"
        }`}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        {pending ? "Redirecting…" : "Upgrade Now"}
      </button>
    </form>
  );
}
