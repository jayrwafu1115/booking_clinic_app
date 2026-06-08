"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  Building2,
  CreditCard,
  LayoutDashboard,
  Settings,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Platform Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/clinics", label: "Clinics", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/ai-usage", label: "AI Usage", icon: Bot },
  { href: "/admin/metrics", label: "Platform Metrics", icon: BarChart3 }
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col gap-6 overflow-y-auto border-r border-slate-200 bg-slate-950 px-4 py-5">
      <Link href="/admin" className="flex items-center gap-3 px-2 text-base font-bold text-white">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Settings className="h-5 w-5" />
        </span>
        Super Admin
      </Link>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <LayoutDashboard className="h-4 w-4" />
          Back to Clinic View
        </Link>
      </div>
    </aside>
  );
}
