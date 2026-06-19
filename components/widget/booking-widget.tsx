"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  MessageSquare, Send, X
} from "lucide-react";
import type {
  PublicWidgetConfig, PublicWidgetService, WidgetChatResponse,
  WidgetQuickReply, WidgetSlot
} from "@/server/widget/chat";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "chat" | "book";
type BookStep = 1 | 2 | 3 | 4 | 5;

type WidgetMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type BookingWidgetProps = PublicWidgetConfig & {
  embedded?: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCentavos(centavos: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency", currency: "PHP", maximumFractionDigits: 0
  }).format(centavos / 100);
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join("");
}

function formatSlotTime(startAt: string) {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Manila"
  }).format(new Date(startAt));
}

function formatDateShort(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "short", month: "short", day: "numeric"
  }).format(new Date(y, m - 1, d));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ClinicMark({ name, logoUrl, color }: { name: string; logoUrl: string | null; color: string }) {
  if (logoUrl) {
    return (
      <span
        className="h-8 w-8 shrink-0 rounded-xl bg-cover bg-center ring-1 ring-white/30"
        style={{ backgroundImage: `url(${logoUrl})` }}
      />
    );
  }
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ring-1 ring-white/30"
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
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function BookCalendar({
  availableDates,
  selected,
  onSelect,
}: {
  availableDates: string[];
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  useEffect(() => {
    if (availableDates.length === 0) return;
    const [y, m] = availableDates[0].split("-").map(Number);
    setYear(y);
    setMonth(m - 1);
  }, [availableDates]);

  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={prevMonth}
          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-slate-800">{MONTHS[month]} {year}</span>
        <button type="button" onClick={nextMonth}
          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center">
        {WEEKDAYS.map(d => (
          <span key={d} className="text-[10px] font-semibold text-slate-400">{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {cells.map((day, i) => {
          if (!day) return <span key={i} />;
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const available = availableSet.has(iso);
          const isSelected = selected === iso;
          return (
            <button
              key={i}
              type="button"
              disabled={!available}
              onClick={() => onSelect(iso)}
              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition ${
                isSelected
                  ? "font-semibold text-white"
                  : available
                    ? "font-medium text-slate-800 hover:bg-blue-50"
                    : "cursor-default text-slate-300"
              }`}
              style={isSelected ? { backgroundColor: "var(--widget-primary)" } : undefined}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Input style ──────────────────────────────────────────────────────────────

const inputCls = "h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

// ─── BookingWidget ─────────────────────────────────────────────────────────────

export function BookingWidget({ clinic, settings, services, embedded = false }: BookingWidgetProps) {
  const primaryColor = clinic.primary_color || "#2563EB";
  const storageKey = useMemo(() => `clinicflow-widget:${clinic.slug}:patient-temp-id`, [clinic.slug]);

  // ── Shared ──────────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [patientTempId, setPatientTempId] = useState<string | null>(null);

  // ── Chat ─────────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<WidgetQuickReply[]>([]);
  const [chatPending, setChatPending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [chatBooking, setChatBooking] = useState<WidgetChatResponse["appointment"] | null>(null);
  // Inline booking state for the chat tab
  const [chatDates, setChatDates] = useState<string[]>([]);
  const [chatSlots, setChatSlots] = useState<WidgetSlot[]>([]);
  const [chatServiceId, setChatServiceId] = useState<string | null>(null);
  const [chatSlot, setChatSlot] = useState<WidgetSlot | null>(null);
  const [chatNeedsPhone, setChatNeedsPhone] = useState(false);
  const [chatNeedsDetails, setChatNeedsDetails] = useState(false);
  const [chatPatientLookup, setChatPatientLookup] = useState<WidgetChatResponse["patientLookup"] | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const startRequestedRef = useRef(false);

  // ── Book wizard ──────────────────────────────────────────────────────────────
  const [bookStep, setBookStep] = useState<BookStep>(1);
  const [bookService, setBookService] = useState<PublicWidgetService | null>(null);
  const [bookDates, setBookDates] = useState<string[]>([]);
  const [bookDate, setBookDate] = useState<string | null>(null);
  const [bookSlots, setBookSlots] = useState<WidgetSlot[]>([]);
  const [bookSlot, setBookSlot] = useState<WidgetSlot | null>(null);
  const [bookPending, setBookPending] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookAppointment, setBookAppointment] = useState<WidgetChatResponse["appointment"] | null>(null);

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (embedded) return;
    const prev = document.body.style.background;
    document.body.style.background = "transparent";
    return () => { document.body.style.background = prev; };
  }, [embedded]);

  useEffect(() => {
    const existing = window.localStorage.getItem(storageKey);
    const next = existing || crypto.randomUUID();
    window.localStorage.setItem(storageKey, next);
    setPatientTempId(next);
  }, [storageKey]);

  useEffect(() => {
    const openWidget = () => setOpen(true);
    window.addEventListener("clinicflow:open-widget", openWidget);
    return () => window.removeEventListener("clinicflow:open-widget", openWidget);
  }, []);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chatPending, quickReplies, chatBooking, chatDates, chatSlots, chatNeedsPhone, chatNeedsDetails]);

  // ── API ───────────────────────────────────────────────────────────────────────
  const postWidget = useCallback(async (
    payload: Record<string, unknown>,
    setPending: (b: boolean) => void,
    setError: (e: string | null) => void,
  ): Promise<WidgetChatResponse | null> => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/widget/${clinic.slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientTempId, ...(conversationId ? { conversationId } : {}), ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The assistant could not respond.");
      const response = data as WidgetChatResponse;
      setConversationId(response.conversationId);
      if (response.patientTempId) {
        setPatientTempId(response.patientTempId);
        window.localStorage.setItem(storageKey, response.patientTempId);
      }
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      return null;
    } finally {
      setPending(false);
    }
  }, [clinic.slug, conversationId, patientTempId, storageKey]);

  const postChat = useCallback(
    (payload: Record<string, unknown>) => postWidget(payload, setChatPending, setChatError),
    [postWidget]
  );

  const postBook = useCallback(
    (payload: Record<string, unknown>) => postWidget(payload, setBookPending, setBookError),
    [postWidget]
  );

  // ── Chat response handler ─────────────────────────────────────────────────────
  const applyChatResponse = useCallback((response: WidgetChatResponse) => {
    setQuickReplies(response.quickReplies);

    if (response.availableDates !== undefined) {
      setChatDates(response.availableDates);
      setChatSlots([]);
    }
    if (response.slots !== undefined) {
      setChatSlots(response.slots);
      setChatDates([]);
    }
    if (response.selectedServiceId) setChatServiceId(response.selectedServiceId);
    if (response.selectedSlot)      setChatSlot(response.selectedSlot);

    if (response.needsPhoneLookup) {
      setChatNeedsPhone(true);
      setChatNeedsDetails(false);
      setChatPatientLookup(null);
    } else if (response.needsPatientDetails) {
      setChatNeedsPhone(false);
      setChatNeedsDetails(true);
    }
    if (response.patientLookup !== undefined) setChatPatientLookup(response.patientLookup);

    if (response.appointment) {
      setChatBooking(response.appointment);
      setChatDates([]);
      setChatSlots([]);
      setChatSlot(null);
      setChatNeedsDetails(false);
    }

    const incoming = response.messages.filter(m => m.role === "assistant");
    setMessages(cur => [
      ...cur,
      ...incoming.map(m => ({ id: m.id, role: "assistant" as const, content: m.content, createdAt: m.created_at })),
    ]);
  }, []);

  // Initialize chat on first open
  useEffect(() => {
    if (!open || tab !== "chat" || !patientTempId || conversationId || startRequestedRef.current) return;
    startRequestedRef.current = true;
    void postChat({ type: "start" }).then(response => {
      if (response) {
        applyChatResponse(response);
        setQuickReplies([]); // keep chat tab conversational — suppress service shortcuts
      }
    });
  }, [open, tab, patientTempId, conversationId, postChat, applyChatResponse]);

  // ── Chat handlers ─────────────────────────────────────────────────────────────
  const appendLocalMessage = useCallback((content: string) => {
    setMessages(cur => [...cur, {
      id: `user-${crypto.randomUUID()}`, role: "user", content, createdAt: new Date().toISOString()
    }]);
  }, []);

  function clearChatInlineBooking() {
    setChatDates([]);
    setChatSlots([]);
    setChatNeedsPhone(false);
    setChatNeedsDetails(false);
    setChatPatientLookup(null);
  }

  async function handleChatSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const content = input.trim();
    if (!content || chatPending) return;
    setInput("");
    clearChatInlineBooking();
    appendLocalMessage(content);
    const response = await postChat({ type: "message", content });
    if (response) applyChatResponse(response);
  }

  async function handleChatDateSelect(date: string) {
    if (chatPending || !chatServiceId) return;
    setChatDates([]);
    appendLocalMessage(`I'd like ${formatDateShort(date)}.`);
    const response = await postChat({ type: "select_date", serviceId: chatServiceId, date });
    if (response) applyChatResponse(response);
  }

  async function handleChatSlotSelect(slot: WidgetSlot) {
    if (chatPending) return;
    setChatSlots([]);
    setChatServiceId(slot.serviceId);
    appendLocalMessage(`I'll take ${formatSlotTime(slot.startAt)}.`);
    const response = await postChat({ type: "select_slot", serviceId: slot.serviceId, doctorId: slot.doctorId, startAt: slot.startAt });
    if (response) applyChatResponse(response);
  }

  async function handleChatPhoneLookup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (chatPending) return;
    const phone = String(new FormData(e.currentTarget).get("phone") ?? "").trim();
    if (!phone) return;
    setChatNeedsPhone(false);
    const response = await postChat({ type: "lookup_patient", phone });
    if (response) applyChatResponse(response);
  }

  async function handleChatConfirmBooking(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!chatServiceId || !chatSlot || chatPending) return;
    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get("fullName") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const dateOfBirth = String(fd.get("dateOfBirth") ?? "").trim();
    const insuranceProvider = String(fd.get("insuranceProvider") ?? "").trim();
    const notes = String(fd.get("notes") ?? "").trim();

    const patientPhone = chatPatientLookup ? chatPatientLookup.phone : phone;
    const patientName = chatPatientLookup?.found ? chatPatientLookup.patientName : fullName;

    if (!patientName || !patientPhone) {
      setChatError("Full name and phone are required.");
      return;
    }
    const response = await postChat({
      type: "confirm_booking",
      serviceId: chatServiceId,
      doctorId: chatSlot.doctorId,
      startAt: chatSlot.startAt,
      patient: {
        fullName: patientName,
        phone: patientPhone,
        email: email || null,
        dateOfBirth: dateOfBirth || null,
        insuranceProvider: insuranceProvider || null,
        notes: notes || null,
      },
    });
    if (response) applyChatResponse(response);
  }

  async function handleQuickReply(reply: WidgetQuickReply) {
    if (chatPending) return;
    setQuickReplies([]);
    if (reply.type === "service" && reply.serviceId) {
      appendLocalMessage(`I would like to book ${reply.label}.`);
      const response = await postChat({ type: "select_service", serviceId: reply.serviceId });
      if (response) applyChatResponse(response);
      return;
    }
    appendLocalMessage(reply.value);
    const response = await postChat({ type: "message", content: reply.value });
    if (response) applyChatResponse(response);
  }

  // ── Book handlers ──────────────────────────────────────────────────────────────
  async function handleBookServiceNext() {
    if (!bookService || bookPending) return;
    const response = await postBook({ type: "select_service", serviceId: bookService.id });
    if (!response) return;
    setBookDates(response.availableDates ?? []);
    setBookStep(2);
  }

  async function handleBookDateNext() {
    if (!bookDate || !bookService || bookPending) return;
    const response = await postBook({ type: "select_date", serviceId: bookService.id, date: bookDate });
    if (!response) return;
    setBookSlots(response.slots ?? []);
    setBookStep(3);
  }

  async function handleBookConfirm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!bookService || !bookSlot || bookPending) return;
    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get("fullName") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const dateOfBirth = String(fd.get("dateOfBirth") ?? "").trim();
    const insuranceProvider = String(fd.get("insuranceProvider") ?? "").trim();
    const notes = String(fd.get("notes") ?? "").trim();
    const response = await postBook({
      type: "confirm_booking",
      serviceId: bookService.id,
      doctorId: bookSlot.doctorId,
      startAt: bookSlot.startAt,
      patient: {
        fullName,
        phone,
        email: email || null,
        dateOfBirth: dateOfBirth || null,
        insuranceProvider: insuranceProvider || null,
        notes: notes || null,
      },
    });
    if (!response?.appointment) return;
    setBookAppointment(response.appointment);
    setBookStep(5);
  }

  function resetBook() {
    setBookStep(1);
    setBookService(null);
    setBookDates([]);
    setBookDate(null);
    setBookSlots([]);
    setBookSlot(null);
    setBookError(null);
    setBookAppointment(null);
  }

  function closeWidget() {
    setOpen(false);
    setConversationId(null);
    startRequestedRef.current = false;
    setMessages([]);
    setQuickReplies([]);
    setChatError(null);
    setChatBooking(null);
    setInput("");
    clearChatInlineBooking();
    setChatServiceId(null);
    setChatSlot(null);
    resetBook();
  }

  // ── Early exit ────────────────────────────────────────────────────────────────
  if (!settings.ai_enabled || !settings.ai_widget_enabled) {
    if (embedded) return null;
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent p-4">
        <div className="max-w-sm rounded-2xl bg-white p-5 text-sm text-slate-600 shadow-2xl ring-1 ring-blue-100">
          This clinic booking assistant is currently unavailable.
        </div>
      </main>
    );
  }

  const Wrapper = embedded ? "div" : "main";

  return (
    <Wrapper
      className={embedded ? undefined : "min-h-screen bg-transparent"}
      // CSS custom property so BookCalendar can pick up the brand colour
      style={{ ["--widget-primary" as string]: primaryColor }}
    >
      <div className="pointer-events-none fixed inset-0 z-50">

        {/* ── FAB ── */}
        {!open && (
          <button
            type="button"
            aria-label={`Open ${clinic.name} booking assistant`}
            onClick={() => setOpen(true)}
            className="pointer-events-auto absolute bottom-4 right-4 flex h-16 w-16 items-center justify-center rounded-full text-white shadow-2xl transition duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-200"
            style={{ backgroundColor: primaryColor }}
          >
            <MessageSquare className="h-7 w-7" />
          </button>
        )}

        {/* ── Modal ── */}
        {open && (
          <section className="pointer-events-auto absolute inset-x-3 bottom-3 top-3 flex overflow-hidden rounded-[1.5rem] bg-white shadow-2xl ring-1 ring-slate-200 transition-all duration-300 sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[640px] sm:w-[390px]">
            <div className="flex min-h-0 w-full flex-col">

              {/* ── Header ── */}
              <header className="flex shrink-0 items-center gap-3 px-4 py-3 text-white" style={{ backgroundColor: primaryColor }}>
                <ClinicMark name={clinic.name} logoUrl={clinic.logo_url} color={primaryColor} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{clinic.name}</p>
                  <p className="flex items-center gap-1.5 text-xs text-white/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    AI booking assistant
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={closeWidget}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              {/* ── Tab bar ── */}
              <div className="flex shrink-0 border-b border-slate-100 bg-white">
                {(["chat", "book"] as Tab[]).map(key => {
                  const Icon = key === "chat" ? MessageSquare : CalendarDays;
                  const label = key === "chat" ? "Chat" : "Book";
                  const active = tab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-sm font-medium transition-colors ${
                        active ? "text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                      style={active ? { borderBottomColor: primaryColor, color: primaryColor } : undefined}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* CHAT TAB                                                       */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {tab === "chat" && (
                <>
                  <div ref={chatScrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/60 px-4 py-4">

                    {messages.length === 0 && !chatPending && (
                      <div className="rounded-2xl bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm ring-1 ring-blue-100">
                        {settings.ai_welcome_message}
                      </div>
                    )}

                    {messages.map(msg => (
                      <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
                        <div
                          className={msg.role === "user"
                            ? "max-w-[82%] rounded-2xl rounded-br-md px-3 py-2 text-sm leading-6 text-white shadow-sm"
                            : "max-w-[82%] rounded-2xl rounded-bl-md bg-white px-3 py-2 text-sm leading-6 text-slate-700 shadow-sm ring-1 ring-blue-100"
                          }
                          style={msg.role === "user" ? { backgroundColor: primaryColor } : undefined}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}

                    {chatPending && <TypingIndicator />}

                    {quickReplies.length > 0 && !chatBooking && (
                      <div className="flex flex-wrap gap-2">
                        {quickReplies.map(r => (
                          <button
                            key={`${r.type}-${r.serviceId ?? r.value}`}
                            type="button"
                            onClick={() => void handleQuickReply(r)}
                            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-50"
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Inline date chips */}
                    {chatDates.length > 0 && !chatBooking && (
                      <div className="space-y-1.5">
                        <p className="px-1 text-xs font-semibold text-slate-500">Select a date</p>
                        <div className="flex flex-wrap gap-2">
                          {chatDates.map(date => (
                            <button
                              key={date}
                              type="button"
                              disabled={chatPending}
                              onClick={() => void handleChatDateSelect(date)}
                              className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-50 disabled:opacity-50"
                            >
                              <CalendarDays className="h-3.5 w-3.5" />
                              {formatDateShort(date)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inline time slot chips */}
                    {chatSlots.length > 0 && !chatNeedsDetails && !chatBooking && (
                      <div className="space-y-1.5">
                        <p className="px-1 text-xs font-semibold text-slate-500">Select a time</p>
                        <div className="grid grid-cols-3 gap-2">
                          {chatSlots.map(slot => (
                            <button
                              key={`${slot.doctorId ?? "c"}-${slot.startAt}`}
                              type="button"
                              disabled={chatPending}
                              onClick={() => void handleChatSlotSelect(slot)}
                              className="rounded-xl border border-slate-200 bg-white py-2 text-center text-xs font-semibold text-slate-700 transition hover:border-blue-400 hover:text-blue-700 disabled:opacity-50"
                            >
                              {formatSlotTime(slot.startAt)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Phone lookup form */}
                    {chatNeedsPhone && chatSlot && (
                      <form onSubmit={handleChatPhoneLookup} className="space-y-2.5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-blue-100">
                        <p className="text-sm font-semibold text-slate-900">What&apos;s your phone number?</p>
                        <input
                          name="phone"
                          required
                          placeholder="e.g. 09171234567"
                          className={inputCls}
                        />
                        <button
                          type="submit"
                          disabled={chatPending}
                          className="h-10 w-full rounded-xl text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Continue
                        </button>
                      </form>
                    )}

                    {/* Patient details form */}
                    {chatNeedsDetails && chatSlot && chatPatientLookup && (
                      <form onSubmit={handleChatConfirmBooking} className="space-y-2.5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-blue-100">
                        <p className="text-sm font-semibold text-slate-900">
                          {chatPatientLookup.found ? `Confirm for ${chatPatientLookup.patientName}` : "Complete your details"}
                        </p>
                        {!chatPatientLookup.found && (
                          <input name="fullName" required placeholder="Full name" className={inputCls} />
                        )}
                        <input name="email" type="email" required placeholder="Email address" className={inputCls} />
                        {!chatPatientLookup.found && (
                          <input name="phone" required placeholder="Phone number" className={inputCls} />
                        )}
                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Date of Birth <span className="text-red-500">*</span>
                          </label>
                          <input name="dateOfBirth" type="date" required className={inputCls} />
                        </div>
                        <input name="insuranceProvider" placeholder="Insurance provider (optional)" className={inputCls} />
                        <textarea
                          name="notes"
                          rows={2}
                          placeholder="Notes (optional)"
                          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        />
                        <button
                          type="submit"
                          disabled={chatPending}
                          className="h-10 w-full rounded-xl text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Request Appointment
                        </button>
                      </form>
                    )}

                    {chatBooking && (
                      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-emerald-100">
                        <p className="text-sm font-semibold text-emerald-700">Appointment booked</p>
                        <p className="mt-0.5 text-sm text-slate-600">{chatBooking.serviceName}</p>
                        <p className="text-xs text-slate-500">
                          {new Intl.DateTimeFormat("en-PH", {
                            dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila"
                          }).format(new Date(chatBooking.startAt))}
                        </p>
                      </div>
                    )}
                  </div>

                  {chatError && (
                    <p className="shrink-0 px-4 pb-1 text-xs text-red-600">{chatError}</p>
                  )}

                  <form
                    onSubmit={handleChatSubmit}
                    className="flex shrink-0 items-end gap-2 border-t border-slate-100 bg-white p-3"
                  >
                    <textarea
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          e.currentTarget.form?.requestSubmit();
                        }
                      }}
                      rows={1}
                      placeholder="Type your message…"
                      className="max-h-24 min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      disabled={chatPending || Boolean(chatBooking) || chatNeedsPhone || chatNeedsDetails}
                    />
                    <button
                      type="submit"
                      aria-label="Send message"
                      disabled={chatPending || !input.trim() || Boolean(chatBooking) || chatNeedsPhone || chatNeedsDetails}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white transition hover:brightness-95 disabled:opacity-50"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {chatPending ? <Bot className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
                    </button>
                  </form>
                </>
              )}

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* BOOK TAB                                                        */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {tab === "book" && (
                <div className="flex min-h-0 flex-1 flex-col">

                  {/* Progress dots (steps 1-4) */}
                  {bookStep < 5 && (
                    <div className="flex shrink-0 items-center gap-1.5 px-5 pt-4 pb-1">
                      {Array.from({ length: 4 }, (_, i) => (
                        <span
                          key={i}
                          className={`h-2 rounded-full transition-all duration-200 ${
                            i < bookStep ? "w-5" : "w-2 bg-slate-200"
                          }`}
                          style={i < bookStep ? { backgroundColor: primaryColor } : undefined}
                        />
                      ))}
                    </div>
                  )}

                  {/* Step content */}
                  <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">

                    {/* Step 1 — Select Service */}
                    {bookStep === 1 && (
                      <div className="space-y-3">
                        <h2 className="text-base font-semibold text-slate-900">Select a Service</h2>
                        <div className="space-y-2">
                          {services.map(svc => (
                            <button
                              key={svc.id}
                              type="button"
                              onClick={() => setBookService(svc)}
                              className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                                bookService?.id === svc.id
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              <p className="text-sm font-semibold text-slate-900">{svc.name}</p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {svc.duration_minutes} min
                                {svc.price_centavos != null && ` · ${formatCentavos(svc.price_centavos)}`}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step 2 — Pick a Date */}
                    {bookStep === 2 && (
                      <div className="space-y-3">
                        <h2 className="text-base font-semibold text-slate-900">Pick a Date</h2>
                        {bookDates.length > 0 ? (
                          <BookCalendar
                            availableDates={bookDates}
                            selected={bookDate}
                            onSelect={setBookDate}
                          />
                        ) : (
                          <p className="py-6 text-center text-sm text-slate-400">
                            No available dates found for this service.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Step 3 — Pick a Time */}
                    {bookStep === 3 && (
                      <div className="space-y-3">
                        <div>
                          <h2 className="text-base font-semibold text-slate-900">Pick a Time</h2>
                          {bookDate && (
                            <p className="text-sm text-slate-500">{formatDateShort(bookDate)}</p>
                          )}
                        </div>
                        {bookSlots.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {bookSlots.map(slot => {
                              const active = bookSlot?.startAt === slot.startAt && bookSlot?.doctorId === slot.doctorId;
                              return (
                                <button
                                  key={`${slot.doctorId ?? "clinic"}-${slot.startAt}`}
                                  type="button"
                                  onClick={() => setBookSlot(slot)}
                                  className={`rounded-xl border px-2 py-2.5 text-center text-sm transition ${
                                    active
                                      ? "border-blue-500 bg-blue-50 font-semibold text-blue-700"
                                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                  }`}
                                >
                                  {formatSlotTime(slot.startAt)}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="py-6 text-center text-sm text-slate-400">
                            No slots available for this date.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Step 4 — Your Details */}
                    {bookStep === 4 && (
                      <form id="book-details-form" onSubmit={handleBookConfirm} className="space-y-3">
                        <h2 className="text-base font-semibold text-slate-900">Your Details</h2>

                        {bookService && bookSlot && (
                          <div className="flex flex-wrap gap-1.5">
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                              {bookService.name}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                              {bookDate ? formatDateShort(bookDate) : ""} · {formatSlotTime(bookSlot.startAt)}
                            </span>
                          </div>
                        )}

                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <input name="fullName" required placeholder="Jane Smith" className={inputCls} />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Email <span className="text-red-500">*</span>
                            </label>
                            <input name="email" type="email" required placeholder="jane@example.com" className={inputCls} />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Phone <span className="text-red-500">*</span>
                            </label>
                            <input name="phone" required placeholder="09171234567" className={inputCls} />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Date of Birth <span className="text-red-500">*</span>
                          </label>
                          <input name="dateOfBirth" type="date" required className={inputCls} />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Insurance Provider
                          </label>
                          <input name="insuranceProvider" placeholder="Optional" className={inputCls} />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Notes
                          </label>
                          <textarea
                            name="notes"
                            rows={2}
                            placeholder="Any additional information…"
                            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </form>
                    )}

                    {/* Step 5 — Success */}
                    {bookStep === 5 && bookAppointment && (
                      <div className="flex flex-col items-center justify-center gap-5 py-10 text-center">
                        <div
                          className="flex h-16 w-16 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${primaryColor}18` }}
                        >
                          <CheckCircle2 className="h-9 w-9" style={{ color: primaryColor }} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-semibold text-slate-900">Appointment Requested!</p>
                          <p className="text-sm text-slate-500">We will confirm for</p>
                          <p className="text-sm font-semibold text-slate-800">
                            {new Intl.DateTimeFormat("en-PH", {
                              weekday: "short", month: "short", day: "numeric",
                              hour: "numeric", minute: "2-digit", hour12: true,
                              timeZone: "Asia/Manila"
                            }).format(new Date(bookAppointment.startAt))}
                          </p>
                        </div>
                        <p className="text-xs text-slate-400">Check your email for confirmation details.</p>
                        <button
                          type="button"
                          onClick={resetBook}
                          className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition hover:brightness-95"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Book another appointment
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Book navigation footer (steps 1-4) */}
                  {bookStep < 5 && (
                    <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4">
                      {bookError && (
                        <p className="mb-2 text-xs text-red-600">{bookError}</p>
                      )}
                      {bookPending && (
                        <p className="mb-2 text-xs text-slate-400">Checking availability…</p>
                      )}
                      <div className="flex gap-3">
                        {bookStep > 1 && (
                          <button
                            type="button"
                            onClick={() => { setBookError(null); setBookStep(s => (s - 1) as BookStep); }}
                            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Back
                          </button>
                        )}
                        <button
                          type={bookStep === 4 ? "submit" : "button"}
                          form={bookStep === 4 ? "book-details-form" : undefined}
                          disabled={
                            bookPending ||
                            (bookStep === 1 && !bookService) ||
                            (bookStep === 2 && !bookDate) ||
                            (bookStep === 3 && !bookSlot)
                          }
                          onClick={
                            bookStep === 1 ? () => void handleBookServiceNext()
                            : bookStep === 2 ? () => void handleBookDateNext()
                            : bookStep === 3 ? () => { setBookError(null); setBookStep(4); }
                            : undefined
                          }
                          className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {bookStep === 4 ? "Request Appointment" : "Next"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </section>
        )}
      </div>
    </Wrapper>
  );
}
