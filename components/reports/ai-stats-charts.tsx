"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { AiReportData } from "@/server/queries/reports";

export function AiConversationStatusChart({ data }: { data: AiReportData }) {
  const chartData = [
    { name: "Open", value: data.openConversations, fill: "#2563eb" },
    { name: "Booked", value: data.bookedConversations, fill: "#16a34a" },
    { name: "Handoff", value: data.handoffConversations, fill: "#ea580c" },
    { name: "Closed", value: data.closedConversations, fill: "#94a3b8" }
  ].filter((d) => d.value > 0);

  if (!chartData.length) return <p className="py-8 text-center text-sm text-slate-400">No data</p>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="value" name="Conversations" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopMessageSourcesChart({ data }: { data: AiReportData["topMessageSources"] }) {
  if (!data.length) return <p className="py-8 text-center text-sm text-slate-400">No data</p>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="source" tick={{ fontSize: 11 }} width={90} />
        <Tooltip />
        <Bar dataKey="count" name="Messages" fill="#7c3aed" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
