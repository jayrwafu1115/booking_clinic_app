"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Bell, Check, LogOut, Menu, Search, X, XCircle } from "lucide-react";
import { logoutAction } from "@/server/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sidebar } from "./sidebar";
import type { NotificationItem } from "@/server/queries/notifications";
import type { Profile } from "@/types/database";

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

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function NotificationBell({ notifications }: { notifications: NotificationItem[] }) {
  const failed = notifications.filter((n) => n.status === "failed").length;
  const count = notifications.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold leading-none text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" onCloseAutoFocus={(e) => e.preventDefault()}>
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
              <div
                key={n.id}
                className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-0"
              >
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${n.status === "failed" ? "bg-red-100" : "bg-green-100"}`}>
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

function SearchBar() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    router.push(`/patients?q=${encodeURIComponent(q)}`);
  }

  function handleClear() {
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit} className="relative hidden w-full max-w-md sm:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        ref={inputRef}
        className="pl-9 pr-8"
        placeholder="Search patients by name, phone, or email…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
  );
}

export function Topbar({ profile, notifications, aiEnabled }: { profile: Profile | null; notifications: NotificationItem[]; aiEnabled: boolean }) {
  const initials = getInitials(profile?.full_name);
  const roleName = profile?.role
    ? profile.role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    : "User";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:px-6">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open sidebar">
            <Menu className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <Sidebar role={profile?.role ?? null} aiEnabled={aiEnabled} />
        </DialogContent>
      </Dialog>

      <SearchBar />

      <div className="ml-auto flex items-center gap-2">
        <NotificationBell notifications={notifications} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-semibold text-slate-900">{profile?.full_name ?? "User"}</p>
              <p className="truncate text-xs text-slate-500">{roleName}</p>
            </div>
            <div className="my-1 h-px bg-border" />
            <form action={logoutAction}>
              <button className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100" type="submit">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
