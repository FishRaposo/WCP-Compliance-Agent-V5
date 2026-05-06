import KPICard from "../../components/analytics/KPICard";
import ChartCard from "../../components/analytics/ChartCard";
import AnalyticsLayout from "../../components/analytics/AnalyticsLayout";
import { useAnalyticsOverview, useDecisionVolume, useApprovalByTrade } from "../../hooks/useAnalytics";

export default function AnalyticsOverview() {
  const { data: overview, isLoading: loadingOverview } = useAnalyticsOverview();
  const { data: volume, isLoading: loadingVolume } = useDecisionVolume();
  const { data: approval, isLoading: loadingApproval } = useApprovalByTrade();

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

      <ChartCard title="Decision Volume" subtitle="Daily decision counts" loading={loadingVolume}>
        {volume && volume.length > 0 ? (
          <div className="space-y-2">
            {volume.slice(0, 14).map((d) => (
              <div key={d.date} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{d.date}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2"
                      style={{ width: `${Math.min((d.count / 20) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs w-8 text-right">{d.count}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No decision data available.</p>
        )}
      </ChartCard>

      <ChartCard title="Approval by Trust Band" loading={loadingApproval}>
        {approval?.by_trust_band && approval.by_trust_band.length > 0 ? (
          <div className="space-y-2">
            {approval.by_trust_band.map((b) => (
              <div key={b.trust_band} className="flex items-center justify-between text-sm">
                <span className="capitalize">{b.trust_band.replace(/_/g, " ")}</span>
                <span className="font-mono text-xs">{(b.rate * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No trust band data available.</p>
        )}
      </ChartCard>
    </AnalyticsLayout>
  );
}
