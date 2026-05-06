import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface KPICardProps {
  label: string;
  value: string | number;
  delta?: number;
  format?: "number" | "percent" | "currency";
  loading?: boolean;
}

function formatValue(value: string | number, format: KPICardProps["format"]): string {
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(num)) return String(value);

  if (format === "percent") return `${(num * 100).toFixed(1)}%`;
  if (format === "currency") return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return num.toLocaleString();
}

export default function KPICard({ label, value, delta, format, loading }: KPICardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-8 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-1">{formatValue(value, format)}</p>
        {delta !== undefined && (
          <p className={`text-xs mt-1 ${delta >= 0 ? "text-green-600" : "text-red-600"}`}>
            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%
          </p>
        )}
      </CardContent>
    </Card>
  );
}
