// app/page.tsx
"use client";

import React, { useState, useEffect } from "react";
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
  RotateCcw
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

type FormState = {
  icdCodes: string;
  cptCodes: string;
  billedAmount: string;
  providerType: string;
  networkStatus: string;
  patientQuestion: string;
  prediction: PredictionResult | null;
  explanationResult: ExplanationResult | null;
};

const defaultFormState: FormState = {
  icdCodes: "",
  cptCodes: "",
  billedAmount: "",
  providerType: "",
  networkStatus: "",
  patientQuestion: "",
  prediction: null,
  explanationResult: null,
};

export default function TriagePage() {
  // 1. Lazy initialization: reads localStorage once before first render — no effect needed
  const [formState, setFormState] = useState<FormState>(() => {
    if (typeof window === "undefined") return defaultFormState;
    try {
      const cached = localStorage.getItem("copilot_triage_form");
      if (cached) return { ...defaultFormState, ...JSON.parse(cached) };
    } catch (e) {
      console.error("Failed to rehydrate triage input state maps", e);
    }
    return defaultFormState;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recentClaims, setRecentClaims] = useState<RecentClaim[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const cached = localStorage.getItem("copilot_pipeline_registry");
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      console.error("Failed to load global workspace logs", e);
      return [];
    }
  });

  // 2. Persistent State Sync Effect: write to localStorage whenever formState changes
  useEffect(() => {
    localStorage.setItem("copilot_triage_form", JSON.stringify(formState));
  }, [formState]);

  // Helper to update a single field without boilerplate at every call site
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  // Clears out the current workflow form safely
  const resetTriageWorkspace = () => {
    localStorage.removeItem("copilot_triage_form");
    setFormState(defaultFormState);
    setError(null);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setFormState((prev) => ({ ...prev, prediction: null, explanationResult: null }));

    const amount = parseFloat(formState.billedAmount);
    if (!formState.billedAmount || Number.isNaN(amount) || amount <= 0) {
      setError("Please enter a valid billed amount.");
      setLoading(false);
      return;
    }

    const provider = formState.providerType || "primary_care";
    const network = formState.networkStatus || "in_network";

    const payload = {
      icd_codes: formState.icdCodes.split(",").map((c) => c.trim()).filter(Boolean),
      cpt_codes: formState.cptCodes.split(",").map((c) => c.trim()).filter(Boolean),
      billed_amount: amount,
      provider_type: provider,
      network_status: network,
      patient_question: formState.patientQuestion || null,
    };

    try {
      const predRes = await fetch("http://localhost:8000/predict_claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!predRes.ok) throw new Error(`Backend error: ${predRes.status}`);
      const predData = (await predRes.json()) as PredictionResult;
      setField("prediction", predData);

      const explRes = await fetch("http://localhost:8000/explain_claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!explRes.ok) throw new Error(`Backend error: ${explRes.status}`);
      const explData = (await explRes.json()) as ExplanationResult;
      setField("explanationResult", explData);

      // Update pipeline registry with immutable state storage operations
      const newClaim: RecentClaim = {
        id: `${Date.now()}`,
        icdCodes: formState.icdCodes,
        cptCodes: formState.cptCodes,
        billedAmount: formState.billedAmount,
        providerType: provider,
        networkStatus: network,
        patientQuestion: formState.patientQuestion,
        createdAt: new Date().toISOString(),
      };

      const updatedClaims = [newClaim, ...recentClaims].slice(0, 5);
      setRecentClaims(updatedClaims);
      localStorage.setItem("copilot_pipeline_registry", JSON.stringify(updatedClaims));
    } catch (err) {
      console.error("Pipeline execution failure:", err);
      setError("Could not reach the claims copilot service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 font-sans">

      {/* Header Segment */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[#9ca3af] text-[11px] mb-1.5">
            <Activity className="w-3 h-3" />
            <span>&gt;</span>
            <span>Triage Workspace</span>
          </div>
          <h1 className="text-2xl font-medium text-[#111827] mb-0.5">Claim Triage Pipeline</h1>
          <p className="text-xs text-[#6b7280]">Evaluate dynamic claims variables against core models to parse systemic approval liabilities.</p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetTriageWorkspace}
          className="h-9 border-slate-200 text-slate-500 hover:text-slate-700 text-xs gap-1.5 self-start sm:self-auto bg-white"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Form
        </Button>
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
                    value={formState.icdCodes}
                    onChange={(e) => setField("icdCodes", e.target.value)}
                    className="h-9 text-xs border-slate-200 focus-visible:ring-[#34d399]/20 focus-visible:border-[#6ee7b7]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">CPT Codes (comma-separated)</label>
                  <Input
                    placeholder="e.g. 99213, 71020"
                    value={formState.cptCodes}
                    onChange={(e) => setField("cptCodes", e.target.value)}
                    className="h-9 text-xs border-slate-200 focus-visible:ring-[#34d399]/20 focus-visible:border-[#6ee7b7]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">Billed Amount (₹)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 4500"
                    value={formState.billedAmount}
                    onChange={(e) => setField("billedAmount", e.target.value)}
                    className="h-9 text-xs border-slate-200 focus-visible:ring-[#34d399]/20 focus-visible:border-[#6ee7b7]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">Provider Type</label>
                  <Input
                    placeholder="e.g. primary_care, specialist"
                    value={formState.providerType}
                    onChange={(e) => setField("providerType", e.target.value)}
                    className="h-9 text-xs border-slate-200 focus-visible:ring-[#34d399]/20 focus-visible:border-[#6ee7b7]"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-medium text-slate-500">Network Status</label>
                  <Input
                    placeholder="in_network / out_of_network"
                    value={formState.networkStatus}
                    onChange={(e) => setField("networkStatus", e.target.value)}
                    className="h-9 text-xs border-slate-200 focus-visible:ring-[#34d399]/20 focus-visible:border-[#6ee7b7]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Patient Direct Context (optional)</label>
                <Textarea
                  placeholder="e.g. Why was my MRI claim denied?"
                  value={formState.patientQuestion}
                  onChange={(e) => setField("patientQuestion", e.target.value)}
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
                disabled={loading || !formState.billedAmount}
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

              {!formState.prediction ? (
                <p className="text-[11px] text-[#6b7280] my-auto py-4">
                  Awaiting ingestion engine parameters to map system denial weights.
                </p>
              ) : (
                <div className="space-y-3.5 text-xs text-[#111827]">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-lg p-2.5">
                      <div className="text-[10px] text-[#059669] font-medium uppercase tracking-wider">Approval Base</div>
                      <div className="text-lg font-semibold text-[#059669] mt-0.5">
                        {(formState.prediction.approval_probability * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-lg p-2.5">
                      <div className="text-[10px] text-[#c2410c] font-medium uppercase tracking-wider">Denial Hazard</div>
                      <div className="text-lg font-semibold text-[#c2410c] mt-0.5">
                        {(formState.prediction.denial_probability * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[11px] font-medium text-[#9ca3af] mb-2 uppercase tracking-wide">Primary Structural Traps:</p>
                    <ul className="space-y-1.5">
                      {formState.prediction.top_denial_reasons.map((r) => (
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

              {loading && !formState.explanationResult ? (
                <div className="my-auto py-4 space-y-2 text-center">
                  <div className="w-5 h-5 border-2 border-[#34d399] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-[11px] text-[#6b7280]">Parsing grounding matrices and compiling natural execution summaries...</p>
                </div>
              ) : !formState.explanationResult ? (
                <p className="text-[11px] text-[#6b7280] my-auto py-4">
                  Run standard ingestion vectors to assemble contextual evaluation text.
                </p>
              ) : (
                <div className="rounded-lg border border-slate-100 bg-[#f8fafc] p-3 flex-1 overflow-auto max-h-[190px]">
                  <p className="whitespace-pre-line text-[11px] text-[#334155] leading-relaxed">
                    {formState.explanationResult.explanation}
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
                        setFormState((prev) => ({
                          ...prev,
                          icdCodes: c.icdCodes,
                          cptCodes: c.cptCodes,
                          billedAmount: c.billedAmount,
                          providerType: c.providerType,
                          networkStatus: c.networkStatus,
                          patientQuestion: c.patientQuestion,
                        }));
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
                          {c.patientQuestion}
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