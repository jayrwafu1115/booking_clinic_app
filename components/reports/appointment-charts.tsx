"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import type { AppointmentReportData } from "@/server/queries/reports";

function fmtTooltip(v: unknown): string {
  if (typeof v === "number") return v.toLocaleString();
  return String(v ?? "");
}

export function StatusPieChart({ data }: { data: AppointmentReportData["statusBreakdown"] }) {
  if (!data.length) return <p className="py-8 text-center text-sm text-slate-400">No data</p>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="count" nameKey="name">
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => fmtTooltip(v)} />
        <Legend iconSize={10} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TopServicesChart({ data }: { data: AppointmentReportData["topServices"] }) {
  if (!data.length) return <p className="py-8 text-center text-sm text-slate-400">No data</p>;
  const chartData = data.map((s) => ({ name: s.serviceName, bookings: s.count, revenue: s.revenueCentavos / 100 }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
        <Tooltip
          formatter={(v, name) =>
            name === "revenue" && typeof v === "number" ? `₱${v.toLocaleString()}` : fmtTooltip(v)
          }
        />
        <Bar dataKey="bookings" name="Bookings" fill="#2563eb" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DoctorUtilizationChart({ data }: { data: AppointmentReportData["doctorStats"] }) {
  if (!data.length) return <p className="py-8 text-center text-sm text-slate-400">No data</p>;
  const chartData = data.map((d) => ({ name: d.doctorName, total: d.total, completed: d.completed }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
        <Tooltip />
        <Legend iconSize={10} />
        <Bar dataKey="total" name="Total" fill="#93c5fd" radius={[0, 4, 4, 0]} />
        <Bar dataKey="completed" name="Completed" fill="#2563eb" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SourceBreakdownChart({ data }: { data: AppointmentReportData["sourceBreakdown"] }) {
  const COLORS = ["#2563eb", "#7c3aed", "#0891b2", "#16a34a", "#ea580c"];
  if (!data.length) return <p className="py-8 text-center text-sm text-slate-400">No data</p>;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={75} dataKey="count" nameKey="name">
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => fmtTooltip(v)} />
        <Legend iconSize={10} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}
