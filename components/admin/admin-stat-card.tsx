import type { LucideIcon } from "lucide-react";

export function AdminStatCard({
  label,
  value,
  detail,
  icon: Icon,
  accent = "blue"
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon;
  accent?: "blue" | "green" | "orange" | "purple" | "red";
}) {
  const accents = {
    blue: "bg-blue-500/10 text-blue-400",
    green: "bg-green-500/10 text-green-400",
    orange: "bg-orange-500/10 text-orange-400",
    purple: "bg-purple-500/10 text-purple-400",
    red: "bg-red-500/10 text-red-400"
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-slate-950">{value}</p>
          {detail && <p className="text-xs text-slate-500">{detail}</p>}
        </div>
        <div className={`rounded-xl p-3 ${accents[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
