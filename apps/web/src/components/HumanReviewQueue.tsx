import { useState } from "react";
import { useDecisions } from "../hooks/useDecisions";
import TrustScoreBadge from "./TrustScoreBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Eye, 
  ShieldCheck, 
  XCircle, 
  AlertTriangle, 
  Scale, 
  ExternalLink, 
  CheckCircle2, 
  FileText, 
  Loader2
} from "lucide-react";
import type { DecisionSummary } from "../types/api";
import { apiClient } from "../utils/api-client";

function currentReviewer(): string {
  try {
    const u = JSON.parse(localStorage.getItem("wcp_user") || "null");
    return u?.email || u?.user_id || "reviewer";
  } catch {
    return "reviewer";
  }
}

export default function HumanReviewQueue() {
  const { data, isLoading, error, refetch } = useDecisions(50, 0, "require_human_review");
  const [selectedDecision, setSelectedDecision] = useState<DecisionSummary | null>(null);
  const [justification, setJustification] = useState("");
  const [submittingAction, setSubmittingAction] = useState<"approve" | "reject" | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleOverride = async (action: "approve" | "reject") => {
    if (!selectedDecision) return;
    const verdict = action === "approve" ? "approved" : "rejected";
    setSubmittingAction(action);
    setActionSuccess(null);
    setActionError(null);

    try {
      // Persist via the gateway -> Data Platform (the only DB writer), which records a
      // human_review_complete audit event atomically. Success is shown only once it resolves.
      await apiClient.post(`/api/v1/decisions/${selectedDecision.decision_id}/review`, {
        verdict,
        reviewer: currentReviewer(),
        note: justification.trim(),
      });
      setActionSuccess(`Decision recorded. Job ${selectedDecision.job_id.slice(0, 8)} overridden to ${verdict}.`);
      setJustification("");
      setTimeout(() => {
        setSelectedDecision(null);
        setActionSuccess(null);
        refetch();
      }, 1500);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to record the override. Please retry.");
    } finally {
      setSubmittingAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full bg-white/5 rounded-2xl" />)}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/20 bg-red-950/10 shadow-lg">
        <CardContent className="pt-6">
          <p className="text-sm text-red-400 font-bold">Failed to load review queue.</p>
          <p className="text-xs text-red-500 mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-glass border-glass p-12 text-center rounded-2xl">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4 animate-bounce" />
        <h3 className="text-base font-bold text-white">Review Queue Cleared</h3>
        <p className="text-sm text-gray-400 mt-1.5 max-w-sm mx-auto">
          Excellent work! All flagging events have been resolved.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider bg-indigo-500/10 px-3 py-1 rounded-full">
          {data.length} Decision{data.length !== 1 ? "s" : ""} Pending Review
        </p>
      </div>

      <div className="grid gap-4">
        {data.map((d) => (
          <Card key={d.decision_id} className="bg-glass border-glass hover:border-white/15 transition-all shadow-premium overflow-hidden group">
            <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs font-semibold bg-white/10 px-2 py-0.5 rounded text-gray-300">
                    {d.job_id}
                  </span>
                  <TrustScoreBadge score={d.trust_score} band={d.trust_band} />
                </div>
                
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 rounded-full capitalize">
                    {d.verdict.replace(/_/g, " ")}
                  </Badge>
                  <span className="flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    {d.violation_count} Violation{d.violation_count !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    {d.warning_count} Warning{d.warning_count !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[10px] text-gray-500">{new Date(d.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <Button 
                  onClick={() => setSelectedDecision(d)}
                  className="bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold h-9 rounded-xl flex items-center gap-2 group/btn"
                >
                  <Eye className="w-4 h-4 text-gray-400 group-hover/btn:text-white transition-colors" />
                  <span>Inspect Audit</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Advanced Inspection side drawer overlay */}
      {selectedDecision && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex justify-end animate-in fade-in duration-300">
          <div 
            className="absolute inset-0" 
            onClick={() => !submittingAction && setSelectedDecision(null)} 
          />
          
          <div className="w-full max-w-2xl bg-[#09090c] border-l border-white/10 h-full overflow-y-auto relative z-10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer top indicator */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-500" />
            
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-lg font-bold text-white">Compliance Audit Station</h2>
                </div>
                <p className="text-[10px] font-mono text-gray-500 mt-1">Audit Ledger ID: {selectedDecision.decision_id}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedDecision(null)}
                disabled={submittingAction !== null}
                className="text-gray-400 hover:text-white hover:bg-white/5"
              >
                Close
              </Button>
            </div>

            {/* Split pane details contents */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              {/* Trust Summary Card */}
              <div className="bg-glass border-glass p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Audit Diagnostics</h3>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Trust confidence rating</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-extrabold text-white">{(selectedDecision.trust_score * 100).toFixed(0)}%</span>
                      <TrustScoreBadge score={selectedDecision.trust_score} band={selectedDecision.trust_band} />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 uppercase font-semibold">Job Reference</span>
                    <p className="font-mono text-xs text-indigo-400 font-semibold block mt-1 bg-indigo-500/10 px-2 py-0.5 rounded">
                      {selectedDecision.job_id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Infractions & Violations details ledger */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-glass border-glass p-5 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Identified Violations</h4>
                  </div>
                  {selectedDecision.violation_count > 0 ? (
                    <div className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl">
                      <p className="text-xs font-bold text-rose-300">
                        {selectedDecision.violation_count} deterministic violation
                        {selectedDecision.violation_count !== 1 ? "s" : ""}
                      </p>
                      {selectedDecision.reasoning_summary && (
                        <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                          {selectedDecision.reasoning_summary}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No strict regulatory violations identified.</p>
                  )}
                </div>

                <div className="bg-glass border-glass p-5 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Warnings & Anomalies</h4>
                  </div>
                  {selectedDecision.warning_count > 0 ? (
                    <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl">
                      <p className="text-xs font-bold text-amber-300">
                        {selectedDecision.warning_count} warning
                        {selectedDecision.warning_count !== 1 ? "s" : ""} raised
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                        Flagged for human review based on the deterministic report.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No structural anomalies detected.</p>
                  )}
                </div>
              </div>

              {/* Regulatory Citations */}
              <div className="bg-glass border-glass p-5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Regulatory References</span>
                  <FileText className="w-4 h-4 text-gray-500" />
                </div>
                {selectedDecision.citations && selectedDecision.citations.length > 0 ? (
                  <div className="divide-y divide-white/5 space-y-2">
                    {selectedDecision.citations.map((cit, i) => (
                      <div key={i} className="pt-2 text-xs">
                        <p className="font-semibold text-gray-300">
                          {cit.regulation}
                          {cit.section ? ` ${cit.section}` : ""}
                        </p>
                        {cit.text && (
                          <p className="text-[9px] text-gray-500 mt-0.5 leading-relaxed">{cit.text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No regulatory citations recorded for this decision.</p>
                )}
              </div>

              {/* Phoenix Traces & Debug logs */}
              <div className="bg-glass border-glass p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Phoenix LLM Tracing</h4>
                  <p className="text-[10px] text-gray-500 mt-1">Review the raw computational reasoning span for the underlying LLM call.</p>
                </div>
                <Button variant="outline" className="h-8 text-xs font-semibold bg-white/5 hover:bg-white/10 text-indigo-300 hover:text-indigo-200 border-white/10 rounded-xl">
                  <span>Open Phoenix Trace</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </div>

            {/* Override Controls Form */}
            <div className="p-6 border-t border-white/5 bg-black/40 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wide">Override Justification Comment</label>
                <Textarea 
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Type structural audit observations or override reasoning here (minimum 10 characters)..."
                  className="bg-black/50 border-white/10 text-white text-xs min-h-[80px] rounded-xl focus:border-indigo-500/50 focus:ring-indigo-500/20 transition-all placeholder-gray-500"
                  disabled={submittingAction !== null || actionSuccess !== null}
                />
              </div>

              {actionError && (
                <div className="p-4 bg-rose-950/20 border border-rose-500/20 rounded-xl flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <p className="text-xs text-rose-300 font-semibold leading-relaxed">{actionError}</p>
                </div>
              )}

              {actionSuccess ? (
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-center gap-3 animate-in fade-in duration-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-300 font-semibold leading-relaxed">{actionSuccess}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => handleOverride("reject")}
                    disabled={justification.trim().length < 10 || submittingAction !== null}
                    className="bg-rose-950/20 text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 text-xs font-bold h-10 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-950/10"
                  >
                    {submittingAction === "reject" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Logging Rejection...</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>Override Reject</span>
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={() => handleOverride("approve")}
                    disabled={justification.trim().length < 10 || submittingAction !== null}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold h-10 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/10"
                  >
                    {submittingAction === "approve" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Logging Approval...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Override Approve</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

