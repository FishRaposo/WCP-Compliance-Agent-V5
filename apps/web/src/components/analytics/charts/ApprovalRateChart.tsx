import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface TrustBandRate {
  trust_band: string;
  total: number;
  approved: number;
  rate: number;
}

interface Props {
  data: TrustBandRate[];
}

const LABELS: Record<string, string> = {
  auto_approve: "Auto Approve",
  flag_for_review: "Flag for Review",
  require_human_review: "Human Review",
};

export default function ApprovalRateChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No approval data available.</p>;
  }

  const formatted = data.map((d) => ({
    name: LABELS[d.trust_band] ?? d.trust_band.replace(/_/g, " "),
    "Approval Rate": Math.round(d.rate * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={formatted} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis
          tick={{ fontSize: 11 }}
          stroke="hsl(var(--muted-foreground))"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          formatter={(v: number) => [`${v}%`, "Approval Rate"]}
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <Bar dataKey="Approval Rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
