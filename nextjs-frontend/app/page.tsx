// app/page.tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { 
  Activity,
  Sparkles, 
  History, 
  ArrowRight,
  TrendingUp,
} from "lucide-react";

type DenialReason = { reason: string; probability: number };

type PredictionResult = {
  approval_probability: number;
  denial_probability: number;
  top_denial_reasons: { reason: string; probability: number }[];
};

type ExplanationResult = {
  explanation: string;
  approval_probability: number;
  denial_probability: number;
  top_denial_reasons: DenialReason[];
};

type RecentClaim = {
  id: string;
  icdCodes: string;
  cptCodes: string;
  billedAmount: string;
  providerType: string;
  networkStatus: string;
  patientQuestion: string;
  createdAt: string;
};

export default function TriagePage() {
  const [icdCodes, setIcdCodes] = useState("");
  const [cptCodes, setCptCodes] = useState("");
  const [billedAmount, setBilledAmount] = useState("");
  const [providerType, setProviderType] = useState("");
  const [networkStatus, setNetworkStatus] = useState("");
  const [patientQuestion, setPatientQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [explanationResult, setExplanationResult] = useState<ExplanationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentClaims, setRecentClaims] = useState<RecentClaim[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setPrediction(null);
    setExplanationResult(null);

    const amount = parseFloat(billedAmount);
    if (!billedAmount || Number.isNaN(amount) || amount <= 0) {
      setError("Please enter a valid billed amount.");
      setLoading(false);
      return;
    }

    const provider = providerType || "primary_care";
    const network = networkStatus || "in_network";

    const payload = {
      icd_codes: icdCodes.split(",").map((c) => c.trim()).filter(Boolean),
      cpt_codes: cptCodes.split(",").map((c) => c.trim()).filter(Boolean),
      billed_amount: amount,
      provider_type: provider,
      network_status: network,
      patient_question: patientQuestion || null,
    };

    try {
      const predRes = await fetch("http://localhost:8000/predict_claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!predRes.ok) throw new Error(`Backend error: ${predRes.status}`);
      const predData = (await predRes.json()) as PredictionResult;
      setPrediction(predData);

      const explRes = await fetch("http://localhost:8000/explain_claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!explRes.ok) throw new Error(`Backend error: ${explRes.status}`);
      const explData = (await explRes.json()) as ExplanationResult;
      setExplanationResult(explData);
      
      setRecentClaims((prev) => {
        const newClaim: RecentClaim = {
          id: `${Date.now()}`,
          icdCodes,
          cptCodes,
          billedAmount,
          providerType: provider || "primary_care",
          networkStatus: network,
          patientQuestion,
          createdAt: new Date().toISOString(),
        };
        return [newClaim, ...prev].slice(0, 5);
      });
    } catch (err) {
      console.error("Pipeline execution failure:", err); // <-- Using the 'err' variable here fixes the error
      setError("Could not reach the claims copilot service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 font-sans">
      
      {/* Header Segment */}
      <div>
        <div className="flex items-center gap-1.5 text-[#9ca3af] text-[11px] mb-1.5">
          <Activity className="w-3 h-3" />
          <span>&gt;</span>
          <span>Triage Workspace</span>
        </div>
        <h1 className="text-2xl font-medium text-[#111827] mb-0.5">Claim Triage Pipeline</h1>
        <p className="text-xs text-[#6b7280]">Evaluate dynamic claims variables against core models to parse systemic approval liabilities.</p>
      </div>

      {/* Main Grid Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        
        {/* Form Container */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-white border-slate-200 shadow-sm rounded-xl p-5">
            <div className="text-[10px] font-medium text-[#9ca3af] tracking-wider uppercase mb-4">Claim Ingestion Variables</div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">ICD Codes (comma-separated)</label>
                  <Input
                    placeholder="e.g. E11.9, I10"
                    value={icdCodes}
                    onChange={(e) => setIcdCodes(e.target.value)}
                    className="h-9 text-xs border-slate-200 focus-visible:ring-[#34d399]/20 focus-visible:border-[#6ee7b7]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">CPT Codes (comma-separated)</label>
                  <Input
                    placeholder="e.g. 99213, 71020"
                    value={cptCodes}
                    onChange={(e) => setCptCodes(e.target.value)}
                    className="h-9 text-xs border-slate-200 focus-visible:ring-[#34d399]/20 focus-visible:border-[#6ee7b7]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">Billed Amount (₹)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 4500"
                    value={billedAmount}
                    onChange={(e) => setBilledAmount(e.target.value)}
                    className="h-9 text-xs border-slate-200 focus-visible:ring-[#34d399]/20 focus-visible:border-[#6ee7b7]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">Provider Type</label>
                  <Input
                    placeholder="e.g. primary_care, specialist"
                    value={providerType}
                    onChange={(e) => setProviderType(e.target.value)}
                    className="h-9 text-xs border-slate-200 focus-visible:ring-[#34d399]/20 focus-visible:border-[#6ee7b7]"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-medium text-slate-500">Network Status</label>
                  <Input
                    placeholder="in_network / out_of_network"
                    value={networkStatus}
                    onChange={(e) => setNetworkStatus(e.target.value)}
                    className="h-9 text-xs border-slate-200 focus-visible:ring-[#34d399]/20 focus-visible:border-[#6ee7b7]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Patient Direct Context (optional)</label>
                <Textarea
                  placeholder="e.g. Why was my MRI claim denied?"
                  value={patientQuestion}
                  onChange={(e) => setPatientQuestion(e.target.value)}
                  rows={3}
                  className="text-xs border-slate-200 focus-visible:ring-[#34d399]/20 focus-visible:border-[#6ee7b7]"
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-[11px] p-2.5 rounded-md border border-red-100 font-medium">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !billedAmount}
                size="sm"
                className="bg-[#34d399] hover:bg-[#059669] text-[#064e3b] font-medium px-4 h-9 gap-2 transition-all"
              >
                {loading ? "Analyzing engine data..." : "Analyze claim package"}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </form>
          </Card>

          {/* Model Inference Results Blocks */}
          <div className="grid gap-4 md:grid-cols-2">
            
            {/* Predictions Card */}
            <Card className="bg-white border-slate-200 shadow-sm rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[#111827] font-medium text-xs">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                <span>Risk & Predictive Bounds</span>
              </div>
              
              {!prediction ? (
                <p className="text-[11px] text-[#6b7280] my-auto py-4">
                  Awaiting ingestion engine parameters to map system denial weights.
                </p>
              ) : (
                <div className="space-y-3.5 text-xs text-[#111827]">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-lg p-2.5">
                      <div className="text-[10px] text-[#059669] font-medium uppercase tracking-wider">Approval Base</div>
                      <div className="text-lg font-semibold text-[#059669] mt-0.5">
                        {(prediction.approval_probability * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-lg p-2.5">
                      <div className="text-[10px] text-[#c2410c] font-medium uppercase tracking-wider">Denial Hazard</div>
                      <div className="text-lg font-semibold text-[#c2410c] mt-0.5">
                        {(prediction.denial_probability * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[11px] font-medium text-[#9ca3af] mb-2 uppercase tracking-wide">Primary Structural Traps:</p>
                    <ul className="space-y-1.5">
                      {prediction.top_denial_reasons.map((r) => (
                        <li key={r.reason} className="flex items-center justify-between text-[11px] bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-md">
                          <span className="capitalize text-slate-700 font-medium">{r.reason.replace(/_/g, " ")}</span>
                          <span className="font-semibold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                            {(r.probability * 100).toFixed(1)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </Card>

            {/* Explanation Card */}
            <Card className="bg-white border-slate-200 shadow-sm rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[#111827] font-medium text-xs">
                <Sparkles className="w-4 h-4 text-[#34d399]" />
                <span>Policy-Aware Synthesis</span>
              </div>
              
              {loading && !explanationResult ? (
                <div className="my-auto py-4 space-y-2 text-center">
                  <div className="w-5 h-5 border-2 border-[#34d399] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-[11px] text-[#6b7280]">Parsing grounding matrices and compiling natural execution summaries...</p>
                </div>
              ) : !explanationResult ? (
                <p className="text-[11px] text-[#6b7280] my-auto py-4">
                  Run standard ingestion vectors to assemble contextual evaluation text.
                </p>
              ) : (
                <div className="rounded-lg border border-slate-100 bg-[#f8fafc] p-3 flex-1 overflow-auto max-h-[190px]">
                  <p className="whitespace-pre-line text-[11px] text-[#334155] leading-relaxed">
                    {explanationResult.explanation}
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Sidebar Space for Recent Claims */}
        <div className="space-y-4">
          <Card className="bg-[#111827] text-white border-transparent rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-1">
              <History className="w-4 h-4 text-[#34d399]" />
              Pipeline Registry
            </div>
            <p className="text-[11px] text-[#6b7280] mb-3">Quickly roll back historical parameters onto current execution blocks.</p>
            
            {recentClaims.length === 0 ? (
              <div className="text-[11px] text-slate-500 py-6 text-center border border-dashed border-slate-800 rounded-lg">
                No telemetry recorded in current thread.
              </div>
            ) : (
              <ul className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {recentClaims.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setIcdCodes(c.icdCodes);
                        setCptCodes(c.cptCodes);
                        setBilledAmount(c.billedAmount);
                        setProviderType(c.providerType);
                        setNetworkStatus(c.networkStatus);
                        setPatientQuestion(c.patientQuestion);
                      }}
                      className="w-full text-left rounded-lg border border-white/5 bg-white/[0.03] p-2.5 text-[11px] transition-all hover:bg-white/[0.07] block group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-slate-200 group-hover:text-[#34d399] transition-colors truncate">
                          {c.icdCodes || "ICD Missing"} · {c.cptCodes || "CPT Missing"}
                        </span>
                        <span className="text-[10px] bg-white/10 text-slate-300 px-1.5 py-0.5 rounded font-mono shrink-0">
                          ₹{c.billedAmount}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 capitalize">
                        {c.providerType.replace(/_/g, " ")} · {c.networkStatus.replace(/_/g, " ")}
                      </div>
                      {c.patientQuestion && (
                        <div className="mt-1.5 line-clamp-1 text-[10px] italic text-slate-400 border-l border-slate-700 pl-1.5">
                          “{c.patientQuestion}”
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}