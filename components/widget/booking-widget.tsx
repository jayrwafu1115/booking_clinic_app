"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, CalendarClock, Check, MessageCircle, Send, X } from "lucide-react";
import type { PublicWidgetConfig, WidgetChatResponse, WidgetQuickReply, WidgetSlot } from "@/server/widget/chat";

type WidgetMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type BookingWidgetProps = PublicWidgetConfig;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ClinicMark({ name, logoUrl, color }: { name: string; logoUrl: string | null; color: string }) {
  if (logoUrl) {
    return (
      <span
        aria-hidden="true"
        className="h-10 w-10 shrink-0 rounded-2xl bg-cover bg-center ring-2 ring-white/40"
        style={{ backgroundImage: `url(${logoUrl})` }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white ring-2 ring-white/40"
      style={{ backgroundColor: color }}
    >
      {initials(name) || "CF"}
    </span>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3 py-2 shadow-sm ring-1 ring-blue-100">
        {[0, 1, 2].map((item) => (
          <span
            key={item}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500"
            style={{ animationDelay: `${item * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function BookingWidget({ clinic, settings, services }: BookingWidgetProps) {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [patientTempId, setPatientTempId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<WidgetQuickReply[]>([]);
  const [slots, setSlots] = useState<WidgetSlot[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<WidgetSlot | null>(null);
  const [needsPatientDetails, setNeedsPatientDetails] = useState(false);
  const [appointmentSummary, setAppointmentSummary] = useState<WidgetChatResponse["appointment"] | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startRequestedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const primaryColor = clinic.primary_color || "#2563EB";
  const storageKey = useMemo(() => `clinicflow-widget:${clinic.slug}:patient-temp-id`, [clinic.slug]);

  useEffect(() => {
    const previousBackground = document.body.style.background;
    document.body.style.background = "transparent";

    return () => {
      document.body.style.background = previousBackground;
    };
  }, []);

  useEffect(() => {
    const existing = window.localStorage.getItem(storageKey);
    const next = existing || crypto.randomUUID();
    window.localStorage.setItem(storageKey, next);
    setPatientTempId(next);
  }, [storageKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, slots, needsPatientDetails]);

  useEffect(() => {
    setQuickReplies(
      services.slice(0, 6).map((service) => ({
        label: service.name,
        value: service.name,
        type: "service" as const,
        serviceId: service.id
      }))
    );
  }, [services]);

  const appendLocalMessage = useCallback((content: string, role: WidgetMessage["role"] = "user") => {
    setMessages((current) => [
      ...current,
      {
        id: `${role}-${crypto.randomUUID()}`,
        role,
        content,
        createdAt: new Date().toISOString()
      }
    ]);
  }, []);

  const applyResponse = useCallback((response: WidgetChatResponse) => {
    setConversationId(response.conversationId);

    if (response.patientTempId) {
      setPatientTempId(response.patientTempId);
      window.localStorage.setItem(storageKey, response.patientTempId);
    }

    setQuickReplies(response.quickReplies);

    if (response.slots !== undefined) {
      setSlots(response.slots);
    }

    if (response.selectedServiceId) {
      setSelectedServiceId(response.selectedServiceId);
    }

    if (response.selectedSlot) {
      setSelectedSlot(response.selectedSlot);
    }

    setNeedsPatientDetails(Boolean(response.needsPatientDetails));

    if (response.appointment) {
      setAppointmentSummary(response.appointment);
      setSlots([]);
      setSelectedSlot(null);
      setNeedsPatientDetails(false);
    }

    const assistantMessages = response.messages.filter((message) => message.role === "assistant");
    setMessages((current) => [
      ...current,
      ...assistantMessages.map((message) => ({
        id: message.id,
        role: "assistant" as const,
        content: message.content,
        createdAt: message.created_at
      }))
    ]);
  }, [storageKey]);

  const postWidget = useCallback(async (payload: Record<string, unknown>) => {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/widget/${clinic.slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientTempId,
          conversationId,
          ...payload
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "The assistant could not respond.");
      }

      applyResponse(data as WidgetChatResponse);
      return data as WidgetChatResponse;
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "The assistant could not respond.";
      setError(message);
      appendLocalMessage(message, "assistant");
      return null;
    } finally {
      setPending(false);
    }
  }, [appendLocalMessage, applyResponse, clinic.slug, conversationId, patientTempId]);

  useEffect(() => {
    if (!open || !patientTempId || conversationId || startRequestedRef.current) {
      return;
    }

    startRequestedRef.current = true;
    void postWidget({ type: "start" });
  }, [conversationId, open, patientTempId, postWidget]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();

    if (!content || pending) {
      return;
    }

    setInput("");
    setSlots([]);
    setNeedsPatientDetails(false);
    appendLocalMessage(content);
    await postWidget({ type: "message", content });
  }

  async function handleQuickReply(reply: WidgetQuickReply) {
    if (pending) {
      return;
    }

    setQuickReplies([]);
    setSlots([]);

    if (reply.type === "service" && reply.serviceId) {
      appendLocalMessage(`I would like to book ${reply.label}.`);
      await postWidget({ type: "select_service", serviceId: reply.serviceId });
      return;
    }

    appendLocalMessage(reply.value);
    await postWidget({ type: "message", content: reply.value });
  }

  async function handleSlotSelection(slot: WidgetSlot) {
    if (pending) {
      return;
    }

    setSelectedServiceId(slot.serviceId);
    appendLocalMessage(`I choose ${slot.label}.`);
    await postWidget({
      type: "select_slot",
      serviceId: slot.serviceId,
      doctorId: slot.doctorId,
      startAt: slot.startAt
    });
  }

  async function handleConfirmBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedServiceId || !selectedSlot || pending) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    if (!fullName || !phone) {
      setError("Patient name and phone are required.");
      return;
    }

    appendLocalMessage(`Confirm booking for ${fullName}.`);
    await postWidget({
      type: "confirm_booking",
      serviceId: selectedServiceId,
      doctorId: selectedSlot.doctorId,
      startAt: selectedSlot.startAt,
      patient: { fullName, phone, email }
    });
  }

  if (!settings.ai_enabled || !settings.ai_widget_enabled) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent p-4">
        <div className="max-w-sm rounded-2xl bg-white p-5 text-sm text-slate-600 shadow-2xl ring-1 ring-blue-100">
          This clinic booking assistant is currently unavailable.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent">
      <div className="pointer-events-none fixed inset-0 z-50">
        {!open ? (
          <button
            type="button"
            aria-label={`Open ${clinic.name} booking chat`}
            title={`Open ${clinic.name} booking chat`}
            onClick={() => setOpen(true)}
            className="pointer-events-auto absolute bottom-4 right-4 flex h-16 w-16 items-center justify-center rounded-full text-white shadow-2xl transition duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-200"
            style={{ backgroundColor: primaryColor }}
          >
            <MessageCircle className="h-7 w-7" />
          </button>
        ) : (
          <section className="pointer-events-auto absolute inset-x-3 bottom-3 top-3 flex overflow-hidden rounded-[1.5rem] bg-blue-50 shadow-2xl ring-1 ring-blue-100 transition-all duration-300 sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[640px] sm:w-[400px]">
            <div className="flex min-h-0 w-full flex-col">
              <header className="flex items-center gap-3 px-4 py-4 text-white" style={{ backgroundColor: primaryColor }}>
                <ClinicMark name={clinic.name} logoUrl={clinic.logo_url} color={primaryColor} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{clinic.name}</p>
                  <p className="flex items-center gap-1 text-xs text-white/80">
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                    AI booking assistant
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close booking chat"
                  title="Close"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.length === 0 && !pending ? (
                  <div className="rounded-2xl bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm ring-1 ring-blue-100">
                    {settings.ai_welcome_message}
                  </div>
                ) : null}

                {messages.map((message) => (
                  <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={
                        message.role === "user"
                          ? "max-w-[82%] rounded-2xl rounded-br-md px-3 py-2 text-sm leading-6 text-white shadow-sm"
                          : "max-w-[82%] rounded-2xl rounded-bl-md bg-white px-3 py-2 text-sm leading-6 text-slate-700 shadow-sm ring-1 ring-blue-100"
                      }
                      style={message.role === "user" ? { backgroundColor: primaryColor } : undefined}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}

                {pending ? <TypingIndicator /> : null}

                {quickReplies.length > 0 && !appointmentSummary ? (
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((reply) => (
                      <button
                        key={`${reply.type}-${reply.serviceId ?? reply.value}`}
                        type="button"
                        onClick={() => void handleQuickReply(reply)}
                        className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-100"
                      >
                        {reply.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {slots.length > 0 && !needsPatientDetails ? (
                  <div className="space-y-2">
                    {slots.map((slot) => (
                      <button
                        key={`${slot.doctorId ?? "clinic"}-${slot.startAt}`}
                        type="button"
                        onClick={() => void handleSlotSelection(slot)}
                        className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left text-sm text-slate-700 shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-100"
                      >
                        <CalendarClock className="h-4 w-4 shrink-0 text-blue-600" />
                        <span className="min-w-0 flex-1">{slot.label}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {needsPatientDetails && selectedSlot ? (
                  <form onSubmit={handleConfirmBooking} className="space-y-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-blue-100">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <Check className="h-4 w-4 text-blue-600" />
                      Confirm appointment
                    </div>
                    <input
                      name="fullName"
                      placeholder="Patient full name"
                      className="h-10 w-full rounded-xl border border-blue-100 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      required
                    />
                    <input
                      name="phone"
                      placeholder="Phone number"
                      className="h-10 w-full rounded-xl border border-blue-100 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      required
                    />
                    <input
                      name="email"
                      type="email"
                      placeholder="Email optional"
                      className="h-10 w-full rounded-xl border border-blue-100 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      type="submit"
                      disabled={pending}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Check className="h-4 w-4" />
                      Confirm booking
                    </button>
                  </form>
                ) : null}

                {appointmentSummary ? (
                  <div className="rounded-2xl bg-white p-3 text-sm leading-6 text-slate-700 shadow-sm ring-1 ring-emerald-100">
                    <p className="font-semibold text-emerald-700">Appointment booked</p>
                    <p>{appointmentSummary.serviceName}</p>
                    <p>{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(appointmentSummary.startAt))}</p>
                  </div>
                ) : null}
              </div>

              {error ? <p className="px-4 pb-2 text-xs text-red-600">{error}</p> : null}

              <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-blue-100 bg-white p-3">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  rows={1}
                  placeholder="Type your message..."
                  className="max-h-24 min-h-11 flex-1 resize-none rounded-2xl border border-blue-100 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  disabled={pending || Boolean(appointmentSummary)}
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  title="Send"
                  disabled={pending || !input.trim() || Boolean(appointmentSummary)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white transition hover:brightness-95 disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {pending ? <Bot className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
