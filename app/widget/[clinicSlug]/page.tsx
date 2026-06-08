import { notFound } from "next/navigation";
import { BookingWidget } from "@/components/widget/booking-widget";
import { getPublicWidgetConfig } from "@/server/widget/chat";

export const dynamic = "force-dynamic";

function WidgetUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-transparent p-4">
      <div className="max-w-sm rounded-2xl bg-white p-5 text-sm leading-6 text-slate-600 shadow-2xl ring-1 ring-blue-100">
        The booking assistant is temporarily unavailable. Please contact the clinic directly.
      </div>
    </main>
  );
}

export default async function ClinicWidgetPage({ params }: { params: Promise<{ clinicSlug: string }> }) {
  const { clinicSlug } = await params;
  let config;

  try {
    config = await getPublicWidgetConfig(clinicSlug);
  } catch {
    return <WidgetUnavailable />;
  }

  if (!config) {
    notFound();
  }

  return <BookingWidget {...config} />;
}
