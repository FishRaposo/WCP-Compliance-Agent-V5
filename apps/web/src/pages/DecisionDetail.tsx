import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck, AlertTriangle, FileText, Activity, Scale } from "lucide-react";
import { useDecision } from "../hooks/useDecision";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const VERDICT_STYLES: Record<string, string> = {
  approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  needs_review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const BAND_LABEL: Record<string, string> = {
  auto_approve: "Auto-approve",
  flag_for_review: "Flag for review",
  require_human_review: "Requires human review",
};

export default function DecisionDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useDecision(id);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <Link
        to="/decisions"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to decisions
      </Link>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-64 bg-white/5 rounded-xl" />
          <Skeleton className="h-40 w-full bg-white/5 rounded-2xl" />
        </div>
      ) : isError || !data ? (
        <div className="bg-glass border-glass p-12 text-center rounded-2xl">
          <p className="text-sm text-gray-400">Decision not found or unavailable.</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Decision Audit</h1>
              <p className="font-mono text-xs text-indigo-300 mt-1">
                {data.decision_id ?? data.id ?? data.job_id}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={`text-xs font-bold px-3 py-1 rounded-full capitalize border ${
                  VERDICT_STYLES[data.verdict] ?? "bg-gray-500/10 text-gray-400 border-gray-500/20"
                }`}
              >
                {data.verdict.replace("_", " ")}
              </Badge>
              <Badge className="text-xs font-semibold px-3 py-1 rounded-full bg-white/5 text-gray-300 border border-white/10">
                {BAND_LABEL[data.trust_band] ?? data.trust_band}
              </Badge>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI icon={<Scale className="w-4 h-4" />} label="Trust Score" value={`${Math.round(data.trust_score * 100)}%`} tint="text-indigo-400" />
            <KPI icon={<AlertTriangle className="w-4 h-4" />} label="Violations" value={String(data.violation_count)} tint="text-red-400" />
            <KPI icon={<AlertTriangle className="w-4 h-4" />} label="Warnings" value={String(data.warning_count)} tint="text-amber-400" />
            <KPI icon={<ShieldCheck className="w-4 h-4" />} label="LLM Confidence" value={`${Math.round((data.llm_confidence ?? 0) * 100)}%`} tint="text-emerald-400" />
          </div>

          {/* Reasoning */}
          <Card className="bg-glass border-glass shadow-premium">
            <CardContent className="p-6 space-y-3">
              <h2 className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-widest">
                <FileText className="w-4 h-4 text-indigo-400" /> Reasoning Summary
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">{data.reasoning_summary}</p>
            </CardContent>
          </Card>

          {/* Grounded citations */}
          <Card className="bg-glass border-glass shadow-premium">
            <CardContent className="p-6 space-y-4">
              <h2 className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-widest">
                <Scale className="w-4 h-4 text-purple-400" /> Regulation Citations
              </h2>
              {data.citations.length === 0 ? (
                <p className="text-sm text-gray-500">No citations attached to this decision.</p>
              ) : (
                <ul className="space-y-4">
                  {data.citations.map((c, i) => (
                    <li key={`${c.regulation}-${c.section}-${i}`} className="border-l-2 border-purple-500/30 pl-4">
                      <p className="font-mono text-xs font-bold text-purple-300">{c.regulation}</p>
                      {c.section && c.section !== c.regulation && (
                        <p className="text-[11px] text-gray-500 mt-0.5">&sect; {c.section}</p>
                      )}
                      {c.text && (
                        <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{c.text}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Trace metadata */}
          <Card className="bg-glass border-glass shadow-premium">
            <CardContent className="p-6 space-y-4">
              <h2 className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-widest">
                <Activity className="w-4 h-4 text-emerald-400" /> Trace &amp; Cost
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <Meta label="Job ID" value={data.job_id} mono />
                <Meta label="Trace ID" value={data.phoenix_trace_id || "—"} mono />
                <Meta label="LLM Cost" value={data.cost_usd != null ? `$${data.cost_usd.toFixed(4)}` : "—"} />
                <Meta label="Latency" value={data.latency_ms != null ? `${data.latency_ms} ms` : "—"} />
                <Meta label="Created" value={data.created_at ? new Date(data.created_at).toLocaleString() : "—"} />
                {data.review_status && <Meta label="Review" value={`${data.review_status}${data.reviewed_by ? ` by ${data.reviewed_by}` : ""}`} />}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KPI({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint: string }) {
  return (
    <Card className="bg-glass border-glass shadow-premium">
      <CardContent className="p-5 space-y-1.5">
        <div className={`flex items-center gap-1.5 ${tint}`}>{icon}
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
        </div>
        <p className="text-2xl font-extrabold text-white">{value}</p>
      </CardContent>
    </Card>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
      <p className={`text-gray-300 break-all ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
