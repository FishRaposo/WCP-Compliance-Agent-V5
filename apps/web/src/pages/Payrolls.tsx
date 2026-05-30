import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../utils/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, 
  Wrench, 
  MapPin, 
  DollarSign, 
  Clock, 
  Search, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  TrendingUp
} from "lucide-react";
import type { PaginatedPayrolls, PayrollRecordSummary } from "../types/api";

const TRADES = ["All Trades", "Electrician", "Laborer", "Carpenter", "Plumber"];
const LOCALITIES = ["All Localities", "Boston, MA", "Cambridge, MA", "Worcester, MA"];

export default function Payrolls() {
  const [search, setSearch] = useState("");
  const [tradeFilter, setTradeFilter] = useState("All Trades");
  const [localityFilter, setLocalityFilter] = useState("All Localities");
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecordSummary | null>(null);

  const { data, isLoading } = useQuery<PaginatedPayrolls>({
    queryKey: ["payrolls"],
    queryFn: () => apiClient.get<PaginatedPayrolls>("/api/payrolls"),
  });

  const payrollList = data?.items ?? [];

  const filteredPayrolls = payrollList.filter((p) => {
    const matchesSearch = !search || p.employee_name.toLowerCase().includes(search.toLowerCase());
    const matchesTrade = tradeFilter === "All Trades" || p.trade_code === tradeFilter;
    const matchesLocality = localityFilter === "All Localities" || p.locality_code === localityFilter;
    return matchesSearch && matchesTrade && matchesLocality;
  });

  // Simple wage threshold check for visual compliance delta (mocked DBWD minimum rates)
  const getMinWage = (trade: string) => {
    switch (trade) {
      case "Electrician": return 51.69;
      case "Laborer": return 38.50;
      default: return 40.00;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Payroll Audit Registry</h1>
        <p className="text-gray-400 text-sm mt-1">
          Explore individual employee wages, hourly billing rates, trade classifications, and DBWD alignment audits.
        </p>
      </div>

      {/* Advanced Filter Bars */}
      <div className="bg-glass border-glass p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-premium">
        <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
            <Input 
              placeholder="Search employee name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9.5 bg-black/40 border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 h-10 rounded-lg transition-all"
            />
          </div>

          <Select value={tradeFilter} onValueChange={setTradeFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-black/40 border-white/10 text-white h-10 rounded-lg">
              <SelectValue placeholder="Filter Trade" />
            </SelectTrigger>
            <SelectContent className="bg-[#09090c] border-white/10 text-white">
              {TRADES.map((t) => (
                <SelectItem key={t} value={t} className="hover:bg-white/5 font-semibold text-xs py-2">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={localityFilter} onValueChange={setLocalityFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-black/40 border-white/10 text-white h-10 rounded-lg">
              <SelectValue placeholder="Filter Locality" />
            </SelectTrigger>
            <SelectContent className="bg-[#09090c] border-white/10 text-white">
              {LOCALITIES.map((l) => (
                <SelectItem key={l} value={l} className="hover:bg-white/5 font-semibold text-xs py-2">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg shrink-0 self-end md:self-auto">
          {filteredPayrolls.length} Records Ledgered
        </div>
      </div>

      {/* Main ledger list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full bg-white/5 rounded-2xl animate-pulse" />)}
        </div>
      ) : filteredPayrolls.length === 0 ? (
        <div className="bg-glass border-glass p-12 text-center rounded-2xl">
          <p className="text-sm text-gray-400">No payroll audit records match your active search filters.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredPayrolls.map((p) => {
            const minWage = getMinWage(p.trade_code);
            const isCompliant = p.hourly_rate >= minWage;
            
            return (
              <Card 
                key={p.id} 
                className="bg-glass border-glass hover:border-white/15 transition-all shadow-sm overflow-hidden group cursor-pointer"
                onClick={() => setSelectedPayroll(p)}
              >
                <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left Section: Employee details */}
                  <div className="flex flex-wrap items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                        {p.employee_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Wrench className="w-3.5 h-3.5 text-gray-500" />
                          <span>{p.trade_code}</span>
                        </span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-500" />
                          <span>{p.locality_code}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mid Section: Hourly Calculations */}
                  <div className="flex items-center justify-between lg:justify-end gap-8 text-xs text-gray-400 shrink-0">
                    <div className="text-right">
                      <span className="font-semibold text-gray-200 block text-xs flex items-center gap-1 justify-end">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        {p.total_hours.toFixed(1)} hrs
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-gray-500">Audited Hours</span>
                    </div>

                    <div className="text-right border-l border-white/10 pl-8">
                      <span className="font-semibold text-gray-200 block text-xs">
                        ${p.hourly_rate.toFixed(2)}/hr
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-gray-500">Hourly rate</span>
                    </div>

                    <div className="text-right border-l border-white/10 pl-8">
                      <span className="font-extrabold text-white block text-sm">
                        ${p.gross_pay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-gray-500">Gross Wages</span>
                    </div>
                  </div>

                  {/* Right Section: Compliance status badge */}
                  <div className="shrink-0 flex justify-end">
                    <Badge className={`text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                      isCompliant 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}>
                      {isCompliant ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Compliant</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Underpaid</span>
                        </>
                      )}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Selected Payroll details sheet */}
      {selectedPayroll && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedPayroll(null)} />
          <div className="w-full max-w-xl bg-[#09090c] border-l border-white/10 h-full overflow-y-auto relative z-10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-premium" />
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Wage Audit Inspection</h2>
                <p className="text-xs text-gray-500 mt-1">Record ID: {selectedPayroll.id}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedPayroll(null)}
                className="text-gray-400 hover:text-white"
              >
                Close
              </Button>
            </div>

            <div className="flex-1 p-6 space-y-6">
              {/* Employee overview banner card */}
              <div className="bg-glass border-glass p-5 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedPayroll.employee_name}</h3>
                  <p className="text-xs text-indigo-300 mt-0.5">{selectedPayroll.trade_code}</p>
                </div>
              </div>

              {/* Wage calculations block */}
              <div className="bg-glass border-glass p-5 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest">Audited Gross Wage Formulation</h4>
                
                <div className="divide-y divide-white/5 space-y-3">
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                      Logged Hours
                    </span>
                    <span className="font-bold text-white">{selectedPayroll.total_hours.toFixed(1)} Hours</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs pt-3">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-gray-500" />
                      Hourly Audited Rate
                    </span>
                    <span className="font-bold text-white">${selectedPayroll.hourly_rate.toFixed(2)}/hr</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-3 font-extrabold text-white">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                      Total Gross Pay
                    </span>
                    <span className="text-sm text-glow">
                      ${selectedPayroll.gross_pay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Wage compliance delta margin analysis */}
              {(() => {
                const minWage = getMinWage(selectedPayroll.trade_code);
                const complianceDelta = selectedPayroll.hourly_rate - minWage;
                const isCompliant = complianceDelta >= 0;

                return (
                  <div className={`p-5 rounded-2xl border ${
                    isCompliant 
                      ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300" 
                      : "bg-rose-950/20 border-rose-500/20 text-rose-300"
                  }`}>
                    <div className="flex items-center gap-2">
                      {isCompliant ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <ShieldAlert className="w-5 h-5 text-rose-400" />
                      )}
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        Wage Determination Delta Analysis
                      </h4>
                    </div>
                    
                    <p className="text-xs mt-3 leading-relaxed text-gray-300">
                      The Davis-Bacon Prevailing Wage Determination minimum scheduled wage rate for an 
                      <strong>{" "}{selectedPayroll.trade_code}</strong> in <strong>{selectedPayroll.locality_code}</strong> is 
                      <strong>{" "}${minWage.toFixed(2)}/hr</strong>.
                    </p>

                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                      <span>Auditor Delta Margin:</span>
                      <strong className={`font-bold flex items-center ${isCompliant ? "text-emerald-400" : "text-rose-400"}`}>
                        {isCompliant ? "+" : ""}${complianceDelta.toFixed(2)}/hr {isCompliant ? "above minimum" : "below minimum"}
                      </strong>
                    </div>
                  </div>
                );
              })()}

              {/* Connected documents */}
              <div className="bg-glass border-glass p-5 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-gray-400">Linked Contract Number:</span>
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-white font-semibold">
                  {selectedPayroll.contract_id === "contract-001" ? "DBA-2026-001" : "DBA-2026-002"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

