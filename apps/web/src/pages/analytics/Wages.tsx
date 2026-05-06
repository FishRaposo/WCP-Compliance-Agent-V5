import KPICard from "../../components/analytics/KPICard";
import ChartCard from "../../components/analytics/ChartCard";
import AnalyticsLayout from "../../components/analytics/AnalyticsLayout";
import { useWagesAnalytics } from "../../hooks/useAnalytics";

export default function WagesAnalytics() {
  const { data, isLoading } = useWagesAnalytics();

  const trustBands = Array.isArray(data) ? data : [];

  return (
    <AnalyticsLayout title="Wage Analytics" description="Wage compliance by trust band and locality">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard label="Total Decisions" value={trustBands.reduce((s: number, b: any) => s + (b.count || 0), 0)} loading={isLoading} />
        <KPICard label="Total Violations" value={trustBands.reduce((s: number, b: any) => s + (b.total_violations || 0), 0)} loading={isLoading} />
        <KPICard label="Avg Trust" value={trustBands.length > 0 ? (trustBands.reduce((s: number, b: any) => s + (b.avg_trust || 0), 0) / trustBands.length).toFixed(2) : "0"} loading={isLoading} />
      </div>

      <ChartCard title="Trust Band Distribution" loading={isLoading}>
        {trustBands.length > 0 ? (
          <div className="space-y-2">
            {trustBands.map((b: any) => (
              <div key={b.trust_band} className="flex items-center justify-between text-sm">
                <span className="capitalize">{b.trust_band.replace(/_/g, " ")}</span>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{b.count} decisions</span>
                  <span>{(b.avg_trust * 100).toFixed(0)}% avg trust</span>
                  <span>{b.total_violations} violations</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No wage analytics data available.</p>
        )}
      </ChartCard>
    </AnalyticsLayout>
  );
}
