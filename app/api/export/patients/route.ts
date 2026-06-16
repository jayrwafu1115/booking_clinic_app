import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  // Use getCurrentProfile (no redirect) so errors return proper HTTP responses
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  type PatientRow = {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    birth_date: string | null;
    gender: string | null;
    address: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    created_at: string;
  };

  const { data, error } = await supabase
    .from("patients")
    .select("id, full_name, email, phone, birth_date, gender, address, emergency_contact_name, emergency_contact_phone, created_at")
    .eq("clinic_id", profile.clinic_id)
    .order("full_name", { ascending: true })
    .returns<PatientRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];

  const header = [
    "ID",
    "Full Name",
    "Email",
    "Phone",
    "Birth Date",
    "Gender",
    "Address",
    "Emergency Contact Name",
    "Emergency Contact Phone",
    "Created At",
  ];

  const csvRows = [
    header.join(","),
    ...rows.map((p) =>
      [
        p.id,
        csvEscape(p.full_name),
        csvEscape(p.email ?? ""),
        csvEscape(p.phone ?? ""),
        p.birth_date ?? "",
        p.gender ?? "",
        csvEscape(p.address ?? ""),
        csvEscape(p.emergency_contact_name ?? ""),
        csvEscape(p.emergency_contact_phone ?? ""),
        p.created_at,
      ].join(",")
    ),
  ];

  const csv = csvRows.join("\r\n");
  const now = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="patients-${now}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
