"use client";

import { useState, useTransition } from "react";
import { Calendar, ChevronRight, Clock, User } from "lucide-react";
import { bookAppointmentPublicAction } from "@/server/actions/public-booking";
import { Button } from "@/components/ui/button";
import type { Doctor, Service } from "@/types/database";

type ServiceRow = Pick<Service, "id" | "name" | "description" | "duration_minutes" | "price_centavos" | "color" | "category">;
type DoctorRow  = Pick<Doctor, "id" | "full_name" | "specialization" | "avatar_url">;

type Step = "service" | "datetime" | "patient" | "confirmed";

function php(centavos: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(centavos / 100);
}

const STEPS: { key: Step; label: string }[] = [
  { key: "service",  label: "Service"   },
  { key: "datetime", label: "Date & Time" },
  { key: "patient",  label: "Your Info"  },
  { key: "confirmed", label: "Confirmed" },
];

export function PublicBookingFlow({
  clinicSlug,
  services,
  doctors,
}: {
  clinicSlug: string;
  services: ServiceRow[];
  doctors: DoctorRow[];
}) {
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<ServiceRow | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorRow | null | "any">("any");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [confirmedMsg, setConfirmedMsg] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Today's date YYYY-MM-DD
  const today = new Date().toLocaleDateString("sv-SE"); // ISO format

  async function loadSlots(date: string, doctorId: string | null) {
    if (!selectedService || !date) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelectedTime("");
    const params = new URLSearchParams({
      date,
      serviceId: selectedService.id,
      ...(doctorId ? { doctorId } : {}),
    });
    try {
      const res = await fetch(`/api/book/${clinicSlug}/slots?${params}`);
      const json = await res.json();
      setSlots(json.slots ?? []);
    } finally {
      setSlotsLoading(false);
    }
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    const did = selectedDoctor !== "any" ? selectedDoctor?.id ?? null : null;
    loadSlots(date, did);
  }

  function handleDoctorChange(doc: DoctorRow | null | "any") {
    setSelectedDoctor(doc);
    if (selectedDate) {
      const did = doc !== "any" ? (doc?.id ?? null) : null;
      loadSlots(selectedDate, did);
    }
  }

  function handleBook(formData: FormData) {
    setError("");
    formData.set("clinicSlug", clinicSlug);
    formData.set("serviceId", selectedService!.id);
    formData.set("date", selectedDate);
    formData.set("time", selectedTime);
    if (selectedDoctor !== "any" && selectedDoctor) {
      formData.set("doctorId", selectedDoctor.id);
    }

    startTransition(async () => {
      const result = await bookAppointmentPublicAction(formData);
      if (result.success) {
        setConfirmedMsg(result.message);
        setStep("confirmed");
      } else {
        setError(result.message);
      }
    });
  }

  // Step indicator
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="space-y-6">
      {/* Step progress */}
      {step !== "confirmed" && (
        <div className="flex items-center gap-2">
          {STEPS.filter((s) => s.key !== "confirmed").map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold
                ${i < stepIndex ? "bg-blue-600 text-white" : i === stepIndex ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                {i + 1}
              </div>
              <span className={`text-sm ${i === stepIndex ? "font-semibold text-slate-900" : "text-slate-400"}`}>{s.label}</span>
              {i < 2 && <ChevronRight className="h-4 w-4 text-slate-300" />}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Service */}
      {step === "service" && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Select a service</h2>
          {services.map((svc) => (
            <button
              key={svc.id}
              type="button"
              onClick={() => { setSelectedService(svc); setStep("datetime"); }}
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-blue-400 hover:shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: svc.color }} />
                    <p className="font-semibold text-slate-900">{svc.name}</p>
                  </div>
                  {svc.description && <p className="mt-1 text-sm text-slate-500">{svc.description}</p>}
                  <div className="mt-2 flex items-center gap-3 text-sm text-slate-600">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{svc.duration_minutes} min</span>
                    <span>{php(svc.price_centavos)}</span>
                  </div>
                </div>
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Date & Time */}
      {step === "datetime" && selectedService && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setStep("service")} className="text-sm text-blue-600 hover:underline">← Back</button>
            <h2 className="text-lg font-bold text-slate-900">Choose date & time</h2>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 space-y-4">
            {doctors.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Doctor (optional)</label>
                <select
                  className="h-10 w-full rounded-xl border border-input px-3 text-sm"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") handleDoctorChange("any");
                    else {
                      const doc = doctors.find((d) => d.id === val) ?? null;
                      handleDoctorChange(doc);
                    }
                  }}
                >
                  <option value="">Any doctor</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}{d.specialization ? ` · ${d.specialization}` : ""}</option>)}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                min={today}
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="h-10 w-full rounded-xl border border-input px-3 text-sm"
              />
            </div>

            {selectedDate && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Available times</label>
                {slotsLoading ? (
                  <p className="text-sm text-slate-400">Loading slots…</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-slate-400">No slots available on this date. Try another day.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={`rounded-xl border py-2 text-sm font-medium transition-colors
                          ${selectedTime === slot ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"}`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Button
            disabled={!selectedDate || !selectedTime}
            onClick={() => setStep("patient")}
            size="default"
            className="w-full"
          >
            Continue →
          </Button>
        </div>
      )}

      {/* Step 3: Patient info */}
      {step === "patient" && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setStep("datetime")} className="text-sm text-blue-600 hover:underline">← Back</button>
            <h2 className="text-lg font-bold text-slate-900">Your information</h2>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 space-y-1 text-sm text-slate-600">
            <p><span className="font-semibold">Service:</span> {selectedService?.name}</p>
            <p><span className="font-semibold">Date:</span> {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
            <p><span className="font-semibold">Time:</span> {selectedTime}</p>
            {selectedDoctor !== "any" && selectedDoctor && (
              <p><span className="font-semibold">Doctor:</span> {selectedDoctor.full_name}</p>
            )}
          </div>

          <form
            action={(fd) => handleBook(fd)}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Full name *</label>
              <input type="text" name="fullName" required className="h-10 w-full rounded-xl border border-input px-3 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Phone number *</label>
              <input type="tel" name="phone" required placeholder="09XXXXXXXXX" className="h-10 w-full rounded-xl border border-input px-3 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input type="email" name="email" className="h-10 w-full rounded-xl border border-input px-3 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <textarea name="notes" rows={2} placeholder="Any special requests or concerns…" className="w-full rounded-xl border border-input px-3 py-2 text-sm" />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" disabled={isPending} size="default" className="w-full">
              {isPending ? "Booking…" : "Confirm booking"}
            </Button>
          </form>
        </div>
      )}

      {/* Step 4: Confirmed */}
      {step === "confirmed" && (
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
            <Calendar className="h-8 w-8" />
          </div>
          <p className="text-xl font-bold text-green-700">Booking confirmed!</p>
          <p className="text-sm text-slate-600">{confirmedMsg}</p>
          <p className="text-xs text-slate-400">You will receive a confirmation if an email was provided.</p>
          <Button variant="outline" onClick={() => { setStep("service"); setSelectedService(null); setSelectedDate(""); setSelectedTime(""); }}>
            Book another appointment
          </Button>
        </div>
      )}
    </div>
  );
}
