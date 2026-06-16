"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/server/audit/create-audit-log";

type RoomActionState = { message?: string; success?: boolean };

const roomSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().optional().transform((v) => v || null),
  capacity: z.coerce.number().int().positive().max(100).default(1),
  active: z.enum(["on"]).optional().transform((v) => v === "on"),
});

async function getRoomContext() {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) throw new Error("No clinic profile.");
  assertPermission(profile, "rooms:manage");
  return { user, profile, clinicId: profile.clinic_id };
}

export async function upsertRoomAction(_: RoomActionState, formData: FormData): Promise<RoomActionState> {
  try {
    const parsed = roomSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { message: parsed.error.errors[0]?.message ?? "Invalid room data." };

    const { user, clinicId } = await getRoomContext();
    const supabase = await createSupabaseServerClient();

    const payload = {
      clinic_id: clinicId,
      name: parsed.data.name,
      description: parsed.data.description,
      capacity: parsed.data.capacity,
      active: parsed.data.active,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = parsed.data.id
      ? await supabase.from("rooms").update(payload).eq("clinic_id", clinicId).eq("id", parsed.data.id).select("id").single<{ id: string }>()
      : await supabase.from("rooms").insert(payload).select("id").single<{ id: string }>();

    if (error || !data) return { message: error?.message ?? "Could not save room." };

    await createAuditLog({
      clinicId,
      actorId: user.id,
      action: parsed.data.id ? "room.updated" : "room.created",
      entityType: "room",
      entityId: data.id,
      metadata: { name: parsed.data.name },
    });

    revalidatePath("/settings/rooms");
    return { success: true, message: parsed.data.id ? "Room updated." : "Room created." };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteRoomAction(_: RoomActionState, formData: FormData): Promise<RoomActionState> {
  try {
    const id = z.string().uuid().parse(formData.get("id"));
    const { user, clinicId } = await getRoomContext();
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.from("rooms").delete().eq("clinic_id", clinicId).eq("id", id);
    if (error) return { message: error.message };

    await createAuditLog({ clinicId, actorId: user.id, action: "room.deleted", entityType: "room", entityId: id, metadata: {} });
    revalidatePath("/settings/rooms");
    return { success: true, message: "Room deleted." };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Something went wrong." };
  }
}
