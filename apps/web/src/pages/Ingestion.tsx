import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../utils/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  UploadCloud, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Database, 
  History,
  FileSpreadsheet
} from "lucide-react";
import type { IngestionJobSummary } from "../types/api";

export default function Ingestion() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Progress indicators
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "parsing" | "success" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Error inspection state
  const [selectedJob, setSelectedJob] = useState<IngestionJobSummary | null>(null);

  const { data: jobs, isLoading, refetch } = useQuery<IngestionJobSummary[]>({
    queryKey: ["ingestion-jobs"],
    queryFn: () => apiClient.get<IngestionJobSummary[]>("/api/ingestion/jobs"),
  });

  // Handle Drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const simulateIngestion = (file: File) => {
    setSelectedFile(file);
    setUploadState("uploading");
    setUploadProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 15;
      if (progress >= 100) {
        clearInterval(interval);
        setUploadProgress(100);
        setUploadState("parsing");
        
        // Simulate background parsing
        setTimeout(() => {
          setUploadState("success");
          refetch();
          
          // Clear states after a moment
          setTimeout(() => {
            setUploadState("idle");
            setSelectedFile(null);
            setUploadProgress(0);
          }, 2000);
        }, 1500);
      } else {
        setUploadProgress(progress);
      }
    }, 200);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      simulateIngestion(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value && e.target.files && e.target.files[0]) {
      simulateIngestion(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Batch Data Ingestion</h1>
        <p className="text-gray-400 text-sm mt-1">
          Import bulk certified payroll records, zip archives of WH-347 schedules, or contractor spreadsheets into the ingestion pipeline.
        </p>
      </div>

      {/* Main Drag & Drop Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Ingest Panel</h2>
          
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all relative ${
              dragActive ? "border-purple-500 bg-purple-500/5 shadow-lg shadow-purple-500/5" : "border-white/10 bg-glass"
            }`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".zip,.csv,.xlsx,.pdf"
              onChange={handleFileInput}
              className="hidden"
              disabled={uploadState !== "idle"}
            />
            
            {uploadState === "idle" && (
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                  <UploadCloud className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Drop your certified payroll archive here</p>
                  <p className="text-xs text-gray-500 mt-1">Accepts CSV, XLSX spreadsheets, or ZIP folders of WH-347 PDFs</p>
                </div>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold h-9 rounded-xl text-white px-5"
                >
                  Browse Files
                </Button>
              </div>
            )}

            {uploadState === "uploading" && (
              <div className="space-y-4">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                <div>
                  <p className="text-sm font-bold text-white">Uploading {selectedFile?.name}</p>
                  <p className="text-xs text-gray-500 mt-1">Transferring to secure ingest repository...</p>
                </div>
                <div className="max-w-xs mx-auto w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-premium transition-all duration-200" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-semibold text-indigo-300">{uploadProgress}%</span>
              </div>
            )}

            {uploadState === "parsing" && (
              <div className="space-y-4">
                <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                <div>
                  <p className="text-sm font-bold text-white">Auditing payroll structures</p>
                  <p className="text-xs text-gray-500 mt-1">Aligning trades, localities, and wages with DBWD contracts...</p>
                </div>
              </div>
            )}

            {uploadState === "success" && (
              <div className="space-y-4 py-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 animate-bounce">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-400">Ingestion Job Started!</p>
                  <p className="text-xs text-gray-400 mt-1">Audit ledger has successfully generated import streams.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side statistics panel */}
        <div className="space-y-6">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Pipeline Health</h2>
          <Card className="bg-glass border-glass shadow-premium">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-indigo-400 shrink-0" />
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Historical Logs</span>
              </div>
              <div className="space-y-3 divide-y divide-white/5 text-xs">
                <div className="pt-2 flex justify-between">
                  <span className="text-gray-400">Total ingested lines:</span>
                  <strong className="text-white font-bold">12,480 Lines</strong>
                </div>
                <div className="pt-3 flex justify-between">
                  <span className="text-gray-400">Audit pipeline speed:</span>
                  <strong className="text-white font-bold">~140 records/sec</strong>
                </div>
                <div className="pt-3 flex justify-between">
                  <span className="text-gray-400">Validation success:</span>
                  <strong className="text-emerald-400 font-bold">99.1% parsed</strong>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ingestion pipeline job history list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" />
            <span>Ingestion Job History</span>
          </h2>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-xs text-gray-400 hover:text-white">
            Refresh logs
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid gap-3">
            {jobs?.map((j) => (
              <Card key={j.job_id} className="bg-glass border-glass hover:border-white/15 transition-colors overflow-hidden group">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0 mt-1">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs font-semibold bg-white/10 px-2 py-0.5 rounded text-gray-300">
                          {j.job_id}
                        </span>
                        <Badge 
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            j.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            j.status === "partial" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {j.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        <span className="capitalize">{j.type.replace(/_/g, " ")} &bull; {j.source_type}</span>
                        <span className="text-[10px] text-gray-500">&bull; {new Date(j.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 justify-between md:justify-end text-xs">
                    <div className="text-right">
                      <span className="font-bold text-gray-200 block">{j.total_records}</span>
                      <span className="text-[9px] uppercase tracking-wider text-gray-500">Total Rows</span>
                    </div>

                    <div className="text-right border-l border-white/10 pl-6">
                      <span className="font-bold text-emerald-400 block">{j.processed_records}</span>
                      <span className="text-[9px] uppercase tracking-wider text-gray-500">Processed</span>
                    </div>

                    <div className="text-right border-l border-white/10 pl-6">
                      <span className={`font-bold block ${j.failed_records > 0 ? "text-rose-400 animate-pulse" : "text-gray-500"}`}>
                        {j.failed_records}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-gray-500">Failed</span>
                    </div>

                    {j.failed_records > 0 && (
                      <Button 
                        onClick={() => setSelectedJob(j)}
                        className="bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-semibold h-8 rounded-lg px-3 shrink-0 ml-2"
                      >
                        Inspect Errors
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Selected failed job error inspection side drawer */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedJob(null)} />
          <div className="w-full max-w-xl bg-[#09090c] border-l border-white/10 h-full overflow-y-auto relative z-10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-rose-500" />
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  <h2 className="text-lg font-bold text-white">Ingestion Error Diagnostic</h2>
                </div>
                <p className="font-mono text-xs text-gray-500 mt-1">Ingestion ID: {selectedJob.job_id}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-white"
              >
                Close
              </Button>
            </div>

            <div className="flex-1 p-6 space-y-6">
              {/* Job summary metrics in drawer */}
              <div className="bg-glass border-glass p-5 rounded-2xl flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Tally breakdown</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white">{selectedJob.processed_records} / {selectedJob.total_records}</span>
                    <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold">
                      {selectedJob.failed_records} Failed Rows
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold text-right block">Failure Rate</span>
                  <strong className="text-sm text-rose-400 block mt-1">
                    {((selectedJob.failed_records / selectedJob.total_records) * 100).toFixed(1)}% Error Ratio
                  </strong>
                </div>
              </div>

              {/* Error list logs */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest">Detailed Validation Infractions</h4>
                
                <div className="space-y-2">
                  <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-xl space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <strong className="text-rose-300">Row 42: Classification Mismatch</strong>
                      <span className="text-[9px] text-gray-500 font-mono">Row_Index: 42</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed pt-1">
                      Auditor failed parsing employee trade rate schedule. Locality schedule `Boston, MA` requires classification of `Electrician` or `Laborer`. Row 42 logged `Apprentice Supervisor` which is unlisted.
                    </p>
                  </div>

                  <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-xl space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <strong className="text-rose-300">Row 89: Structurally Empty Rate</strong>
                      <span className="text-[9px] text-gray-500 font-mono">Row_Index: 89</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed pt-1">
                      Billing rate is zero or empty. Employee name `Alex Mechanic` logged 38.0 hours but payroll hourly wage is absent. Minimum required for heavy highway structures is $38.50/hr.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

