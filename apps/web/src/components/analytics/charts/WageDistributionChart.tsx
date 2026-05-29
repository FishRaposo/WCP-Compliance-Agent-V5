import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  locality: string;
  trade: string;
  required_wage: number;
  actual_avg: number;
  compliant_pct?: number;
}

interface Props {
  data: DataPoint[];
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: DataPoint;
}

function CustomDot({ cx, cy, payload }: CustomDotProps) {
  if (!cx || !cy || !payload) return null;
  const compliant = (payload.compliant_pct ?? 100) >= 95;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={compliant ? "hsl(142, 71%, 45%)" : "hsl(0, 72%, 51%)"}
      opacity={0.8}
    />
  );
}

export default function WageDistributionChart({ data }: Props) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No wage data available.</p>;
  }

  const minWage = Math.min(...data.map((d) => Math.min(d.required_wage, d.actual_avg)));
  const maxWage = Math.max(...data.map((d) => Math.max(d.required_wage, d.actual_avg)));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ScatterChart margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          type="number"
          dataKey="required_wage"
          name="Required"
          domain={[minWage - 2, maxWage + 2]}
          tick={{ fontSize: 11 }}
          stroke="hsl(var(--muted-foreground))"
          label={{ value: "Required ($)", position: "insideBottom", offset: -2, fontSize: 11 }}
        />
        <YAxis
          type="number"
          dataKey="actual_avg"
          name="Actual"
          domain={[minWage - 2, maxWage + 2]}
          tick={{ fontSize: 11 }}
          stroke="hsl(var(--muted-foreground))"
          label={{ value: "Actual ($)", angle: -90, position: "insideLeft", fontSize: 11 }}
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <ReferenceLine
          segment={[
            { x: minWage - 2, y: minWage - 2 },
            { x: maxWage + 2, y: maxWage + 2 },
          ]}
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="4 4"
          label={{ value: "Parity", fontSize: 10 }}
        />
        <Scatter name="Workers" data={data} shape={<CustomDot />} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
