import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ModuleHeader({
  eyebrow,
  title,
  description,
  action,
  icon: Icon
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: { href: string; label: string; icon?: LucideIcon };
  icon?: LucideIcon;
}) {
  const ActionIcon = action?.icon;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className="mt-1 rounded-2xl bg-blue-50 p-3 text-blue-600">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">{title}</h1>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
      </div>
      {action ? (
        <Button asChild>
          <Link href={action.href}>
            {ActionIcon ? <ActionIcon className="h-4 w-4" /> : null}
            {action.label}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
