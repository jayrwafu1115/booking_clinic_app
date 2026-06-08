"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventDropArg } from "@fullcalendar/core";
import { APPOINTMENT_STATUS_META } from "@/lib/constants/appointments";
import { rescheduleAppointmentAction } from "@/server/actions/appointments";
import type { AppointmentWithRelations } from "@/types/database";

export function AppointmentCalendar({ appointments, canManage }: { appointments: AppointmentWithRelations[]; canManage: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const events = useMemo(
    () =>
      appointments.map((appointment) => ({
        id: appointment.id,
        title: `${appointment.patients?.full_name ?? "Patient"} · ${appointment.services?.name ?? "Service"}`,
        start: appointment.start_at,
        end: appointment.end_at,
        backgroundColor: APPOINTMENT_STATUS_META[appointment.status].color,
        borderColor: APPOINTMENT_STATUS_META[appointment.status].color,
        extendedProps: {
          status: appointment.status
        }
      })),
    [appointments]
  );

  function handleDrop(info: EventDropArg) {
    if (!canManage || !info.event.start) {
      info.revert();
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", info.event.id);
      formData.set("startAt", info.event.start?.toISOString() ?? "");
      const result = await rescheduleAppointmentAction({}, formData);

      if (!result.success) {
        window.alert(result.message ?? "Could not reschedule appointment.");
        info.revert();
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-soft">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek"
        }}
        timeZone="Asia/Manila"
        events={events}
        editable={canManage}
        eventDrop={handleDrop}
        eventClick={(info) => router.push(`/appointments/${info.event.id}`)}
        height="auto"
        nowIndicator
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
      />
    </div>
  );
}
