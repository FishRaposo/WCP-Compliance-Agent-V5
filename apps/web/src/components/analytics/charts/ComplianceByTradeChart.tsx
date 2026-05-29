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

interface TradeItem {
  trade: string;
  total: number;
  approved: number;
  flagged?: number;
  rejected?: number;
  approval_rate?: number;
}

interface Props {
  data: TradeItem[];
}

export default function ComplianceByTradeChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No trade data available.</p>;
  }

  const formatted = data.map((d) => ({
    trade: d.trade,
    Approved: d.approved,
    Flagged: d.flagged ?? 0,
    Rejected: d.rejected ?? d.total - d.approved - (d.flagged ?? 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={formatted}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 60, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis
          type="category"
          dataKey="trade"
          tick={{ fontSize: 11 }}
          stroke="hsl(var(--muted-foreground))"
          width={56}
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
        <Bar dataKey="Approved" stackId="a" fill="hsl(142, 71%, 45%)" />
        <Bar dataKey="Flagged" stackId="a" fill="hsl(45, 93%, 47%)" />
        <Bar dataKey="Rejected" stackId="a" fill="hsl(0, 72%, 51%)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
