"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CalendarDays,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LineChart,
  Settings,
  Sparkles,
  Stethoscope,
  UserCog,
  Users,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/appointments", label: "Appointments", icon: ClipboardList },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/patients", label: "Patients", icon: Users },
      { href: "/services", label: "Services", icon: Stethoscope },
      { href: "/doctors", label: "Doctors", icon: UserCog },
      { href: "/availability", label: "Availability", icon: CalendarDays }
    ]
  },
  {
    label: "AI Assistant",
    items: [
      { href: "/ai", label: "AI Conversations", icon: Bot },
      { href: "/ai/settings", label: "AI Settings", icon: Settings },
      { href: "/ai/faq", label: "FAQ Knowledge Base", icon: Sparkles },
      { href: "/ai/widget", label: "Widget & Embed", icon: Bot }
    ]
  },
  {
    label: "Business",
    items: [
      { href: "/billing", label: "Billing & Plans", icon: CreditCard },
      { href: "/billing/payments", label: "Payments", icon: Wallet },
      { href: "/reports", label: "Reports", icon: LineChart }
    ]
  },
  {
    label: "Settings",
    items: [
      { href: "/settings/clinic", label: "Clinic Settings", icon: Settings },
      { href: "/settings/users", label: "Users & Roles", icon: Users },
      { href: "/settings/notifications", label: "Notifications", icon: Sparkles },
      { href: "/settings/audit-logs", label: "Audit Logs", icon: ClipboardList }
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-5">
      <Link href="/dashboard" className="flex items-center gap-3 px-2 text-base font-bold text-slate-950">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">CF</span>
        ClinicFlow AI PH
      </Link>
      <nav className="space-y-6">
        {sections.map((section) => (
          <div key={section.label} className="space-y-2">
            <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{section.label}</p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950",
                      active && "bg-blue-50 text-blue-700"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
