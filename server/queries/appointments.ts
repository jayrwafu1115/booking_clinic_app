import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";
import { APPOINTMENT_STATUSES } from "@/lib/constants/appointments";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppointmentStatus, AppointmentWithRelations, Doctor, Patient, Profile, Service } from "@/types/database";

export type AppointmentFilters = {
  doctorId?: string;
  serviceId?: string;
  status?: AppointmentStatus;
  page?: string;
};

export type AppointmentOptions = {
  patients: Patient[];
  doctors: Doctor[];
  services: Service[];
};

async function getAppointmentContext() {
  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  if (!user || !profile?.clinic_id) {
    return null;
  }

  const canViewAll = profileHasPermission(profile, "appointments:view_all");
  const canViewAssigned = profileHasPermission(profile, "appointments:view_assigned");
  const canManage = profileHasPermission(profile, "appointments:manage");

  if (!canViewAll && !canViewAssigned) {
    return null;
  }

  return { user, profile, clinicId: profile.clinic_id, canViewAll, canViewAssigned, canManage };
}

async function getAssignedDoctorIds(profile: Profile) {
  if (!profile.clinic_id) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("doctors")
    .select("id")
    .eq("clinic_id", profile.clinic_id)
    .eq("profile_id", profile.id)
    .returns<{ id: string }[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((doctor) => doctor.id);
}

function baseAppointmentSelect() {
  return `
    *,
    patients(id, full_name, phone, email),
    doctors(id, full_name, specialization),
    services(id, name, duration_minutes, price_centavos, color)
  `;
}

export async function getAppointmentOptions(): Promise<({ profile: Profile; canManage: boolean } & AppointmentOptions) | null> {
  const context = await getAppointmentContext();
  if (!context) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const [patientsResult, doctorsResult, servicesResult] = await Promise.all([
    supabase.from("patients").select("*").eq("clinic_id", context.clinicId).order("full_name").limit(200).returns<Patient[]>(),
    supabase.from("doctors").select("*").eq("clinic_id", context.clinicId).eq("active", true).order("full_name").returns<Doctor[]>(),
    supabase.from("services").select("*").eq("clinic_id", context.clinicId).eq("active", true).order("name").returns<Service[]>()
  ]);

  if (patientsResult.error) {
    throw new Error(patientsResult.error.message);
  }

  if (doctorsResult.error) {
    throw new Error(doctorsResult.error.message);
  }

  if (servicesResult.error) {
    throw new Error(servicesResult.error.message);
  }

  return {
    profile: context.profile,
    canManage: context.canManage,
    patients: patientsResult.data ?? [],
    doctors: doctorsResult.data ?? [],
    services: servicesResult.data ?? []
  };
}

export async function getAppointmentsData(filters: AppointmentFilters = {}) {
  const context = await getAppointmentContext();
  if (!context) {
    return null;
  }

  const pageSize = 15;
  const page = Math.max(Number(filters.page ?? 1) || 1, 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const supabase = await createSupabaseServerClient();

  let request = supabase
    .from("appointments")
    .select(baseAppointmentSelect(), { count: "exact" })
    .eq("clinic_id", context.clinicId)
    .order("start_at", { ascending: true })
    .range(from, to);

  if (filters.status && APPOINTMENT_STATUSES.includes(filters.status)) {
    request = request.eq("status", filters.status);
  }

  if (filters.doctorId) {
    request = request.eq("doctor_id", filters.doctorId);
  }

  if (filters.serviceId) {
    request = request.eq("service_id", filters.serviceId);
  }

  if (!context.canViewAll) {
    const assignedDoctorIds = await getAssignedDoctorIds(context.profile);
    if (assignedDoctorIds.length === 0) {
      return {
        profile: context.profile,
        appointments: [],
        options: await getAppointmentOptions(),
        page,
        pageSize,
        total: 0,
        totalPages: 1,
        filters,
        canManage: context.canManage
      };
    }

    request = request.in("doctor_id", assignedDoctorIds);
  }

  const { data, error, count } = await request.returns<AppointmentWithRelations[]>();
  if (error) {
    throw new Error(error.message);
  }

  return {
    profile: context.profile,
    appointments: data ?? [],
    options: await getAppointmentOptions(),
    page,
    pageSize,
    total: count ?? 0,
    totalPages: Math.max(Math.ceil((count ?? 0) / pageSize), 1),
    filters,
    canManage: context.canManage
  };
}

export async function getAppointmentData(id: string) {
  const context = await getAppointmentContext();
  if (!context) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  let request = supabase.from("appointments").select(baseAppointmentSelect()).eq("clinic_id", context.clinicId).eq("id", id);

  if (!context.canViewAll) {
    const assignedDoctorIds = await getAssignedDoctorIds(context.profile);
    if (assignedDoctorIds.length === 0) {
      throw new Error("Appointment not found.");
    }
    request = request.in("doctor_id", assignedDoctorIds);
  }

  const { data, error } = await request.single<AppointmentWithRelations>();
  if (error || !data) {
    throw new Error(error?.message ?? "Appointment not found.");
  }

  return { profile: context.profile, appointment: data, options: await getAppointmentOptions(), canManage: context.canManage };
}

export async function getCalendarAppointmentsData(filters: AppointmentFilters = {}) {
  const context = await getAppointmentContext();
  if (!context) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  let request = supabase
    .from("appointments")
    .select(baseAppointmentSelect())
    .eq("clinic_id", context.clinicId)
    .order("start_at", { ascending: true })
    .limit(500);

  if (filters.status && APPOINTMENT_STATUSES.includes(filters.status)) {
    request = request.eq("status", filters.status);
  }

  if (filters.doctorId) {
    request = request.eq("doctor_id", filters.doctorId);
  }

  if (filters.serviceId) {
    request = request.eq("service_id", filters.serviceId);
  }

  if (!context.canViewAll) {
    const assignedDoctorIds = await getAssignedDoctorIds(context.profile);
    if (assignedDoctorIds.length === 0) {
      return { profile: context.profile, appointments: [], options: await getAppointmentOptions(), filters, canManage: context.canManage };
    }
    request = request.in("doctor_id", assignedDoctorIds);
  }

  const { data, error } = await request.returns<AppointmentWithRelations[]>();
  if (error) {
    throw new Error(error.message);
  }

  return {
    profile: context.profile,
    appointments: data ?? [],
    options: await getAppointmentOptions(),
    filters,
    canManage: context.canManage
  };
}
