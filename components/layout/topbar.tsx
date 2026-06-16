"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sidebar } from "./sidebar";
import type { NotificationItem } from "@/server/queries/notifications";
import type { Profile } from "@/types/database";

export function Topbar({
  profile,
  notifications,
  aiEnabled,
  clinicBrand,
}: {
  profile: Profile | null;
  notifications: NotificationItem[];
  aiEnabled: boolean;
  clinicBrand?: { name: string; logo_url: string | null } | null;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-white px-4 lg:hidden print:hidden">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="left-0 top-0 h-full max-w-[280px] translate-x-0 translate-y-0 rounded-none p-0">
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <Sidebar
            role={profile?.role ?? null}
            aiEnabled={aiEnabled}
            clinicBrand={clinicBrand}
            profile={profile}
            notifications={notifications}
          />
        </DialogContent>
      </Dialog>

      <span className="flex-1 truncate text-sm font-semibold text-slate-900">
        {clinicBrand?.name ?? "ClinicFlow AI PH"}
      </span>
    </header>
  );
}
