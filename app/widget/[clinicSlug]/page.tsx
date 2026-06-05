export default async function ClinicWidgetPage({ params }: { params: Promise<{ clinicSlug: string }> }) {
  const { clinicSlug } = await params;

  return (
    <main className="min-h-screen bg-white p-6">
      <div className="mx-auto max-w-md rounded-2xl border border-border p-6 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Booking widget</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">{clinicSlug}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Public appointment booking widget placeholder.</p>
      </div>
    </main>
  );
}
