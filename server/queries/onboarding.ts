import { getCurrentProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  href: string;
  completed: boolean;
};

export type OnboardingStatus = {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
};

export async function getOnboardingStatus(): Promise<OnboardingStatus | null> {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return null;
  // Only show checklist to clinic_owner
  if (profile.role !== "clinic_owner") return null;

  const supabase = await createSupabaseServerClient();
  const clinicId = profile.clinic_id;

  const [doctorsRes, servicesRes, availRes, settingsRes, appointmentRes] = await Promise.all([
    supabase.from("doctors").select("id").eq("clinic_id", clinicId).limit(1),
    supabase.from("services").select("id").eq("clinic_id", clinicId).limit(1),
    supabase.from("availability_rules").select("id").eq("clinic_id", clinicId).limit(1),
    supabase
      .from("clinic_settings")
      .select("sms_enabled, sms_provider, ai_enabled, widget_enabled")
      .eq("clinic_id", clinicId)
      .maybeSingle<{ sms_enabled: boolean; sms_provider: string | null; ai_enabled: boolean; widget_enabled: boolean }>(),
    supabase.from("appointments").select("id").eq("clinic_id", clinicId).limit(1),
  ]);

  const settings = settingsRes.data;
  const hasDoctor = (doctorsRes.data?.length ?? 0) > 0;
  const hasService = (servicesRes.data?.length ?? 0) > 0;
  const hasAvailability = (availRes.data?.length ?? 0) > 0;
  const hasSms = !!(settings?.sms_enabled && settings.sms_provider);
  const hasWidget = !!(settings?.widget_enabled);
  const hasAppointment = (appointmentRes.data?.length ?? 0) > 0;

  const steps: OnboardingStep[] = [
    {
      id: "add_doctor",
      label: "Add your first doctor",
      description: "Set up a doctor profile so patients can book with them.",
      href: "/doctors/new",
      completed: hasDoctor,
    },
    {
      id: "add_service",
      label: "Create a service",
      description: "Define what services your clinic offers (e.g., General Check-up, Cleaning).",
      href: "/services/new",
      completed: hasService,
    },
    {
      id: "set_availability",
      label: "Set clinic hours",
      description: "Configure your opening hours and appointment slots.",
      href: "/availability",
      completed: hasAvailability,
    },
    {
      id: "activate_sms",
      label: "Activate SMS reminders",
      description: "Send appointment reminders via SMS — reduces no-shows by up to 40%.",
      href: "/settings/notifications",
      completed: hasSms,
    },
    {
      id: "enable_widget",
      label: "Enable the AI booking widget",
      description: "Let patients book through your website with the AI chat widget.",
      href: "/ai/widget",
      completed: hasWidget,
    },
    {
      id: "first_appointment",
      label: "Book your first appointment",
      description: "Create a test appointment to confirm everything is working.",
      href: "/appointments/new",
      completed: hasAppointment,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  return {
    steps,
    completedCount,
    totalCount: steps.length,
    isComplete: completedCount === steps.length,
  };
}
