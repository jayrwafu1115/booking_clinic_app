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
import { hasPermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import type { Permission } from "@/lib/auth/permissions";
import type { UserRole } from "@/types/database";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  // Show if the user has ANY of these permissions. Omit for always-visible items.
  permissions?: Permission[];
  // If true, item is hidden when the clinic's plan does not include AI.
  requiresAi?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
  // If true, the whole section is hidden when AI is not on the plan.
  requiresAi?: boolean;
};

const sections: NavSection[] = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      {
        href: "/appointments",
        label: "Appointments",
        icon: ClipboardList,
        permissions: ["appointments:view_all", "appointments:manage"]
      },
      {
        href: "/calendar",
        label: "Calendar",
        icon: CalendarDays,
        permissions: ["appointments:view_all", "appointments:view_assigned"]
      },
      { href: "/patients", label: "Patients", icon: Users, permissions: ["patients:view"] },
      { href: "/services", label: "Services", icon: Stethoscope, permissions: ["services:view"] },
      { href: "/doctors", label: "Doctors", icon: UserCog, permissions: ["doctors:view"] },
      { href: "/availability", label: "Availability", icon: CalendarDays, permissions: ["availability:view"] }
    ]
  },
  {
    label: "AI Assistant",
    requiresAi: true,
    items: [
      { href: "/ai/conversations", label: "AI Conversations", icon: Bot, permissions: ["ai:view"], requiresAi: true },
      { href: "/ai/settings", label: "AI Settings", icon: Settings, permissions: ["ai:manage"], requiresAi: true },
      { href: "/ai/faq", label: "FAQ Knowledge Base", icon: Sparkles, permissions: ["ai:manage"], requiresAi: true },
      { href: "/ai/widget", label: "Widget & Embed", icon: Bot, permissions: ["ai:manage"], requiresAi: true }
    ]
  },
  {
    label: "Business",
    items: [
      { href: "/billing", label: "Billing & Plans", icon: CreditCard, permissions: ["billing:view"] },
      { href: "/billing/payments", label: "Payments", icon: Wallet, permissions: ["billing:view"] },
      { href: "/reports", label: "Reports", icon: LineChart, permissions: ["billing:view"] }
    ]
  },
  {
    label: "Settings",
    items: [
      { href: "/settings/clinic", label: "Clinic Settings", icon: Settings, permissions: ["clinic_settings:update"] },
      { href: "/settings/users", label: "Users & Roles", icon: Users, permissions: ["team:view"] },
      {
        href: "/settings/notifications",
        label: "Notifications",
        icon: Sparkles,
        permissions: ["clinic_settings:update"]
      },
      { href: "/settings/audit-logs", label: "Audit Logs", icon: ClipboardList, permissions: ["audit_logs:view"] }
    ]
  }
];

function canSeeItem(item: NavItem, role: UserRole | null, aiEnabled: boolean): boolean {
  if (item.requiresAi && !aiEnabled) return false;
  if (!item.permissions) return true;
  if (!role) return false;
  return item.permissions.some((p) => hasPermission(role, p));
}

type SidebarProps = {
  role: UserRole | null;
  aiEnabled: boolean;
  clinicBrand?: { name: string; logo_url: string | null } | null;
};

function clinicInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CF"
  );
}

export function Sidebar({ role, aiEnabled, clinicBrand }: SidebarProps) {
  const pathname = usePathname();
  const brandName = clinicBrand?.name ?? "ClinicFlow AI PH";

  return (
    <aside className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-5">
      <Link href="/dashboard" className="flex items-center gap-3 px-2 text-base font-bold text-slate-950">
        {clinicBrand?.logo_url ? (
          <span
            aria-hidden="true"
            className="h-10 w-10 shrink-0 rounded-xl bg-cover bg-center ring-1 ring-slate-200"
            style={{ backgroundImage: `url(${clinicBrand.logo_url})` }}
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            {clinicInitials(brandName)}
          </span>
        )}
        <span className="truncate">{brandName}</span>
      </Link>
      <nav className="space-y-6">
        {sections.map((section) => {
          if (section.requiresAi && !aiEnabled) return null;
          const visibleItems = section.items.filter((item) => canSeeItem(item, role, aiEnabled));
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label} className="space-y-2">
              <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{section.label}</p>
              <div className="space-y-1">
                {visibleItems.map((item) => {
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
          );
        })}
      </nav>
    </aside>
  );
}
