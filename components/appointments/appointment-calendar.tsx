"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { AppointmentDrawer } from "@/components/appointments/appointment-drawer";
import { AppointmentStatusBadge } from "@/components/appointments/status-badge";
import { Button } from "@/components/ui/button";
import { APPOINTMENT_STATUS_META } from "@/lib/constants/appointments";
import type { AppointmentWithRelations, Doctor, Patient, Service } from "@/types/database";

// Manila = UTC+8. Shift a UTC timestamp so getUTC* reads as Manila wall-clock time.
function toManilaShifted(utcIso: string): Date {
  return new Date(new Date(utcIso).getTime() + 8 * 60 * 60 * 1000);
}

function manilaToday(): Date {
  return toManilaShifted(new Date().toISOString());
}

function dateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function apptDateKey(utcIso: string): string {
  return dateKey(toManilaShifted(utcIso));
}

function formatTime(utcIso: string): string {
  const d = toManilaShifted(utcIso);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const WEEKDAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAY_FULL  = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_SHORT3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES   = ["January", "February", "March", "April", "May", "June",
                       "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT   = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────

interface MiniCalendarProps {
  viewYear: number;
  viewMonth: number;
  selectedKey: string;
  todayKey: string;
  dotMap: Map<string, string[]>;
  onSelect: (year: number, month: number, day: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

function MiniCalendar({ viewYear, viewMonth, selectedKey, todayKey, dotMap, onSelect, onPrev, onNext, onToday }: MiniCalendarProps) {
  const grid = useMemo(() => buildGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const viewingToday = (() => {
    const [ty, tm] = todayKey.split("-").map(Number);
    return viewYear === ty && viewMonth === tm - 1;
  })();

  return (
    <div className="select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrev}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-slate-800">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          onClick={onNext}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_SHORT.map((wd, i) => (
          <div
            key={wd}
            className={`text-center py-1 text-[10px] font-semibold uppercase tracking-wider ${
              i === 0 || i === 6 ? "text-slate-300" : "text-slate-400"
            }`}
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {grid.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = key === selectedKey;
          const isToday    = key === todayKey;
          const dow        = new Date(Date.UTC(viewYear, viewMonth, day)).getUTCDay();
          const isWeekend  = dow === 0 || dow === 6;
          const dots       = dotMap.get(key) ?? [];

          return (
            <button
              key={key}
              onClick={() => onSelect(viewYear, viewMonth, day)}
              className={`flex flex-col items-center rounded-lg py-1 transition-colors ${
                isSelected
                  ? "bg-blue-600 text-white"
                  : isToday
                  ? "bg-blue-50 text-blue-700 font-bold"
                  : isWeekend
                  ? "text-slate-400 hover:bg-slate-100"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="text-[11px] font-medium leading-none">{day}</span>
              <div className="mt-0.5 flex gap-0.5 h-1 items-center">
                {dots.slice(0, 3).map((color, di) => (
                  <span
                    key={di}
                    className="h-1 w-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.65)" : color }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Today button */}
      <div className="mt-3 border-t border-border pt-3 flex justify-center">
        <button
          onClick={onToday}
          className={`rounded-lg px-4 py-1 text-xs font-medium transition-colors ${
            viewingToday && selectedKey === todayKey
              ? "text-slate-400 cursor-default"
              : "text-blue-600 hover:bg-blue-50"
          }`}
          disabled={viewingToday && selectedKey === todayKey}
        >
          Today
        </button>
      </div>
    </div>
  );
}

// ── Appointment Card (day view) ───────────────────────────────────────────────

function AppointmentCard({ appointment, onClick }: { appointment: AppointmentWithRelations; onClick: () => void }) {
  const serviceColor = appointment.services?.color ?? APPOINTMENT_STATUS_META[appointment.status].color;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border bg-white px-4 py-3 hover:border-blue-200 hover:bg-blue-50/20 transition-all"
      style={{ borderLeftColor: serviceColor, borderLeftWidth: 3 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-xs tabular-nums text-slate-400">
            {formatTime(appointment.start_at)} – {formatTime(appointment.end_at)}
          </span>
          <p className="mt-0.5 text-sm font-semibold text-slate-900 truncate">
            {appointment.patients?.full_name ?? "Unknown patient"}
          </p>
          {(appointment.services?.name ?? appointment.doctors?.full_name) && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {[appointment.services?.name, appointment.doctors?.full_name].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <AppointmentStatusBadge status={appointment.status} />
      </div>
    </button>
  );
}

// ── Upcoming row (compact list) ───────────────────────────────────────────────

function UpcomingRow({ appointment, onClick }: { appointment: AppointmentWithRelations; onClick: () => void }) {
  const serviceColor = appointment.services?.color ?? APPOINTMENT_STATUS_META[appointment.status].color;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 px-5 py-2.5 text-left hover:bg-slate-50 transition-colors"
    >
      <span
        className="h-2 w-2 flex-shrink-0 rounded-full"
        style={{ backgroundColor: serviceColor }}
      />
      <span className="w-24 flex-shrink-0 tabular-nums text-xs text-slate-400">
        {formatTime(appointment.start_at)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
        {appointment.patients?.full_name ?? "Unknown patient"}
      </span>
      <span className="hidden min-w-0 max-w-[160px] truncate text-xs text-slate-500 sm:block">
        {[appointment.services?.name, appointment.doctors?.full_name].filter(Boolean).join(" · ")}
      </span>
      <span className="flex-shrink-0">
        <AppointmentStatusBadge status={appointment.status} />
      </span>
    </button>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AppointmentCalendar({
  appointments,
  options,
  canManage,
}: {
  appointments: AppointmentWithRelations[];
  options: { patients: Patient[]; doctors: Doctor[]; services: Service[] } | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const today    = manilaToday();
  const todayKey = dateKey(today);

  const [selYear,   setSelYear]   = useState(today.getUTCFullYear());
  const [selMonth,  setSelMonth]  = useState(today.getUTCMonth());
  const [selDay,    setSelDay]    = useState(today.getUTCDate());
  const [viewYear,  setViewYear]  = useState(today.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(today.getUTCMonth());

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerAppointment, setDrawerAppointment] = useState<AppointmentWithRelations | undefined>(undefined);

  const selectedKey = `${selYear}-${String(selMonth + 1).padStart(2, "0")}-${String(selDay).padStart(2, "0")}`;

  // Per-status counts for the currently viewed month (used in legend)
  const monthStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const appt of appointments) {
      const d = toManilaShifted(appt.start_at);
      if (d.getUTCFullYear() === viewYear && d.getUTCMonth() === viewMonth) {
        counts[appt.status] = (counts[appt.status] ?? 0) + 1;
      }
    }
    return counts;
  }, [appointments, viewYear, viewMonth]);

  // dateKey → status colors, for mini calendar dots
  const dotMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const appt of appointments) {
      const key = apptDateKey(appt.start_at);
      const arr = map.get(key) ?? [];
      arr.push(APPOINTMENT_STATUS_META[appt.status].color);
      map.set(key, arr);
    }
    return map;
  }, [appointments]);

  // Appointments for the selected day
  const dayAppointments = useMemo(() =>
    appointments
      .filter((a) => apptDateKey(a.start_at) === selectedKey)
      .sort((a, b) => a.start_at.localeCompare(b.start_at)),
    [appointments, selectedKey]
  );

  // Upcoming appointments: today through today+30 days, grouped by date
  const upcomingGroups = useMemo(() => {
    const limitKey = dateKey(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000));
    const filtered = appointments
      .filter((a) => { const k = apptDateKey(a.start_at); return k >= todayKey && k <= limitKey; })
      .sort((a, b) => a.start_at.localeCompare(b.start_at));

    const map = new Map<string, AppointmentWithRelations[]>();
    for (const appt of filtered) {
      const key = apptDateKey(appt.start_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(appt);
    }

    return Array.from(map.entries()).map(([key, appts]) => {
      const [y, mo, d] = key.split("-").map(Number);
      const dt = new Date(Date.UTC(y, mo - 1, d));
      const dow = dt.getUTCDay();
      const label = key === todayKey
        ? `Today · ${MONTH_SHORT[mo - 1]} ${d}`
        : `${WEEKDAY_SHORT3[dow]}, ${MONTH_SHORT[mo - 1]} ${d}`;
      return { key, label, appts, isToday: key === todayKey };
    });
  }, [appointments, todayKey, today]);

  const upcomingTotal = upcomingGroups.reduce((sum, g) => sum + g.appts.length, 0);

  const dayLabel = (() => {
    const d = new Date(Date.UTC(selYear, selMonth, selDay));
    return `${WEEKDAY_FULL[d.getUTCDay()]}, ${MONTH_NAMES[selMonth]} ${selDay}`;
  })();

  function selectDay(year: number, month: number, day: number) {
    setSelYear(year); setSelMonth(month); setSelDay(day);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function shiftDay(delta: number) {
    const d = new Date(Date.UTC(selYear, selMonth, selDay + delta));
    setSelYear(d.getUTCFullYear());
    setSelMonth(d.getUTCMonth());
    setSelDay(d.getUTCDate());
    setViewYear(d.getUTCFullYear());
    setViewMonth(d.getUTCMonth());
  }

  function goToday() {
    const t = manilaToday();
    setSelYear(t.getUTCFullYear()); setSelMonth(t.getUTCMonth()); setSelDay(t.getUTCDate());
    setViewYear(t.getUTCFullYear()); setViewMonth(t.getUTCMonth());
  }

  function jumpAndOpen(appt: AppointmentWithRelations) {
    const key = apptDateKey(appt.start_at);
    const [y, mo, d] = key.split("-").map(Number);
    setSelYear(y); setSelMonth(mo - 1); setSelDay(d);
    setViewYear(y); setViewMonth(mo - 1);
    setDrawerAppointment(appt);
    setDrawerOpen(true);
  }

  function openDrawer(appt?: AppointmentWithRelations) {
    setDrawerAppointment(appt);
    setDrawerOpen(true);
  }

  return (
    <div className="space-y-5">
      {/* ── Two-panel layout ─────────────────────────────────── */}
      <div className="flex gap-5 min-h-[560px]">
        {/* Left panel */}
        <div className="w-[232px] flex-shrink-0 space-y-4">
          <div className="rounded-2xl border border-border bg-white p-4">
            <MiniCalendar
              viewYear={viewYear}
              viewMonth={viewMonth}
              selectedKey={selectedKey}
              todayKey={todayKey}
              dotMap={dotMap}
              onSelect={selectDay}
              onPrev={prevMonth}
              onNext={nextMonth}
              onToday={goToday}
            />
          </div>

          {canManage && (
            <Button onClick={() => openDrawer()} className="w-full gap-2">
              <CalendarPlus className="h-4 w-4" />
              New appointment
            </Button>
          )}

          <div className="rounded-2xl border border-border bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {MONTH_NAMES[viewMonth]}
              </p>
              <p className="text-[10px] text-slate-400">{viewYear}</p>
            </div>
            <div className="space-y-1.5">
              {(Object.entries(APPOINTMENT_STATUS_META) as [string, { label: string; color: string }][]).map(([status, meta]) => {
                const count = monthStatusCounts[status] ?? 0;
                return (
                  <div key={status} className="flex items-center gap-2">
                    <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
                    <span className="flex-1 text-xs text-slate-600">{meta.label}</span>
                    {count > 0 && (
                      <span className="text-[11px] font-semibold tabular-nums" style={{ color: meta.color }}>
                        {count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right panel: Day agenda */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-white">
          {/* Day nav header */}
          <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                onClick={() => shiftDay(-1)}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="text-sm font-semibold text-slate-900 truncate">{dayLabel}</h2>
              <button
                onClick={() => shiftDay(1)}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {dayAppointments.length > 0 && (
              <span className="flex-shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                {dayAppointments.length} appt{dayAppointments.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Appointment list */}
          <div className="flex-1 overflow-y-auto p-5">
            {dayAppointments.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-slate-700">No appointments</p>
                <p className="text-xs text-slate-400 mt-1">Nothing scheduled for this day.</p>
                {canManage && (
                  <button
                    onClick={() => openDrawer()}
                    className="mt-4 text-xs font-medium text-blue-600 hover:underline"
                  >
                    Add one
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {dayAppointments.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    onClick={() => openDrawer(appt)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Upcoming: Next 30 Days ────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-semibold text-slate-900">Upcoming Appointments</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              Next 30 days
            </span>
          </div>
          {upcomingTotal > 0 && (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {upcomingTotal} appointment{upcomingTotal !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {upcomingGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-slate-500">No upcoming appointments in the next 30 days.</p>
          </div>
        ) : (
          <div>
            {upcomingGroups.map((group, gi) => (
              <div key={group.key} className={gi > 0 ? "border-t border-border" : ""}>
                {/* Date group header */}
                <div className={`flex items-center gap-2.5 px-5 py-2 ${group.isToday ? "bg-blue-50/60" : "bg-slate-50/60"}`}>
                  <span className={`text-xs font-semibold ${group.isToday ? "text-blue-700" : "text-slate-500"}`}>
                    {group.label}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {group.appts.length} appt{group.appts.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {/* Appointment rows */}
                <div className="divide-y divide-border/60">
                  {group.appts.map((appt) => (
                    <UpcomingRow
                      key={appt.id}
                      appointment={appt}
                      onClick={() => jumpAndOpen(appt)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerOpen && options && (
        <AppointmentDrawer
          appointment={drawerAppointment}
          patients={options.patients}
          doctors={options.doctors}
          services={options.services}
          canManage={canManage}
          onClose={() => setDrawerOpen(false)}
          onSuccess={() => { setDrawerOpen(false); router.refresh(); }}
        />
      )}
    </div>
  );
}
