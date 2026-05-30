import { useDecisionStream } from "../hooks/useDecisionStream";
import { useDecisions } from "../hooks/useDecisions";
import { useApprovalByTrade } from "../hooks/useAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, ShieldAlert, Award, FileSpreadsheet, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { latestDecision } = useDecisionStream();
  const { data: recentDecisions, isLoading: loadingDecisions, error: decisionsError } = useDecisions(10);
  const { data: approvalData, isLoading: loadingApproval, error: approvalError } = useApprovalByTrade();

  const totalDecisions = approvalData?.overall.total ?? 0;
  const approvalRate = approvalData?.overall.rate ?? 0;

  const avgTrust =
    recentDecisions && recentDecisions.length > 0
      ? recentDecisions.reduce((sum, d) => sum + d.trust_score, 0) / recentDecisions.length
      : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time Davis-Bacon payroll compliance monitoring & automated audits.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-glass border-glass px-4 py-2 rounded-xl text-xs font-semibold text-indigo-300">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <span>Systems Operational</span>
        </div>
      </div>

      {(decisionsError || approvalError) && (
        <Card className="border-red-500/20 bg-red-950/10 shadow-lg shadow-red-950/5">
          <CardContent className="pt-5 flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">Failed to load live dashboard telemetry. Please verify connection to Gateway service.</p>
          </CardContent>
        </Card>
      )}

      {/* Analytics KPI Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-glass border-glass shadow-premium hover:bg-glass/80 hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Decisions</CardTitle>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-300">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {loadingApproval ? <Skeleton className="h-9 w-24 bg-white/5" /> : (
              <p className="text-4xl font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-300">
                {totalDecisions}
              </p>
            )}
            <p className="text-[10px] text-gray-500 mt-1">Davis-Bacon payrolls audited</p>
          </CardContent>
        </Card>

        <Card className="bg-glass border-glass shadow-premium hover:bg-glass/80 hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-wider">Approval Rate</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300">
              <Award className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {loadingApproval ? <Skeleton className="h-9 w-24 bg-white/5" /> : (
              <p className="text-4xl font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-300">
                {(approvalRate * 100).toFixed(1)}%
              </p>
            )}
            <p className="text-[10px] text-gray-500 mt-1">Automatic compliance passing rate</p>
          </CardContent>
        </Card>

        <Card className="bg-glass border-glass shadow-premium hover:bg-glass/80 hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg. Trust Score</CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-300">
              <Activity className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {loadingDecisions ? <Skeleton className="h-9 w-24 bg-white/5" /> : (
               <p className="text-4xl font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-300">
                 {avgTrust.toFixed(2)}
               </p>
            )}
            <p className="text-[10px] text-gray-500 mt-1">Average compliance confidence level</p>
          </CardContent>
        </Card>
      </div>

      {/* SSE Telemetry Live Decision Stream Indicator */}
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

      {/* Recent Compliance Audits Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight">Recent Compliance Audits</h2>
          <Link to="/decisions" className="text-xs text-gray-400 hover:text-indigo-400 font-medium transition-colors">
            View full log history
          </Link>
        </div>

        {loadingDecisions && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        )}

        {!loadingDecisions && (!recentDecisions || recentDecisions.length === 0) && (
          <div className="bg-glass border-glass p-8 text-center rounded-2xl">
            <p className="text-sm text-gray-400">No audits recorded. Use the Analyze module to start.</p>
          </div>
        )}

        <div className="grid gap-3">
          {recentDecisions?.map((d) => (
            <Card key={d.decision_id} className="bg-glass border-glass hover:border-white/15 transition-colors shadow-sm overflow-hidden group">
              <CardContent className="py-4 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Badge 
                    variant={d.verdict === "approved" ? "default" : d.verdict === "rejected" ? "destructive" : "secondary"} 
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
      </div>
    </div>
  );
}

