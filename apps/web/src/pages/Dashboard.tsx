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
  Upload, 
  Scale, 
  Briefcase, 
  TableProperties, 
  BarChart3, 
  ChevronRight,
  TrendingUp,
  Cpu,
  History
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
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
    date: new Date(v.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    count: v.count,
    trust: (v.avg_trust ?? 0) * 100,
  })) ?? [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      
      {/* 1. Stunning Hero Landing Banner */}
      <div className="relative overflow-hidden bg-glass border-glass rounded-3xl p-8 md:p-10 shadow-premium group">
        {/* Abstract glowing backgrounds inside banner */}
        <div className="absolute top-[-30%] right-[-10%] w-[400px] h-[400px] rounded-full bg-purple-600/10 blur-[100px] pointer-events-none group-hover:bg-purple-600/15 transition-all duration-700" />
        <div className="absolute bottom-[-30%] left-[20%] w-[300px] h-[300px] rounded-full bg-indigo-600/10 blur-[80px] pointer-events-none group-hover:bg-indigo-600/15 transition-all duration-700" />
        
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Compliance Command Center Operational</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              WCP Davis-Bacon Compliance Audit Engine
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              Automated certified payroll parsing, wage determination ledger checks, and deep audit overrides powered by agentic compliance pipelines.
            </p>
          </div>
          
          {/* Animated central glowing holographic shield */}
          <div className="flex justify-center shrink-0 lg:mr-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-premium p-[1px] shadow-2xl shadow-purple-500/20 relative group/shield animate-pulse-glow">
              <div className="w-full h-full rounded-2xl bg-[#09090c] flex items-center justify-center relative">
                <ShieldCheck className="w-12 h-12 text-indigo-400 group-hover/shield:scale-105 transition-transform" />
                <div className="absolute inset-0 rounded-2xl border border-white/10 group-hover/shield:border-white/20 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Navigation Launchpad */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Auditing Operations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { title: "Analyze Payroll", desc: "Upload & audit WH-347", path: "/analyze", icon: Upload, color: "from-indigo-500 to-indigo-600" },
            { title: "Review Queue", desc: "Inspect flagged flags", path: "/review", icon: Scale, color: "from-rose-500 to-rose-600" },
            { title: "Gov Contracts", desc: "Agency localities list", path: "/contracts", icon: Briefcase, color: "from-purple-500 to-purple-600" },
            { title: "Wage Ledgers", desc: "Explore trade rates", path: "/payrolls", icon: TableProperties, color: "from-amber-500 to-amber-600" },
            { title: "Analytics suite", desc: "Inspect model costs", path: "/analytics", icon: BarChart3, color: "from-emerald-500 to-emerald-600" },
          ].map((item) => (
            <Card 
              key={item.title} 
              onClick={() => navigate(item.path)}
              className="bg-glass border-glass hover:bg-glass/80 hover:-translate-y-0.5 cursor-pointer shadow-premium transition-all duration-300 relative group overflow-hidden"
            >
              <CardContent className="p-5 space-y-4 flex flex-col justify-between h-full">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${item.color} text-white w-fit shadow-md shadow-black/10`}>
                  <item.icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
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
              <p className="text-[10px] text-gray-500 mt-0.5">Audited payroll schedules telemetry log</p>
            </div>
            
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">
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
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.2)" 
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.2)" 
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#09090c", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    labelStyle={{ color: "rgba(255,255,255,0.6)", fontSize: "10px", fontWeight: "bold" }}
                    itemStyle={{ color: "#fff", fontSize: "11px" }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#7c3aed" 
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
            <p className="text-[10px] text-gray-500 mt-0.5">Automated prevailing audit indicators</p>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-gray-500">Passing audits ratio</span>
                <span className="text-lg font-bold text-white block mt-0.5">{(approvalRate * 100).toFixed(1)}%</span>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">Compliant</Badge>
            </div>

            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-gray-500">Audits trust score</span>
                <span className="text-lg font-bold text-white block mt-0.5">{avgTrust.toFixed(2)}</span>
              </div>
              <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-bold">High Conf.</Badge>
            </div>

            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-gray-500">Total Audited Decisions</span>
                <span className="text-lg font-bold text-white block mt-0.5">{totalDecisions}</span>
              </div>
              <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-bold">Database Locked</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* 4. SSE Telemetry Live Decision Stream Indicator */}
      {latestDecision && (
        <div className="bg-glass border border-indigo-500/20 shadow-premium p-5 rounded-2xl animate-in slide-in-from-top-4 duration-500 relative overflow-hidden flex items-center justify-between">
          <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-b from-indigo-500 to-violet-500" />
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
              <Activity className="w-5 h-5 animate-pulse-glow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Live Telemetry (SSE)</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-sm text-gray-200 mt-1 leading-relaxed">
                Job ID <span className="font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded text-white">{latestDecision.job_id.slice(0, 8)}</span>
                {" "}marked as <span className="font-semibold capitalize text-indigo-300">{latestDecision.verdict.replace(/_/g, " ")}</span> with
                {" "}<span className="font-semibold text-white">{(latestDecision.trust_score * 100).toFixed(0)}% confidence</span>.
              </p>
            </div>
          </div>
          <Link to="/review" className="text-xs text-indigo-400 font-semibold hover:text-indigo-300 flex items-center gap-1 group shrink-0 ml-4">
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
          <Link to="/decisions" className="text-xs text-gray-400 hover:text-indigo-400 font-medium transition-colors">
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
                      className={`capitalize font-bold text-[10px] px-2.5 py-0.5 rounded-full ${
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
                      <p className="text-[10px] text-gray-500 mt-0.5">{new Date(d.created_at).toLocaleDateString()} at {new Date(d.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 text-xs text-gray-400">
                    <div className="text-right">
                      <span className="font-semibold text-gray-200 block">{d.violation_count}</span>
                      <span className="text-[9px] uppercase tracking-wider text-gray-500">Violations</span>
                    </div>
                    <div className="text-right border-l border-white/10 pl-6">
                      <span className="font-semibold text-gray-200 block">{(d.trust_score * 100).toFixed(0)}%</span>
                      <span className="text-[9px] uppercase tracking-wider text-gray-500">Trust Score</span>
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
