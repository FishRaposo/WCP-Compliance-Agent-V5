import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("recharts", () => ({
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  ScatterChart: ({ children }: any) => <div data-testid="scatter-chart">{children}</div>,
  Scatter: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  ComposedChart: ({ children }: any) => <div data-testid="composed-chart">{children}</div>,
  ReferenceLine: () => null,
}));

import DecisionVolumeChart from "../../src/components/analytics/charts/DecisionVolumeChart";
import TrustBandDistributionChart from "../../src/components/analytics/charts/TrustBandDistributionChart";
import ApprovalRateChart from "../../src/components/analytics/charts/ApprovalRateChart";
import ComplianceByTradeChart from "../../src/components/analytics/charts/ComplianceByTradeChart";
import ViolationBreakdownChart from "../../src/components/analytics/charts/ViolationBreakdownChart";
import TopViolatorsChart from "../../src/components/analytics/charts/TopViolatorsChart";
import WageTrendChart from "../../src/components/analytics/charts/WageTrendChart";
import WageDistributionChart from "../../src/components/analytics/charts/WageDistributionChart";
import LLMCostChart from "../../src/components/analytics/charts/LLMCostChart";
import LLMLatencyChart from "../../src/components/analytics/charts/LLMLatencyChart";
import ModelUsageChart from "../../src/components/analytics/charts/ModelUsageChart";

const VOL_DATA = [{ date: "2025-01-01", count: 10, avg_trust: 0.88 }];
const BAND_DATA = [{ trust_band: "auto_approve", count: 80, percentage: 0.8 }];
const APPROVAL_DATA = [{ trust_band: "auto_approve", total: 100, approved: 80, rate: 0.8 }];
const TRADE_DATA = [{ trade: "Electrician", total: 50, approved: 40, flagged: 5, rejected: 5, approval_rate: 80 }];
const VIOLATION_DATA = [{ type: "wage", count: 10, percentage: 0.5 }];
const LOCALITY_DATA = [{ locality: "Washington, DC", total: 50, approval_rate: 85 }];
const TREND_DATA = [{ date: "2025-01-01", total_checked: 50, violations: 5 }];
const SCATTER_DATA = [{ locality: "DC", trade: "Electrician", required_wage: 51.69, actual_avg: 55.0, compliant_pct: 100 }];
const COST_DATA = [{ date: "2025-01-01", decisions: 5, cost_usd: 0.01 }];
const LATENCY_DATA = [{ model: "gpt-4o-mini", p50_ms: 300, p95_ms: 700, p99_ms: 900 }];
const MODEL_DATA = [{ model: "gpt-4o-mini", count: 80, percentage: 0.8 }];

describe("Analytics Chart Components", () => {
  it("DecisionVolumeChart renders without crash", () => {
    const { container } = render(<DecisionVolumeChart data={VOL_DATA} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("DecisionVolumeChart shows empty state for no data", () => {
    const { getByText } = render(<DecisionVolumeChart data={[]} />);
    expect(getByText(/no volume data/i)).toBeInTheDocument();
  });

  it("TrustBandDistributionChart renders without crash", () => {
    const { container } = render(<TrustBandDistributionChart data={BAND_DATA} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("ApprovalRateChart renders without crash", () => {
    const { container } = render(<ApprovalRateChart data={APPROVAL_DATA} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("ComplianceByTradeChart renders without crash", () => {
    const { container } = render(<ComplianceByTradeChart data={TRADE_DATA} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("ViolationBreakdownChart renders without crash", () => {
    const { container } = render(<ViolationBreakdownChart data={VIOLATION_DATA} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("TopViolatorsChart renders without crash", () => {
    const { container } = render(<TopViolatorsChart data={LOCALITY_DATA} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("WageTrendChart renders without crash", () => {
    const { container } = render(<WageTrendChart data={TREND_DATA} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("WageDistributionChart renders without crash", () => {
    const { container } = render(<WageDistributionChart data={SCATTER_DATA} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("LLMCostChart renders without crash", () => {
    const { container } = render(<LLMCostChart data={COST_DATA} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("LLMLatencyChart renders without crash", () => {
    const { container } = render(<LLMLatencyChart data={LATENCY_DATA} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("ModelUsageChart renders without crash", () => {
    const { container } = render(<ModelUsageChart data={MODEL_DATA} />);
    expect(container.firstChild).toBeTruthy();
  });
});
