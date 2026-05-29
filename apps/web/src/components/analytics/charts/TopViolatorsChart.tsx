import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface LocalityItem {
  locality: string;
  total: number;
  approval_rate: number;
}

interface Props {
  data: LocalityItem[];
}

export default function TopViolatorsChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No locality data available.</p>;
  }

  const sorted = [...data]
    .sort((a, b) => a.approval_rate - b.approval_rate)
    .slice(0, 8)
    .map((d) => ({
      locality: d.locality.split(",")[0],
      "Violation Rate": Math.round(100 - d.approval_rate),
    }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 72, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          stroke="hsl(var(--muted-foreground))"
          tickFormatter={(v: number) => `${v}%`}
          domain={[0, 40]}
        />
        <YAxis
          type="category"
          dataKey="locality"
          tick={{ fontSize: 11 }}
          stroke="hsl(var(--muted-foreground))"
          width={68}
        />
        <Tooltip
          formatter={(v: number) => [`${v}%`, "Violation Rate"]}
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <Bar
          dataKey="Violation Rate"
          fill="hsl(0, 72%, 51%)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
