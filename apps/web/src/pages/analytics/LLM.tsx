import KPICard from "../../components/analytics/KPICard";
import ChartCard from "../../components/analytics/ChartCard";
import AnalyticsLayout from "../../components/analytics/AnalyticsLayout";
import { useLLMAnalytics } from "../../hooks/useAnalytics";

export default function LLMAnalytics() {
  const { data, isLoading } = useLLMAnalytics();

  const items = Array.isArray(data) ? data : [];

  return (
    <AnalyticsLayout title="LLM Cost Analytics" description="Model usage, cost, and latency metrics">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard label="Total Decisions" value={items.reduce((s: number, b: any) => s + (b.count || 0), 0)} loading={isLoading} />
        <KPICard label="Avg Cost/Decision" value={items.length > 0 ? (items.reduce((s: number, b: any) => s + (b.avg_cost || 0), 0) / items.length) : 0} format="currency" loading={isLoading} />
        <KPICard label="Avg Latency" value={items.length > 0 ? `${Math.round(items.reduce((s: number, b: any) => s + (b.avg_latency_ms || 0), 0) / items.length)}ms` : "0ms"} loading={isLoading} />
      </div>

      <ChartCard title="Cost by Verdict" subtitle="Average cost and latency per verdict type" loading={isLoading}>
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item: any) => (
              <div key={item.verdict} className="flex items-center justify-between text-sm">
                <span className="capitalize">{item.verdict}</span>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{item.count} decisions</span>
                  <span>${item.avg_cost?.toFixed(4)} avg</span>
                  <span>{Math.round(item.avg_latency_ms || 0)}ms</span>
                  <span>{(item.avg_trust_score * 100).toFixed(0)}% trust</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No LLM analytics data available.</p>
        )}
      </ChartCard>
    </AnalyticsLayout>
  );
}
