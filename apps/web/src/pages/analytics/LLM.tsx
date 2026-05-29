import KPICard from "../../components/analytics/KPICard";
import ChartCard from "../../components/analytics/ChartCard";
import AnalyticsLayout from "../../components/analytics/AnalyticsLayout";
import { LLMCostChart, LLMLatencyChart, ModelUsageChart } from "../../components/analytics/charts";
import { useLLMAnalytics } from "../../hooks/useAnalytics";

export default function LLMAnalytics() {
  const { data, isLoading } = useLLMAnalytics();

  const summary = (data as any)?.summary ?? {};
  const costPerDecision = (data as any)?.cost_per_decision ?? [];
  const latencyByModel = (data as any)?.latency_by_model ?? [];
  const modelDistribution = (data as any)?.model_distribution ?? [];

  return (
    <AnalyticsLayout title="LLM Cost Analytics" description="Model usage, cost, and latency metrics">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KPICard label="Total Cost" value={summary.total_cost ?? 0} format="currency" loading={isLoading} />
        <KPICard label="Cost / Decision" value={summary.cost_per_decision ?? 0} format="currency" loading={isLoading} />
        <KPICard label="Avg Latency" value={summary.avg_latency_ms ? `${Math.round(summary.avg_latency_ms)}ms` : "—"} loading={isLoading} />
        <KPICard label="Total Decisions" value={summary.decisions ?? 0} loading={isLoading} />
      </div>

      <ChartCard title="Cost per Decision (14-day)" subtitle="Cost/decision trend with daily volume" loading={isLoading}>
        <LLMCostChart data={costPerDecision} />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Latency by Model" subtitle="p50 / p95 / p99 in ms" loading={isLoading}>
          <LLMLatencyChart data={latencyByModel} />
        </ChartCard>

        <ChartCard title="Model Usage Distribution" loading={isLoading}>
          <ModelUsageChart data={modelDistribution} />
        </ChartCard>
      </div>
    </AnalyticsLayout>
  );
}
