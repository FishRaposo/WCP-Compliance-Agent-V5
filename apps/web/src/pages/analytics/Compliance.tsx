import ChartCard from "../../components/analytics/ChartCard";
import AnalyticsLayout from "../../components/analytics/AnalyticsLayout";
import { useComplianceAnalytics } from "../../hooks/useAnalytics";
import { Badge } from "@/components/ui/badge";

export default function ComplianceAnalytics() {
  const { data, isLoading } = useComplianceAnalytics();

  return (
    <AnalyticsLayout title="Compliance Analytics" description="Breakdown by trade, locality, and violation type">
      <ChartCard title="Verdict Distribution" loading={isLoading}>
        {data && Array.isArray(data) ? (
          <div className="space-y-2">
            {data.map((item: any) => (
              <div key={item.verdict} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={item.verdict === "approved" ? "default" : item.verdict === "rejected" ? "destructive" : "secondary"}>
                    {item.verdict}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{item.count} decisions</span>
                  <span>{(item.avg_violations ?? 0).toFixed(1)} avg violations</span>
                  <span>{(item.avg_warnings ?? 0).toFixed(1)} avg warnings</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No compliance data available.</p>
        )}
      </ChartCard>
    </AnalyticsLayout>
  );
}
