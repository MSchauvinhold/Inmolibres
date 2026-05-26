"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface DataPoint {
  dia: string;
  visitas: number;
  consultas: number;
  cierres: number;
}

export function DashboardActivityChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barSize={12} barGap={3}>
        <CartesianGrid vertical={false} stroke="var(--border, #E8DFD0)" strokeDasharray="2 4" />
        <XAxis
          dataKey="dia"
          tick={{ fontSize: 11, fill: "var(--antracita-500, #3A332C)", fontFamily: "var(--font-jetbrains-mono, monospace)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "var(--antracita-300, #6F665C)", fontFamily: "var(--font-jetbrains-mono, monospace)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "1px solid var(--border, #E8DFD0)",
            borderRadius: 10,
            fontSize: 12,
            fontFamily: "var(--font-dm-sans, sans-serif)",
            boxShadow: "0 4px 14px rgba(58,35,18,0.08)",
          }}
          cursor={{ fill: "rgba(193,105,79,0.04)" }}
        />
        <Bar dataKey="visitas"   name="Visitas"   fill="#C1694F" radius={[3, 3, 0, 0]} />
        <Bar dataKey="consultas" name="Consultas" fill="#2D4A6B" radius={[3, 3, 0, 0]} />
        <Bar dataKey="cierres"   name="Cierres"   fill="#C9A55C" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
