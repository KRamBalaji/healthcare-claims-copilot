// app/agent/page.tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  LayoutDashboard, 
  ChevronRight, 
  Layers, 
  ArrowRight, 
  TrendingUp, 
  Sparkles 
} from "lucide-react";

type DenialReason = { reason: string; probability: number };

type PredictionResult = {
  approval_probability: number;
  denial_probability: number;
  top_denial_reasons: DenialReason[];
};

type ExplanationResult = {
  explanation: string;
  approval_probability: number;
  denial_probability: number;
  top_denial_reasons: DenialReason[];
};

export default function AgentPage() {
  const [claimId, setClaimId] = useState("");
  const [icdCodes, setIcdCodes] = useState("E11.9");
  const [cptCodes, setCptCodes] = useState("99213");
  const [billedAmount, setBilledAmount] = useState("4500");
  const [providerType, setProviderType] = useState("primary_care");
  const [networkStatus, setNetworkStatus] = useState("in_network");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [explanation, setExplanation] = useState<ExplanationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReview() {
    setError(null);
    setLoading(true);
    setPrediction(null);
    setExplanation(null);

    const amount = parseFloat(billedAmount);
    if (!billedAmount || Number.isNaN(amount) || amount <= 0) {
      setError("Please enter a valid billed amount.");
      setLoading(false);
      return;
    }

    const payload = {
      icd_codes: icdCodes
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      cpt_codes: cptCodes
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      billed_amount: amount,
      provider_type: providerType || "primary_care",
      network_status: networkStatus || "in_network",
      patient_question: notes || null,
    };

    try {
      // 1) Get prediction
      const predRes = await fetch("http://localhost:8000/predict_claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!predRes.ok) {
        const body = await predRes.text();
        console.error("predict_claim error:", body);
        throw new Error(`Backend error: ${predRes.status}`);
      }

      const predData = (await predRes.json()) as PredictionResult;
      setPrediction(predData);

      // 2) Get explanation
      const explRes = await fetch("http://localhost:8000/explain_claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!explRes.ok) {
        const body = await explRes.text();
        console.error("explain_claim error:", body);
        throw new Error(`Backend error: ${explRes.status}`);
      }

      const explData = (await explRes.json()) as ExplanationResult;
      setExplanation(explData);
    } catch (err) {
      console.error(err);
      setError("Could not review this claim. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 font-sans">
      
      {/* Breadcrumbs and Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[#9ca3af] text-[11px] mb-2">
            <LayoutDashboard className="w-3 h-3" />
            <ChevronRight className="w-3 h-3" />
            <span>Agent view</span>
          </div>
          <h1 className="text-2xl font-medium text-[#111827] mb-1">Agent Verification View</h1>
          <p className="text-xs text-[#6b7280]">
            Quickly assess denial risk, root reasons, and next actionable pathways for a single claim container.
          </p>
        </div>
        
        {/* Optional Identifier Ingestion */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Input
            placeholder="Claim ID (optional)"
            value={claimId}
            onChange={(e) => setClaimId(e.target.value)}
            className="w-full sm:w-36 text-xs bg-white border-slate-200 h-9 focus-visible:ring-[#34d399]/20 focus-visible:border-[#6ee7b7]"
          />
        </div>
      </div>

      {/* Main Structural Splitting Layout Grid */}
      <div className="grid gap-5 lg:grid-cols-[1.3fr,1.7fr] items-start">
        
        {/* Left Side: Parameters Form Wrapper Panel */}
        <Card className="bg-white border-slate-200 shadow-sm rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-[10px] font-medium text-[#9ca3af] tracking-wider uppercase mb-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            Claim Telemetry Parameters
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500">ICD Codes</label>
              <Input
                value={icdCodes}
                onChange={(e) => setIcdCodes(e.target.value)}
                className="h-9 border-slate-200 focus-visible:ring-[#34d399]/20 focus-visible:border-[#6ee7b7]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500">CPT Codes</label>
              <Input
                value={cptCodes}
                onChange={(e) => setCptCodes(e.target.value)}
                className="h-9 border-slate-200 focus-visible:ring-[#34d399]/20 focus-visible:border-[#6ee7b7]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500">Billed Amount (₹)</label>
              <Input
                type="number"
                value={billedAmount}
                onChange={(e) => setBilledAmount(e.target.value)}
                className="h-9 border-slate-200 focus-visible:ring-[#34d399]/20 focus-visible:border-[#6ee7b7]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-500">Provider Type</label>
              <Input
                value={providerType}
                onChange={(e) => setProviderType(e.target.value)}
                className="h-9 border-slate-200 focus-visible:ring-[#34d399]/20 focus-visible:border-[#6ee7b7]"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-medium text-slate-500">Network Status</label>
              <Input
                value={networkStatus}
                onChange={(e) => setNetworkStatus(e.target.value)}
                className="h-9 border-slate-200 focus-visible:ring-[#34d399]/20 focus-visible:border-[#6ee7b7]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500">
              Agent notes / patient complaint (optional)
            </label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Member states MRI was ordered by in-network provider, wants to know why denied."
              className="text-xs border-slate-200 focus-visible:ring-[#34d399]/20 focus-visible:border-[#6ee7b7]"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-[11px] p-2.5 rounded-md border border-red-100 font-medium">
              {error}
            </div>
          )}

          <Button
            size="sm"
            onClick={handleReview}
            disabled={loading}
            className="bg-[#34d399] hover:bg-[#059669] text-[#064e3b] font-medium px-4 h-9 gap-2 transition-all w-full sm:w-auto"
          >
            {loading ? "Evaluating bounds..." : "Review claim"}
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Card>

        {/* Right Side: Risk Assessment Weights & Summaries */}
        <div className="space-y-4">
          
          {/* Card: Risk Assessment Numbers */}
          <Card className="bg-white border-slate-200 shadow-sm rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[#111827] font-medium text-xs">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <span>Risk & Predictive Bounds</span>
            </div>
            
            {!prediction ? (
              <p className="text-[11px] text-[#6b7280] my-auto py-4">
                Run a live evaluation pipeline step to parse out metric variance layers.
              </p>
            ) : (
              <div className="space-y-3.5 text-xs text-[#111827]">
                <div className="grid grid-cols-2 gap-2.5">
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

          {/* Card: Generated Explanations */}
          <Card className="bg-white border-slate-200 shadow-sm rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[#111827] font-medium text-xs">
              <Sparkles className="w-4 h-4 text-[#34d399]" />
              <span>Policy-Aware Synthesis &amp; Next Steps</span>
            </div>
            
            {loading && !explanation ? (
              <div className="my-auto py-6 space-y-2 text-center">
                <div className="w-5 h-5 border-2 border-[#34d399] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-[11px] text-[#6b7280]">Parsing grounding matrices and compiling natural text parameters...</p>
              </div>
            ) : !explanation ? (
              <p className="text-[11px] text-[#6b7280] my-auto py-4">
                After executing an audit review, a complete natural-language guidance report will compile here.
              </p>
            ) : (
              <div className="rounded-lg border border-slate-100 bg-[#f8fafc] p-3 flex-1 overflow-auto max-h-[220px]">
                <p className="whitespace-pre-line text-[11px] text-[#334155] leading-relaxed">
                  {explanation.explanation}
                </p>
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}