import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CostPoint {
  date: string;
  cost_usd: number;
  decisions: number;
  total_cost?: number;
}

interface Props {
  data: CostPoint[];
}

export default function LLMCostChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No cost data available.</p>;
  }

  const formatted = data.map((d) => ({
    date: d.date.slice(5),
    "Cost/Decision ($)": Number(d.cost_usd.toFixed(4)),
    Decisions: d.decisions,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={formatted} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11 }}
          stroke="hsl(var(--muted-foreground))"
          tickFormatter={(v: number) => `$${v.toFixed(3)}`}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11 }}
          stroke="hsl(var(--muted-foreground))"
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        <Bar
          yAxisId="right"
          dataKey="Decisions"
          fill="hsl(var(--primary))"
          opacity={0.4}
          radius={[2, 2, 0, 0]}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="Cost/Decision ($)"
          stroke="hsl(45, 93%, 47%)"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
