"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell, Bot, CalendarDays, Check, ClipboardCheck, ClipboardList, CreditCard,
  DoorOpen, LayoutDashboard, LineChart, LogOut, Package, Receipt, RefreshCw,
  Search, Settings, ShieldCheck, Sparkles, Stethoscope, Ticket, UserCog,
  Users, Wallet, X, XCircle
} from "lucide-react";
import { logoutAction } from "@/server/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { hasPermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import type { Permission } from "@/lib/auth/permissions";
import type { NotificationItem } from "@/server/queries/notifications";
import type { Profile, UserRole } from "@/types/database";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions?: Permission[];
  requiresAi?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
  requiresAi?: boolean;
};

type SearchableItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: string;
};

const sections: NavSection[] = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/appointments", label: "Appointments", icon: ClipboardList, permissions: ["appointments:view_all", "appointments:manage"] },
      { href: "/calendar", label: "Calendar", icon: CalendarDays, permissions: ["appointments:view_all", "appointments:view_assigned"] },
      { href: "/appointments/waitlist", label: "Waitlist", icon: ClipboardList, permissions: ["appointments:manage"] },
      { href: "/appointments/recurring", label: "Recurring", icon: RefreshCw, permissions: ["appointments:manage"] },
      { href: "/queue", label: "Queue", icon: Ticket, permissions: ["queue:view"] },
      { href: "/patients", label: "Patients", icon: Users, permissions: ["patients:view"] },
      { href: "/services", label: "Services", icon: Stethoscope, permissions: ["services:view"] },
      { href: "/doctors", label: "Doctors", icon: UserCog, permissions: ["doctors:view"] },
      { href: "/availability", label: "Availability", icon: CalendarDays, permissions: ["availability:view"] },
    ],
  },
  {
    label: "Clinical",
    items: [
      { href: "/forms", label: "Intake Forms", icon: ClipboardCheck, permissions: ["forms:view"] },
    ],
  },
  {
    label: "AI Assistant",
    requiresAi: true,
    items: [
      { href: "/ai/conversations", label: "AI Conversations", icon: Bot, permissions: ["ai:view"], requiresAi: true },
      { href: "/ai/settings", label: "AI Settings", icon: Settings, permissions: ["ai:manage"], requiresAi: true },
      { href: "/ai/faq", label: "FAQ Knowledge Base", icon: Sparkles, permissions: ["ai:manage"], requiresAi: true },
      { href: "/ai/widget", label: "Widget & Embed", icon: Bot, permissions: ["ai:manage"], requiresAi: true },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/invoices", label: "Invoices", icon: Receipt, permissions: ["invoices:view"] },
      { href: "/packages", label: "Packages", icon: Package, permissions: ["packages:view"] },
      { href: "/billing", label: "Billing & Plans", icon: CreditCard, permissions: ["billing:view"] },
      { href: "/billing/payments", label: "Payments", icon: Wallet, permissions: ["billing:view"] },
      { href: "/reports", label: "Reports", icon: LineChart, permissions: ["billing:view"] },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/settings/clinic", label: "Clinic Settings", icon: Settings, permissions: ["clinic_settings:update"] },
      { href: "/settings/users", label: "Users & Roles", icon: Users, permissions: ["team:view"] },
      { href: "/settings/notifications", label: "Notifications", icon: Sparkles, permissions: ["clinic_settings:update"] },
      { href: "/settings/rooms", label: "Rooms", icon: DoorOpen, permissions: ["rooms:manage"] },
      { href: "/settings/security", label: "Security & 2FA", icon: ShieldCheck },
      { href: "/settings/audit-logs", label: "Audit Logs", icon: ClipboardList, permissions: ["audit_logs:view"] },
    ],
  },
];

function canSeeItem(item: NavItem, role: UserRole | null, aiEnabled: boolean): boolean {
  if (item.requiresAi && !aiEnabled) return false;
  if (!item.permissions) return true;
  if (!role) return false;
  return item.permissions.some((p) => hasPermission(role, p));
}

function clinicInitials(name: string) {
  return (
    name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CF"
  );
}

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

// ─── Search (fixed, not scrollable) ─────────────────────────────────────────

function SidebarSearch({ items }: { items: SearchableItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  const query = value.trim().toLowerCase();
  const filtered = query
    ? items.filter((item) => item.label.toLowerCase().includes(query))
    : [];
  const showDropdown = open && query.length > 0;

  // F to focus, Esc to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setValue("");
        setOpen(false);
        inputRef.current?.blur();
        return;
      }
      if (
        e.key === "f" &&
        !e.metaKey && !e.ctrlKey && !e.altKey &&
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // Close when route changes
  useEffect(() => {
    setValue("");
    setOpen(false);
  }, [pathname]);

  function handleSelect(href: string) {
    router.push(href);
    setValue("");
    setOpen(false);
  }

  function handleAssistant() {
    router.push(`/patients?q=${encodeURIComponent(value.trim())}`);
    setValue("");
    setOpen(false);
  }

  function handleClear() {
    setValue("");
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative px-3 py-2.5">
      {/* Input */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); }}
          onFocus={() => { if (value) setOpen(true); }}
          placeholder="Find..."
          aria-label="Search navigation"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-12 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus-visible:border-blue-400 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
        />
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search (Esc)"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 transition-colors hover:text-slate-700"
          >
            Esc
          </button>
        ) : (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded border border-slate-200 bg-white text-[10px] font-bold text-slate-400"
          >
            F
          </span>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          role="listbox"
          aria-label="Search results"
          className="absolute left-3 right-3 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-white shadow-xl"
        >
          {filtered.slice(0, 7).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                role="option"
                aria-selected={false}
                onClick={() => handleSelect(item.href)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50">
                  <Icon className="h-4 w-4 text-slate-500" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.section}</p>
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-400">
              No pages match &ldquo;{value}&rdquo;
            </div>
          )}

          <div className={cn("border-t border-border", filtered.length === 0 && "border-t-0")}>
            <button
              onClick={handleAssistant}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50">
                <Sparkles className="h-4 w-4 text-violet-500" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">&ldquo;{value}&rdquo;</p>
                <p className="text-xs text-slate-400">Find Patient</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Notification Bell ───────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  booking_confirmation: "Booking confirmed",
  appointment_confirmed: "Appointment confirmed",
  appointment_rescheduled: "Appointment rescheduled",
  appointment_cancelled: "Appointment cancelled",
  appointment_reminder: "Appointment reminder",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotificationBell({ notifications }: { notifications: NotificationItem[] }) {
  const failed = notifications.filter((n) => n.status === "failed").length;
  const count = notifications.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold leading-none text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-80 p-0" onCloseAutoFocus={(e) => e.preventDefault()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">Notifications</p>
          {failed > 0 && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
              {failed} failed
            </span>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {count === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Bell className="h-8 w-8 text-slate-200" />
              <p className="text-sm font-medium text-slate-500">No notifications yet</p>
              <p className="text-xs text-slate-400">Sent emails and SMS will appear here.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-0">
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    n.status === "failed" ? "bg-red-100" : "bg-green-100"
                  }`}
                >
                  {n.status === "failed"
                    ? <XCircle className="h-4 w-4 text-red-500" />
                    : <Check className="h-4 w-4 text-green-600" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {TYPE_LABELS[n.notification_type] ?? n.notification_type}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {n.patient_name ? `To: ${n.patient_name}` : n.recipient}
                    {" · "}
                    <span className="capitalize">{n.channel}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border px-4 py-2 text-center">
          <p className="text-xs text-slate-400">Last 20 · Email & SMS send log</p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Bottom bar ──────────────────────────────────────────────────────────────

function SidebarBottom({
  profile,
  notifications,
}: {
  profile: Profile | null;
  notifications: NotificationItem[];
}) {
  const initials = getInitials(profile?.full_name);
  const roleName = profile?.role
    ? profile.role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    : "User";

  return (
    <div className="shrink-0 border-t border-border px-3 py-3">
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`${profile?.full_name ?? "Account"} — open menu`}
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 text-left">
                <p className="truncate text-xs font-semibold text-slate-900">{profile?.full_name ?? "User"}</p>
                <p className="truncate text-[11px] text-slate-400">{roleName}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-semibold text-slate-900">{profile?.full_name ?? "User"}</p>
              <p className="truncate text-xs text-slate-500">{roleName}</p>
            </div>
            <div className="my-1 h-px bg-border" />
            <form action={logoutAction}>
              <button
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                type="submit"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>

        <NotificationBell notifications={notifications} />
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export type SidebarProps = {
  role: UserRole | null;
  aiEnabled: boolean;
  clinicBrand?: { name: string; logo_url: string | null } | null;
  profile: Profile | null;
  notifications: NotificationItem[];
};

export function Sidebar({ role, aiEnabled, clinicBrand, profile, notifications }: SidebarProps) {
  const pathname = usePathname();
  const brandName = clinicBrand?.name ?? "Book Clinic PH";

  const searchableItems: SearchableItem[] = sections.flatMap((section) => {
    if (section.requiresAi && !aiEnabled) return [];
    return section.items
      .filter((item) => canSeeItem(item, role, aiEnabled))
      .map((item) => ({ href: item.href, label: item.label, icon: item.icon, section: section.label }));
  });

  return (
    <aside className="flex h-full flex-col">
      {/* Fixed top: clinic brand */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50"
        >
          {clinicBrand?.logo_url ? (
            <span
              aria-hidden="true"
              className="h-7 w-7 shrink-0 rounded-lg bg-cover bg-center ring-1 ring-slate-200"
              style={{ backgroundImage: `url(${clinicBrand.logo_url})` }}
            />
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
              {clinicInitials(brandName)}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
            {brandName}
          </span>
        </Link>
      </div>

      {/* Fixed search — not inside the scrollable section */}
      <div className="relative shrink-0 border-b border-border">
        <SidebarSearch items={searchableItems} />
      </div>

      {/* Scrollable nav */}
      <div className="flex-1 overflow-y-auto">
        <nav className="px-3 py-3">
          <div className="space-y-4">
            {sections.map((section) => {
              if (section.requiresAi && !aiEnabled) return null;
              const visibleItems = section.items.filter((item) => canSeeItem(item, role, aiEnabled));
              if (visibleItems.length === 0) return null;

              return (
                <div key={section.label}>
                  <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {section.label}
                  </p>
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const active =
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href));
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950",
                            active && "bg-blue-50 text-blue-700"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Fixed bottom: account + notifications */}
      <SidebarBottom profile={profile} notifications={notifications} />
    </aside>
  );
}
