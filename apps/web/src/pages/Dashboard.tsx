import { useDecisionStream } from "../hooks/useDecisionStream";
import { useDecisions } from "../hooks/useDecisions";
import { useApprovalByTrade, useDecisionVolume } from "../hooks/useAnalytics";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import {
  ShieldCheck,
  Activity,
  ChevronRight,
  TrendingUp,
  Cpu,
  History
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { latestDecision } = useDecisionStream();
  const { data: recentDecisions, isLoading: loadingDecisions } = useDecisions(10);
  const { data: approvalData } = useApprovalByTrade();
  const { data: volumeData, isLoading: loadingVolume } = useDecisionVolume();

  const totalDecisions = approvalData?.overall.total ?? 0;
  const approvalRate = approvalData?.overall.rate ?? 0;

  const avgTrust =
    recentDecisions && recentDecisions.length > 0
      ? recentDecisions.reduce((sum, d) => sum + d.trust_score, 0) / recentDecisions.length
      : 0;

  // Format Recharts data
  const chartData = volumeData?.map((v) => ({
    date: new Date(v.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    count: v.count,
    trust: (v.avg_trust ?? 0) * 100,
  })) ?? [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">

      {/* 1. Audit brief: deterministic authority first */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#111a15] p-6 md:p-8">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:items-end">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex flex-wrap items-center gap-2 rounded border border-white/10 bg-white/5 px-3 py-1.5">
              <ShieldCheck className="h-4 w-4 text-indigo-400" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-300">Davis-Bacon audit · WH-347</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">
              Payroll compliance, decided before the model speaks.
            </h1>
            <p className="text-sm leading-relaxed text-gray-400">
              Parse certified payrolls, check wage determinations and arithmetic against a supported rule pack, and keep the official decision inspectable. Unverified coverage goes to human review, not automatic approval.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-gray-400">
              <span className="rounded border border-white/10 px-2 py-1">Sample operations</span>
              <span className="rounded border border-white/10 px-2 py-1">Rule pack: supported</span>
              <span className="rounded border border-white/10 px-2 py-1">Scope: WH-347</span>
            </div>
          </div>
          <div className="border-l-2 border-[#9a743c] pl-5">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Current audit posture</p>
            <dl className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between gap-4 border-t border-white/10 pt-3">
                <dt className="text-sm text-gray-400">Passing audits</dt>
                <dd className="text-2xl font-bold text-white">{(approvalRate * 100).toFixed(1)}%</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-white/10 pt-3">
                <dt className="text-sm text-gray-400">Average trust</dt>
                <dd className="text-2xl font-bold text-white">{avgTrust.toFixed(2)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-white/10 pt-3">
                <dt className="text-sm text-gray-400">Decisions</dt>
                <dd className="text-2xl font-bold text-white">{totalDecisions}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* 2. Command ledger */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Auditor actions</h2>
          <span className="text-xs text-gray-500">Five ledger views</span>
        </div>
        <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { title: "Analyze Payroll", desc: "Upload and audit a WH-347", path: "/analyze" },
            { title: "Review Queue", desc: "Inspect flagged audits", path: "/review" },
            { title: "Gov Contracts", desc: "Agency and locality records", path: "/contracts" },
            { title: "Wage Ledgers", desc: "Explore trade rates", path: "/payrolls" },
            { title: "Analytics Suite", desc: "Inspect decision and model costs", path: "/analytics" },
          ].map((item, index) => (
            <Link
              key={item.title}
              to={item.path}
              className="group flex min-h-28 flex-col justify-between gap-4 bg-[#111a15] p-4 transition-colors hover:bg-[#17241d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1410]"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-gray-500">0{index + 1}</span>
                <ChevronRight className="h-4 w-4 text-gray-500 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-300" aria-hidden="true" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-white group-hover:text-indigo-300">{item.title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-gray-500">{item.desc}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 3. Core Telemetry Visualizations & Live Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Glowing Recharts Area Chart */}
        <div className="lg:col-span-2 bg-glass border-glass rounded-2xl p-6 shadow-premium flex flex-col justify-between">
          <div className="flex items-center justify-between pb-6">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">System Decision Volumes</h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Audited payroll schedules telemetry log</p>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" />Audits count</span>
            </div>
          </div>

          <div className="h-60 w-full relative z-10">
            {loadingVolume ? (
              <Skeleton className="w-full h-full bg-white/5 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#b88d4f" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#b88d4f" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    stroke="rgba(255,255,255,0.2)"
                    tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.2)"
                    tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#111a15", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    labelStyle={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", fontWeight: "bold" }}
                    itemStyle={{ color: "#fff", fontSize: "12px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#b88d4f"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Col: Live stats gauges */}
        <div className="bg-glass border-glass rounded-2xl p-6 shadow-premium flex flex-col justify-between">
          <div className="pb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Auditor Telemetry Metrics</h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Automated prevailing audit indicators</p>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
              <div>
                <span className="text-xs uppercase tracking-wider text-gray-500">Passing audits ratio</span>
                <span className="text-lg font-bold text-white block mt-0.5">{(approvalRate * 100).toFixed(1)}%</span>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">Compliant</Badge>
            </div>

            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
              <div>
                <span className="text-xs uppercase tracking-wider text-gray-500">Audits trust score</span>
                <span className="text-lg font-bold text-white block mt-0.5">{avgTrust.toFixed(2)}</span>
              </div>
              <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold">High Conf.</Badge>
            </div>

            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
              <div>
                <span className="text-xs uppercase tracking-wider text-gray-500">Total Audited Decisions</span>
                <span className="text-lg font-bold text-white block mt-0.5">{totalDecisions}</span>
              </div>
              <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold">Database Locked</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* 4. SSE Telemetry Live Decision Stream Indicator */}
      {latestDecision && (
        <div className="bg-glass border border-indigo-500/20 shadow-premium p-5 rounded-2xl animate-in slide-in-from-top-4 duration-500 relative overflow-hidden flex items-center justify-between" role="status" aria-live="polite">
          <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-ledger-accent" />
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
              <Activity className="w-5 h-5 " />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Live Telemetry (SSE)</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-sm text-gray-200 mt-1 leading-relaxed">
                Job ID <span className="font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded text-white">{latestDecision.job_id.slice(0, 8)}</span>
                {" "}marked as <span className="font-semibold capitalize text-indigo-300">{latestDecision.verdict.replace(/_/g, " ")}</span> with
                {" "}<span className="font-semibold text-white">{(latestDecision.trust_score * 100).toFixed(0)}% confidence</span>.
              </p>
            </div>
          </div>
          <Link to="/review" className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 group shrink-0 ml-4">
            <span>Audit Queue</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      )}

      {/* 5. Recent Compliance Audits Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" />
            <span>Recent Audits Ledger</span>
          </h2>
          <Link to="/decisions" className="inline-flex min-h-[44px] items-center text-xs font-medium text-gray-400 transition-colors hover:text-indigo-400">
            View full log history
          </Link>
        </div>

        {loadingDecisions ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid gap-3">
            {recentDecisions?.slice(0, 5).map((d) => (
              <Card key={d.decision_id} className="bg-glass border-glass hover:border-white/15 transition-colors shadow-sm overflow-hidden group">
                <CardContent className="py-4 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Badge
                      className={`capitalize font-bold text-xs px-2.5 py-0.5 rounded-full ${
                        d.verdict === "approved" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        d.verdict === "rejected" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                        "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {d.verdict.replace(/_/g, " ")}
                    </Badge>
                    <div>
                      <p className="font-mono text-xs text-gray-300 font-semibold group-hover:text-indigo-400 transition-colors">
                        {d.job_id}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(d.created_at).toLocaleDateString("en-US")} at {new Date(d.created_at).toLocaleTimeString("en-US")}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 text-xs text-gray-400">
                    <div className="text-right">
                      <span className="font-semibold text-gray-200 block">{d.violation_count}</span>
                      <span className="text-xs uppercase tracking-wider text-gray-500">Violations</span>
                    </div>
                    <div className="text-right border-l border-white/10 pl-6">
                      <span className="font-semibold text-gray-200 block">{(d.trust_score * 100).toFixed(0)}%</span>
                      <span className="text-xs uppercase tracking-wider text-gray-500">Trust Score</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
