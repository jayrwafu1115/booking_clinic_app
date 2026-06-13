export default function ClinicSiteNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold text-slate-900">Clinic page not available</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This clinic website does not exist or is not currently published. Please check the link or contact the
          clinic directly.
        </p>
      </div>
    </main>
  );
}
