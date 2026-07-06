"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/money";

export function RevenueChart({
  data,
  currency,
}: {
  data: { month: string; total: number }[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          dy={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : `${v}`)}
        />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid var(--border)",
            fontSize: 13,
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
          }}
          formatter={(value) => [formatMoney(value as number, currency), "Revenue"]}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="var(--primary)"
          strokeWidth={2.5}
          fill="url(#rev)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
