"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { EventClickArg, EventDropArg } from "@fullcalendar/core";
import { CalendarClock, Clock, Pencil, Stethoscope, User, X } from "lucide-react";
import { AppointmentStatusBadge } from "@/components/appointments/status-badge";
import { Button } from "@/components/ui/button";
import { APPOINTMENT_STATUS_META } from "@/lib/constants/appointments";
import { formatManilaDateTime, titleize } from "@/lib/utils/format";
import { rescheduleAppointmentAction } from "@/server/actions/appointments";
import type { AppointmentWithRelations } from "@/types/database";

// Strip timezone so FullCalendar renders at Manila wall-clock time in "local" mode.
// Manila = UTC+8; no DST.
function toManilaLocal(utcIso: string) {
  const ms = new Date(utcIso).getTime() + 8 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 19); // "YYYY-MM-DDTHH:mm:ss" — no Z
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function AppointmentModal({
  appointment,
  canManage,
  onClose
}: {
  appointment: AppointmentWithRelations;
  canManage: boolean;
  onClose: () => void;
}) {
  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px]" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 ring-1 ring-border focus:outline-none">
          <div className="flex items-center justify-between gap-3">
            <DialogPrimitive.Title className="text-base font-semibold text-slate-900">
              Appointment Details
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-ring">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <AppointmentStatusBadge status={appointment.status} />
              <span className="text-xs text-slate-500">{titleize(appointment.source)}</span>
            </div>

            <div className="space-y-3 rounded-xl bg-slate-50 p-4">
              <DetailRow icon={User} label="Patient" value={appointment.patients?.full_name ?? "Unknown"} />
              <DetailRow icon={Stethoscope} label="Service" value={appointment.services?.name ?? "Unknown"} />
              {appointment.doctors ? (
                <DetailRow icon={User} label="Doctor" value={appointment.doctors.full_name} />
              ) : null}
              <DetailRow icon={CalendarClock} label="Start" value={formatManilaDateTime(appointment.start_at)} />
              <DetailRow icon={Clock} label="End" value={formatManilaDateTime(appointment.end_at)} />
              {appointment.notes ? (
                <DetailRow icon={CalendarClock} label="Notes" value={appointment.notes} />
              ) : null}
            </div>

            {canManage ? (
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button size="sm" asChild>
                  <Link href={`/appointments/${appointment.id}/edit`}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ErrorModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px]" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 ring-1 ring-border focus:outline-none">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <X className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <DialogPrimitive.Title className="text-sm font-semibold text-slate-900">
                Could not reschedule
              </DialogPrimitive.Title>
              <p className="mt-1 text-sm text-slate-600">{message}</p>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={onClose}>OK</Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function AppointmentCalendar({ appointments, canManage }: { appointments: AppointmentWithRelations[]; canManage: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<AppointmentWithRelations | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);

  const events = useMemo(
    () =>
      appointments.map((appointment) => ({
        id: appointment.id,
        title: `${appointment.patients?.full_name ?? "Patient"} · ${appointment.services?.name ?? "Service"}`,
        start: toManilaLocal(appointment.start_at),
        end: toManilaLocal(appointment.end_at),
        backgroundColor: APPOINTMENT_STATUS_META[appointment.status].color,
        borderColor: APPOINTMENT_STATUS_META[appointment.status].color,
        extendedProps: { appointment }
      })),
    [appointments]
  );

  function handleDrop(info: EventDropArg) {
    if (!canManage || !info.event.start) {
      info.revert();
      return;
    }

    startTransition(async () => {
      // Our toManilaLocal() hack makes FullCalendar display Manila wall-clock time
      // as if it were browser-local time. So info.event.start's local components
      // (getFullYear, getMonth, etc.) equal the Manila wall-clock time of the drop.
      // parseAppointmentStart handles the Manila-local → UTC conversion server-side.
      const d = info.event.start!;
      const manilaLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      const formData = new FormData();
      formData.set("id", info.event.id);
      formData.set("startAt", manilaLocal);
      const result = await rescheduleAppointmentAction({}, formData);

      if (!result.success) {
        setDragError(result.message ?? "Could not reschedule appointment.");
        info.revert();
        return;
      }

      router.refresh();
    });
  }

  function handleEventClick(info: EventClickArg) {
    const appointment = info.event.extendedProps.appointment as AppointmentWithRelations;
    setSelected(appointment);
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek"
        }}
        timeZone="local"
        events={events}
        editable={canManage}
        eventDrop={handleDrop}
        eventClick={handleEventClick}
        height="auto"
        nowIndicator
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
      />

      {selected ? (
        <AppointmentModal
          appointment={selected}
          canManage={canManage}
          onClose={() => setSelected(null)}
        />
      ) : null}

      {dragError ? (
        <ErrorModal message={dragError} onClose={() => setDragError(null)} />
      ) : null}
    </div>
  );
}
