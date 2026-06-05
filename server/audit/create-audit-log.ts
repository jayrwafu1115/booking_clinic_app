"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createAuditLog({
  clinicId,
  actorId,
  action,
  entityType,
  entityId,
  metadata = {}
}: {
  clinicId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("audit_logs").insert({
    clinic_id: clinicId,
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata
  });

  if (error) {
    throw new Error(`Could not create audit log: ${error.message}`);
  }
}
