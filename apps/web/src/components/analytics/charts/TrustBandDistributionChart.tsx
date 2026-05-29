import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DataPoint {
  trust_band: string;
  count: number;
  percentage: number;
}

interface Props {
  data: DataPoint[];
}

const COLORS = [
  "hsl(142, 71%, 45%)",
  "hsl(45, 93%, 47%)",
  "hsl(0, 72%, 51%)",
];

const LABELS: Record<string, string> = {
  auto_approve: "Auto Approve",
  flag_for_review: "Flag for Review",
  require_human_review: "Human Review",
};

export default function TrustBandDistributionChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No distribution data available.</p>;
  }

  const formatted = data.map((d) => ({
    name: LABELS[d.trust_band] ?? d.trust_band.replace(/_/g, " "),
    value: d.count,
    pct: d.percentage,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={formatted}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {formatted.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [`${value} decisions`, name]}
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
