import KPICard from "../../components/analytics/KPICard";
import ChartCard from "../../components/analytics/ChartCard";
import AnalyticsLayout from "../../components/analytics/AnalyticsLayout";
import {
  ComplianceByTradeChart,
  ViolationBreakdownChart,
  TopViolatorsChart,
} from "../../components/analytics/charts";
import { useComplianceAnalytics } from "../../hooks/useAnalytics";

export default function ComplianceAnalytics() {
  const { data, isLoading } = useComplianceAnalytics();

  const byTrade = (data as any)?.by_trade ?? [];
  const byLocality = (data as any)?.by_locality ?? [];
  const violationTypes = (data as any)?.violation_types ?? [];
  const totalDecisions = (data as any)?.total_decisions ?? 0;
  const approvalRate = (data as any)?.approval_rate ?? 0;

  return (
    <AnalyticsLayout title="Compliance Analytics" description="Breakdown by trade, locality, and violation type">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KPICard label="Total Decisions" value={totalDecisions} loading={isLoading} />
        <KPICard label="Approval Rate" value={approvalRate / 100} format="percent" loading={isLoading} />
      </div>

      <ChartCard title="Compliance by Trade" subtitle="Stacked approved / flagged / rejected" loading={isLoading}>
        <ComplianceByTradeChart data={byTrade} />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Violation Types" loading={isLoading}>
          <ViolationBreakdownChart data={violationTypes} />
        </ChartCard>

        <ChartCard title="Localities by Violation Rate" loading={isLoading}>
          <TopViolatorsChart data={byLocality} />
        </ChartCard>
      </div>
    </AnalyticsLayout>
  );
}
