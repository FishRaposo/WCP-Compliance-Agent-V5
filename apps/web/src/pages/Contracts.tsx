import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../utils/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Briefcase, 
  MapPin, 
  UserCheck, 
  Database, 
  Calendar, 
  Plus, 
  FileCheck, 
  ShieldCheck, 
  FolderGit2, 
  Search,
  CheckCircle2,
  Loader2
} from "lucide-react";
import type { PaginatedContracts, ContractSummary } from "../types/api";

export default function Contracts() {
  const [search, setSearch] = useState("");
  const [selectedContract, setSelectedContract] = useState<ContractSummary | null>(null);
  
  // Register Contract modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formNumber, setFormNumber] = useState("");
  const [formName, setFormName] = useState("");
  const [formContractor, setFormContractor] = useState("");
  const [formLocality, setFormLocality] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<PaginatedContracts>({
    queryKey: ["contracts"],
    queryFn: () => apiClient.get<PaginatedContracts>("/api/contracts"),
  });

  const contractsList = data?.items ?? [];

  const filteredContracts = contractsList.filter((c) => 
    !search || 
    c.project_name.toLowerCase().includes(search.toLowerCase()) ||
    c.contract_number.toLowerCase().includes(search.toLowerCase()) ||
    c.contractor_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateSuccess(null);
    setCreateError(null);

    const today = new Date().toISOString().slice(0, 10);
    try {
      await apiClient.post("/api/v1/contracts", {
        contract_number: formNumber,
        project_name: formName,
        contractor_name: formContractor,
        locality: formLocality,
        start_date: formStartDate || today,
        end_date: formEndDate || undefined,
      });

      setCreateSuccess(`Contract ${formNumber} ("${formName}") successfully registered for auditing!`);

      // Clear form
      setFormNumber("");
      setFormName("");
      setFormContractor("");
      setFormLocality("");
      setFormStartDate("");
      setFormEndDate("");

      await refetch();

      setTimeout(() => {
        setIsCreateOpen(false);
        setCreateSuccess(null);
      }, 1800);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to register contract");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Government Contracts</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage active federal agencies, localities, contractor wages, and prevailing wage schedules.
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateOpen(true)}
          className="bg-gradient-premium hover:opacity-95 text-white font-medium h-10.5 rounded-xl shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Register Contract</span>
        </Button>
      </div>

      {/* Analytics widgets row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-glass border-glass shadow-premium">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active Audited Agencies</p>
              <p className="text-2xl font-extrabold text-white mt-1">12 Agencies</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-glass border-glass shadow-premium">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Registered Contractors</p>
              <p className="text-2xl font-extrabold text-white mt-1">45 Contractors</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-glass border-glass shadow-premium">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Compliant Audit Record Ratio</p>
              <p className="text-2xl font-extrabold text-white mt-1">94.8% Compliant</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contract Search filter */}
      <div className="flex gap-4 max-w-md relative">
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
        <Input 
          placeholder="Search by ID, project title, contractor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-glass border-glass text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 h-11.5 rounded-xl transition-all"
        />
      </div>

      {/* Grid of contracts */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => <Skeleton key={i} className="h-44 bg-white/5 rounded-2xl animate-pulse" />)}
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="bg-glass border-glass p-12 text-center rounded-2xl">
          <p className="text-sm text-gray-400">No registered contracts matching the search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredContracts.map((c) => (
            <Card key={c.id} className="bg-glass border-glass hover:border-white/15 transition-all shadow-premium overflow-hidden group relative">
              {/* Active accent strip */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-500" />
              
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-300 tracking-wider">
                    {c.contract_number}
                  </span>
                  <Badge className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
                    c.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                  }`}>
                    {c.status}
                  </Badge>
                </div>
                
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                    {c.project_name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span>Contractor: <strong className="text-gray-300">{c.contractor_name}</strong></span>
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs border-t border-white/5 pt-4">
                  <div className="flex items-center gap-1 text-gray-400">
                    <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    <span>{c.locality}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                    <span>{c.payroll_record_count} Records</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>{c.decision_count} Decisions</span>
                  </div>
                </div>

                <Button 
                  onClick={() => setSelectedContract(c)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white text-xs font-semibold h-9 rounded-xl border border-white/5 mt-2"
                >
                  Inspect Contract
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Selected Contract details Sheet Overlay */}
      {selectedContract && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedContract(null)} />
          <div className="w-full max-w-xl bg-[#09090c] border-l border-white/10 h-full overflow-y-auto relative z-10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-500" />
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Contract Ledger Details</h2>
                <p className="font-mono text-xs text-indigo-300 mt-1">{selectedContract.contract_number}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedContract(null)}
                className="text-gray-400 hover:text-white"
              >
                Close
              </Button>
            </div>

            <div className="flex-1 p-6 space-y-6">
              {/* Project Title Card */}
              <div className="bg-glass border-glass p-5 rounded-2xl space-y-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Project Name</h3>
                <p className="text-base font-bold text-white leading-relaxed">{selectedContract.project_name}</p>
              </div>

              {/* Meta stats list */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-glass border-glass p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Contractor Entity</span>
                  <span className="text-sm font-bold text-white block truncate">{selectedContract.contractor_name}</span>
                </div>
                <div className="bg-glass border-glass p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Geographic Locality</span>
                  <span className="text-sm font-bold text-white block truncate">{selectedContract.locality}</span>
                </div>
              </div>

              {/* Ledger logs metrics */}
              <div className="bg-glass border-glass p-5 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest">Ledger Logs Tally</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-white/5 rounded-xl">
                    <Database className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Payroll Records</span>
                    <span className="text-base font-extrabold text-white mt-1 block">{selectedContract.payroll_record_count}</span>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <ShieldCheck className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Wage Audits</span>
                    <span className="text-base font-extrabold text-white mt-1 block">{selectedContract.decision_count}</span>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <Calendar className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Audit Onboarded</span>
                    <span className="text-[11px] font-bold text-white mt-2 block truncate">
                      {new Date(selectedContract.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Wage Determination parameters details panel */}
              <div className="bg-glass border-glass p-5 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">Wage Determination Guidelines</span>
                <p className="text-xs text-gray-400 leading-relaxed">
                  This contract is bounded by the federal Davis-Bacon Wage Determination Schedule guidelines for heavy/highway construction in <strong>{selectedContract.locality}</strong>. Underpayments of trades like Electricians or Carpenters automatically trigger low trust score warnings, directing audits to the review queue.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Contract Modal Dialog */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-md bg-[#09090c] border-glass shadow-premium relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-premium" />
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-white">Register Audited Contract</CardTitle>
              <p className="text-xs text-gray-400 mt-1">Onboard a government contract project into the automated audit engine.</p>
            </CardHeader>
            <CardContent className="pt-2">
              {createSuccess ? (
                <div className="p-5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-center gap-3 animate-in fade-in duration-300 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-300 font-semibold leading-relaxed">{createSuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">Contract ID / Number</label>
                    <Input 
                      placeholder="e.g. DBA-2026-003"
                      value={formNumber}
                      onChange={(e) => setFormNumber(e.target.value)}
                      required
                      className="bg-black/40 border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 h-10.5 rounded-lg transition-all text-xs"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">Project Title</label>
                    <Input 
                      placeholder="e.g. Logan International Runway Reinforcement"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                      className="bg-black/40 border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 h-10.5 rounded-lg transition-all text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">Primary Contractor Entity</label>
                    <Input 
                      placeholder="e.g. Boston Heavy Excavators LLC"
                      value={formContractor}
                      onChange={(e) => setFormContractor(e.target.value)}
                      required
                      className="bg-black/40 border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 h-10.5 rounded-lg transition-all text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">Locality (City, State)</label>
                    <Input
                      placeholder="e.g. Boston, MA"
                      value={formLocality}
                      onChange={(e) => setFormLocality(e.target.value)}
                      required
                      className="bg-black/40 border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 h-10.5 rounded-lg transition-all text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">Start Date</label>
                      <Input
                        type="date"
                        value={formStartDate}
                        onChange={(e) => setFormStartDate(e.target.value)}
                        required
                        className="bg-black/40 border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/20 h-10.5 rounded-lg transition-all text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">End Date (optional)</label>
                      <Input
                        type="date"
                        value={formEndDate}
                        onChange={(e) => setFormEndDate(e.target.value)}
                        className="bg-black/40 border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/20 h-10.5 rounded-lg transition-all text-xs"
                      />
                    </div>
                  </div>

                  {createError && (
                    <p className="text-xs text-red-400 font-medium">{createError}</p>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <Button 
                      type="button"
                      variant="ghost"
                      onClick={() => setIsCreateOpen(false)}
                      disabled={creating}
                      className="text-gray-400 hover:text-white hover:bg-white/5 h-10 rounded-lg text-xs font-semibold"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={creating}
                      className="bg-gradient-premium hover:opacity-95 text-white font-semibold h-10 rounded-lg text-xs flex items-center justify-center gap-2"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Onboarding...</span>
                        </>
                      ) : (
                        "Register Project"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

