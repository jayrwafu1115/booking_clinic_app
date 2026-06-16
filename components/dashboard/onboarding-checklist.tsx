"use client";

import Link from "next/link";
import { CheckCircle2, Circle, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingStatus } from "@/server/queries/onboarding";

export function OnboardingChecklist({ status }: { status: OnboardingStatus }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || status.isComplete) return null;

  const pct = Math.round((status.completedCount / status.totalCount) * 100);

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-base text-slate-900">
              Get your clinic ready — {status.completedCount}/{status.totalCount} steps done
            </CardTitle>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2">
          {status.steps.map((step) => (
            <li key={step.id}>
              {step.completed ? (
                <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 opacity-60">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600" />
                  <span className="text-sm font-medium text-slate-700 line-through">{step.label}</span>
                </div>
              ) : (
                <Link
                  href={step.href}
                  className="group flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-xs ring-1 ring-slate-200 transition-shadow hover:shadow-sm hover:ring-blue-300"
                >
                  <Circle className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-blue-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                    <p className="text-xs text-slate-500 truncate">{step.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-blue-500" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
