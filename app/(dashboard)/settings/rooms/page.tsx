import { DoorOpen, Plus } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { profileHasPermission } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccessCard } from "@/components/settings/access-card";
import { ModuleHeader } from "@/components/core/module-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoomForm } from "@/components/settings/room-form";
import type { Room } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const profile = await getCurrentProfile();
  if (!profile?.clinic_id) return <AccessCard title="Rooms" message="Sign in with a clinic account." />;
  if (!profileHasPermission(profile, "rooms:manage")) return <AccessCard title="Rooms" message="You do not have permission to manage rooms." />;

  const supabase = await createSupabaseServerClient();
  const { data: rooms } = await supabase
    .from("rooms")
    .select("*")
    .eq("clinic_id", profile.clinic_id)
    .order("name")
    .returns<Room[]>();

  return (
    <div className="space-y-6">
      <ModuleHeader
        eyebrow="Settings"
        title="Rooms & Resources"
        description="Define physical rooms or equipment that can be assigned to appointments."
        icon={DoorOpen}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <Card>
          <CardHeader>
            <CardTitle>Configured Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            {(rooms ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No rooms yet. Add one using the form.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {(rooms ?? []).map((room) => (
                  <div key={room.id} className="flex items-start justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{room.name}</p>
                      {room.description && <p className="mt-0.5 text-sm text-slate-500">{room.description}</p>}
                      <p className="mt-0.5 text-xs text-slate-400">Capacity: {room.capacity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {room.active ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Inactive</span>
                      )}
                      <RoomForm room={room} mode="edit" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Room
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RoomForm mode="create" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
