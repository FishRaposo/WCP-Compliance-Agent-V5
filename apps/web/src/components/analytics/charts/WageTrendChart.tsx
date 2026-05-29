import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TrendPoint {
  date: string;
  violations: number;
  total_checked: number;
  violation_rate?: number;
}

interface Props {
  data: TrendPoint[];
}

export default function WageTrendChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No trend data available.</p>;
  }

  const formatted = data.map((d) => ({
    date: d.date.slice(5),
    Violations: d.violations,
    "Total Checked": d.total_checked,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={formatted} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="Total Checked"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="Violations"
          stroke="hsl(0, 72%, 51%)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
