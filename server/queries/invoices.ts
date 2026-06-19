"use server";

import { getCurrentProfile } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { InvoiceWithRelations } from "@/types/database";

const INVOICE_WITH_RELATIONS = `
  *,
  patients(id, full_name, phone, email),
  invoice_items(*),
  payments(*)
` as const;

export async function getInvoicesData(searchParams?: {
  q?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
}) {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return null;
  if (!profileHasPermission(profile, "invoices:view")) return null;

  const PAGE_SIZE = 20;
  const page = Math.max(1, parseInt(searchParams?.page ?? "1", 10));
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("invoices")
    .select(`${INVOICE_WITH_RELATIONS}`, { count: "exact" })
    .eq("clinic_id", profile.clinic_id)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (searchParams?.status)   query = query.eq("status", searchParams.status);
  if (searchParams?.q)        query = query.ilike("invoice_number", `%${searchParams.q}%`);
  if (searchParams?.dateFrom) query = query.gte("created_at", `${searchParams.dateFrom}T00:00:00`);
  if (searchParams?.dateTo)   query = query.lte("created_at", `${searchParams.dateTo}T23:59:59`);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  return {
    invoices: (data ?? []) as InvoiceWithRelations[],
    total: count ?? 0,
    page,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
    canManage: profileHasPermission(profile, "invoices:manage"),
    filters: {
      q: searchParams?.q ?? "",
      status: searchParams?.status ?? "",
      dateFrom: searchParams?.dateFrom ?? "",
      dateTo: searchParams?.dateTo ?? "",
    },
  };
}

export async function getInvoiceData(id: string) {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return null;
  if (!profileHasPermission(profile, "invoices:view")) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_WITH_RELATIONS)
    .eq("clinic_id", profile.clinic_id)
    .eq("id", id)
    .single<InvoiceWithRelations>();

  if (error || !data) return null;

  return {
    invoice: data,
    canManage: profileHasPermission(profile, "invoices:manage"),
  };
}

export async function getNextInvoiceNumber(clinicId: string): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .like("invoice_number", `INV-${ym}-%`);

  const seq = String((count ?? 0) + 1).padStart(4, "0");
  return `INV-${ym}-${seq}`;
}
