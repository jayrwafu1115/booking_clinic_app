export function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">{title}</h1>
      </div>
      {description ? <p className="max-w-xl text-sm leading-6 text-slate-600">{description}</p> : null}
    </div>
  );
}
