import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface LatencyItem {
  model: string;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
}

interface Props {
  data: LatencyItem[];
}

export default function LLMLatencyChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No latency data available.</p>;
  }

  const formatted = data.map((d) => ({
    model: d.model,
    "p50 (ms)": d.p50_ms,
    "p95 (ms)": d.p95_ms,
    "p99 (ms)": d.p99_ms,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={formatted} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="model" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis
          tick={{ fontSize: 11 }}
          stroke="hsl(var(--muted-foreground))"
          tickFormatter={(v: number) => `${v}ms`}
        />
        <Tooltip
          formatter={(v: number) => [`${v}ms`]}
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="p50 (ms)" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="p95 (ms)" fill="hsl(45, 93%, 47%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="p99 (ms)" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
