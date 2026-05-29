import KPICard from "../../components/analytics/KPICard";
import ChartCard from "../../components/analytics/ChartCard";
import AnalyticsLayout from "../../components/analytics/AnalyticsLayout";
import { WageTrendChart, WageDistributionChart } from "../../components/analytics/charts";
import { useWagesAnalytics } from "../../hooks/useAnalytics";

export default function WagesAnalytics() {
  const { data, isLoading } = useWagesAnalytics();

  const totalDecisions = (data as any)?.total_decisions ?? 0;
  const violationRate = (data as any)?.violation_rate ?? 0;
  const fringeComplianceRate = (data as any)?.fringe_compliance_rate ?? 0;
  const violationTrend = (data as any)?.violation_trend ?? [];
  const actualVsRequired = (data as any)?.actual_vs_required ?? [];

  return (
    <AnalyticsLayout title="Wage Analytics" description="Wage compliance trends and actual vs. required wage distribution">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard label="Total Decisions" value={totalDecisions} loading={isLoading} />
        <KPICard label="Violation Rate" value={violationRate / 100} format="percent" loading={isLoading} />
        <KPICard label="Fringe Compliance" value={fringeComplianceRate / 100} format="percent" loading={isLoading} />
      </div>

      <ChartCard title="Violation Trend" subtitle="Daily violations vs. total checked" loading={isLoading}>
        <WageTrendChart data={violationTrend} />
      </ChartCard>

      <ChartCard
        title="Actual vs. Required Wage"
        subtitle="Each point = one worker. Green = compliant, Red = underpaid."
        loading={isLoading}
      >
        <WageDistributionChart data={actualVsRequired} />
      </ChartCard>
    </AnalyticsLayout>
  );
}
