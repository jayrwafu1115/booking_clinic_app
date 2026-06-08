import { AccessCard } from "@/components/settings/access-card";
import { SectionHeader } from "@/components/settings/section-header";
import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";
import { getNotificationSettingsData } from "@/server/queries/settings";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  try {
    const data = await getNotificationSettingsData();

    if (!data) {
      return <AccessCard title="Notifications unavailable" message="Sign in with a clinic account to manage notification preferences." />;
    }

    return (
      <div className="space-y-6">
        <SectionHeader
          eyebrow="Settings"
          title="Notifications"
          description="Configure Resend email notifications, SMS preferences, and appointment reminder timing for your clinic."
        />
        {!data.canEdit ? (
          <AccessCard
            title="Read-only access"
            message="Clinic owners can edit notification preferences. Your current role has read-only access."
          />
        ) : null}
        <NotificationPreferencesForm settings={data.settings} canEdit={data.canEdit} />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load notification settings.";
    return <AccessCard title="Notifications could not load" message={message} />;
  }
}
