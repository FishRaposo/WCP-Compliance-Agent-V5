import KPICard from "../../components/analytics/KPICard";
import ChartCard from "../../components/analytics/ChartCard";
import AnalyticsLayout from "../../components/analytics/AnalyticsLayout";
import LiveFeed from "../../components/analytics/LiveFeed";
import { DecisionVolumeChart, TrustBandDistributionChart, ApprovalRateChart } from "../../components/analytics/charts";
import {
  useAnalyticsOverview,
  useDecisionVolume,
  useApprovalByTrade,
  useTrustBandDistribution,
} from "../../hooks/useAnalytics";

export default function AnalyticsOverview() {
  const { data: overview, isLoading: loadingOverview } = useAnalyticsOverview();
  const { data: volume, isLoading: loadingVolume } = useDecisionVolume();
  const { data: approval, isLoading: loadingApproval } = useApprovalByTrade();
  const { data: trustBands, isLoading: loadingTrustBands } = useTrustBandDistribution();

  const totalDecisions = overview?.total_decisions ?? 0;
  const avgTrust = overview?.avg_trust_score ?? 0;
  const approvalRate = approval?.overall?.rate ?? 0;
  const reviewQueue = (overview as any)?.human_review_queue_depth ?? 0;

  return (
    <AnalyticsLayout title="Analytics Overview" description="Key metrics across all compliance decisions">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Decisions" value={totalDecisions} loading={loadingOverview} />
        <KPICard label="Approval Rate" value={approvalRate} format="percent" loading={loadingApproval} />
        <KPICard label="Avg Trust Score" value={avgTrust.toFixed(2)} loading={loadingOverview} />
        <KPICard label="Review Queue" value={reviewQueue} loading={loadingOverview} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Decision Volume" subtitle="Daily decision counts" loading={loadingVolume}>
          <DecisionVolumeChart data={volume ?? []} />
        </ChartCard>

        <ChartCard title="Trust Band Distribution" loading={loadingTrustBands}>
          <TrustBandDistributionChart data={trustBands ?? []} />
        </ChartCard>
      </div>

      <ChartCard title="Approval Rate by Trust Band" loading={loadingApproval}>
        <ApprovalRateChart data={approval?.by_trust_band ?? []} />
      </ChartCard>

      <LiveFeed />
    </AnalyticsLayout>
  );
}
