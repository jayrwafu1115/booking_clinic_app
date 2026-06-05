import { AccessCard } from "@/components/settings/access-card";
import { SectionHeader } from "@/components/settings/section-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuditLogsData } from "@/server/queries/settings";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila"
  }).format(new Date(value));
}

export default async function AuditLogsPage() {
  try {
    const data = await getAuditLogsData();

    if (!data) {
      return <AccessCard title="Audit logs unavailable" message="Sign in with a clinic account to view audit activity." />;
    }

    if (!data.canView) {
      return <AccessCard title="Owner access required" message="Clinic owners can view audit logs for settings and team changes." />;
    }

    return (
      <div className="space-y-6">
        <SectionHeader
          eyebrow="Settings"
          title="Audit Logs"
          description="Review tenant-scoped events for clinic settings, user invites, role changes, and deactivations."
        />
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.logs.length === 0 ? <p className="text-sm text-slate-500">No audit activity yet.</p> : null}
            {data.logs.map((log) => (
              <div key={log.id} className="grid gap-3 rounded-2xl border border-border p-4 lg:grid-cols-[220px_1fr]">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{log.action}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(log.created_at)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">
                    {log.entity_type}
                    {log.entity_id ? ` · ${log.entity_id}` : ""}
                  </p>
                  <pre className="overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load audit logs.";
    return <AccessCard title="Audit logs could not load" message={message} />;
  }
}
