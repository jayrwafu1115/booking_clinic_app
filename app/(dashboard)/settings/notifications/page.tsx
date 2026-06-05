import { SectionHeader } from "@/components/settings/section-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Settings"
        title="Notifications"
        description="Transactional email settings are prepared for Resend-backed appointment and team notifications."
      />
      <Card>
        <CardHeader>
          <CardTitle>Email Defaults</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold text-slate-950">Provider</p>
            <p className="mt-1 text-sm text-slate-500">Resend</p>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold text-slate-950">From email</p>
            <p className="mt-1 text-sm text-slate-500">Configured with RESEND_FROM_EMAIL</p>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold text-slate-950">Appointment reminders</p>
            <p className="mt-1 text-sm text-slate-500">Planned</p>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold text-slate-950">Team invite emails</p>
            <p className="mt-1 text-sm text-slate-500">Planned</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
