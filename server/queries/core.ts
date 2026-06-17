import { cache } from "react";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { hasPermission, profileHasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppointmentWithRelations, AvailabilityRule, BlockedDate, Doctor, Patient, Profile, Service } from "@/types/database";

export type ClinicBrand = {
  name: string;
  logo_url: string | null;
};

export const getClinicBrand = cache(async (): Promise<ClinicBrand | null> => {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return null;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("clinics")
    .select("name, logo_url")
    .eq("id", profile.clinic_id)
    .maybeSingle<ClinicBrand>();

  return data ?? null;
});

export type AccessContext = {
  profile: Profile;
  clinicId: string;
};

export type PatientStatusCounts = {
  active: number;
  critical: number;
  inactive: number;
};

export type PaginatedPatients = {
  profile: Profile;
  patients: Patient[];
  query: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  statusCounts: PatientStatusCounts;
  canManage: boolean;
};

async function getAccessContext(permission: Parameters<typeof hasPermission>[1]): Promise<AccessContext | null> {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  if (!user || !profile?.clinic_id || !profileHasPermission(profile, permission)) {
    return null;
  }

  return { profile, clinicId: profile.clinic_id };
}

function cleanSearch(value: string) {
  return value.trim().replace(/[,%]/g, "");
}

export async function getPatientsData(searchParams?: { q?: string; page?: string }): Promise<PaginatedPatients | null> {
  const context = await getAccessContext("patients:view");
  if (!context) {
    return null;
  }

  const pageSize = 10;
  const page = Math.max(Number(searchParams?.page ?? 1) || 1, 1);
  const query = cleanSearch(searchParams?.q ?? "");
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const supabase = await createSupabaseServerClient();

  let request = supabase
    .from("patients")
    .select("*", { count: "exact" })
    .eq("clinic_id", context.clinicId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (query) {
    request = request.or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`);
  }

  const [
    { data, error, count },
    { count: activeCount },
    { count: criticalCount },
    { count: inactiveCount }
  ] = await Promise.all([
    request.returns<Patient[]>(),
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", context.clinicId).eq("status", "active"),
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", context.clinicId).eq("status", "critical"),
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", context.clinicId).eq("status", "inactive")
  ]);

  if (error) {
    throw new Error(error.message);
  }

  return {
    profile: context.profile,
    patients: data ?? [],
    query,
    page,
    pageSize,
    total: count ?? 0,
    totalPages: Math.max(Math.ceil((count ?? 0) / pageSize), 1),
    statusCounts: {
      active: activeCount ?? 0,
      critical: criticalCount ?? 0,
      inactive: inactiveCount ?? 0
    },
    canManage: profileHasPermission(context.profile, "patients:manage")
  };
}

export async function getPatientData(
  id: string
): Promise<{ profile: Profile; patient: Patient; appointments: AppointmentWithRelations[]; canManage: boolean } | null> {
  const context = await getAccessContext("patients:view");
  if (!context) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const [patientResult, appointmentsResult] = await Promise.all([
    supabase.from("patients").select("*").eq("clinic_id", context.clinicId).eq("id", id).single<Patient>(),
    supabase
      .from("appointments")
      .select("*, doctors(id,full_name,specialization), services(id,name,duration_minutes,price_centavos,color), patients(id,full_name,phone,email)")
      .eq("clinic_id", context.clinicId)
      .eq("patient_id", id)
      .order("start_at", { ascending: false })
      .limit(50)
      .returns<AppointmentWithRelations[]>()
  ]);

  if (patientResult.error || !patientResult.data) {
    throw new Error(patientResult.error?.message ?? "Patient not found.");
  }

  return {
    profile: context.profile,
    patient: patientResult.data,
    appointments: appointmentsResult.data ?? [],
    canManage: profileHasPermission(context.profile, "patients:manage")
  };
}

export async function getDoctorsData(): Promise<{ profile: Profile; doctors: Doctor[]; doctorProfiles: Profile[]; canManage: boolean } | null> {
  const context = await getAccessContext("doctors:view");
  if (!context) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const [doctorsResult, profilesResult] = await Promise.all([
    supabase.from("doctors").select("*").eq("clinic_id", context.clinicId).order("full_name").returns<Doctor[]>(),
    supabase
      .from("profiles")
      .select("*")
      .eq("clinic_id", context.clinicId)
      .eq("role", "doctor")
      .eq("status", "active")
      .order("full_name")
      .returns<Profile[]>()
  ]);

  if (doctorsResult.error) {
    throw new Error(doctorsResult.error.message);
  }

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  return {
    profile: context.profile,
    doctors: doctorsResult.data ?? [],
    doctorProfiles: profilesResult.data ?? [],
    canManage: profileHasPermission(context.profile, "doctors:manage")
  };
}

export async function getDoctorData(id?: string): Promise<{ profile: Profile; doctor: Doctor | null; doctorProfiles: Profile[]; canManage: boolean } | null> {
  const data = await getDoctorsData();
  if (!data) {
    return null;
  }

  if (!id) {
    return { ...data, doctor: null };
  }

  const doctor = data.doctors.find((item) => item.id === id) ?? null;
  if (!doctor) {
    throw new Error("Doctor not found.");
  }

  return { ...data, doctor };
}

export async function getServicesData(): Promise<{ profile: Profile; services: Service[]; canManage: boolean } | null> {
  const context = await getAccessContext("services:view");
  if (!context) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("clinic_id", context.clinicId)
    .order("active", { ascending: false })
    .order("name")
    .returns<Service[]>();

  if (error) {
    throw new Error(error.message);
  }

  return { profile: context.profile, services: data ?? [], canManage: profileHasPermission(context.profile, "services:manage") };
}

export async function getServiceData(id?: string): Promise<{ profile: Profile; service: Service | null; canManage: boolean } | null> {
  const data = await getServicesData();
  if (!data) {
    return null;
  }

  if (!id) {
    return { ...data, service: null };
  }

  const service = data.services.find((item) => item.id === id) ?? null;
  if (!service) {
    throw new Error("Service not found.");
  }

  return { ...data, service };
}

export async function getAvailabilityData(): Promise<{
  profile: Profile;
  doctors: Doctor[];
  rules: AvailabilityRule[];
  blockedDates: BlockedDate[];
  canManage: boolean;
} | null> {
  const context = await getAccessContext("availability:view");
  if (!context) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const [doctorsResult, rulesResult, blockedResult] = await Promise.all([
    supabase.from("doctors").select("*").eq("clinic_id", context.clinicId).eq("active", true).order("full_name").returns<Doctor[]>(),
    supabase.from("availability_rules").select("*").eq("clinic_id", context.clinicId).order("day_of_week").returns<AvailabilityRule[]>(),
    supabase
      .from("blocked_dates")
      .select("*")
      .eq("clinic_id", context.clinicId)
      .order("start_at", { ascending: false })
      .limit(100)
      .returns<BlockedDate[]>()
  ]);

  if (doctorsResult.error) {
    throw new Error(doctorsResult.error.message);
  }

  if (rulesResult.error) {
    throw new Error(rulesResult.error.message);
  }

  if (blockedResult.error) {
    throw new Error(blockedResult.error.message);
  }

  return {
    profile: context.profile,
    doctors: doctorsResult.data ?? [],
    rules: rulesResult.data ?? [],
    blockedDates: blockedResult.data ?? [],
    canManage: profileHasPermission(context.profile, "availability:manage")
  };
}
