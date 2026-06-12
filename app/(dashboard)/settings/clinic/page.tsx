import { AccessCard } from "@/components/settings/access-card";
import { ClinicProfileForm } from "@/components/settings/clinic-profile-form";
import { PublicWebsiteCard } from "@/components/settings/public-website-card";
import { SectionHeader } from "@/components/settings/section-header";
import { getClinicPlanFeatures } from "@/server/queries/billing";
import { getClinicSettingsData } from "@/server/queries/settings";

export const dynamic = "force-dynamic";

export default async function ClinicSettingsPage() {
  try {
    const [data, planFeatures] = await Promise.all([getClinicSettingsData(), getClinicPlanFeatures()]);

    if (!data) {
      return <AccessCard title="Clinic profile unavailable" message="Sign in with a clinic account to manage these settings." />;
    }

    return (
      <div className="space-y-6">
        <SectionHeader
          eyebrow="Settings"
          title="Clinic Settings"
          description="Manage the Philippines clinic profile, compliance details, branding, and locked workspace defaults."
        />
        {!data.canEdit ? (
          <AccessCard title="Read-only access" message="Clinic owners can edit these settings. Your current role can view the clinic profile." />
        ) : null}
        <PublicWebsiteCard clinicSlug={data.clinic.slug} enabled={planFeatures.publicWebsiteEnabled} />
        <ClinicProfileForm clinic={data.clinic} settings={data.settings} canEdit={data.canEdit} />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load clinic settings.";
    return <AccessCard title="Settings could not load" message={message} />;
  }
}
