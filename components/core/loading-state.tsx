export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="space-y-4">
      <div className="h-8 w-64 animate-pulse rounded-xl bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-36 animate-pulse rounded-2xl border border-border bg-white shadow-soft" />
        ))}
      </div>
      <p className="sr-only">{label}</p>
    </div>
  );
}
