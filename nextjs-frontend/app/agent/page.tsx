// app/agent/page.tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-slate-50">
            Agent View
          </h2>
          <p className="text-xs text-slate-400">
            Quickly assess denial risk, reasons, and next actions for a single claim.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Claim ID (optional)"
            value={claimId}
            onChange={(e) => setClaimId(e.target.value)}
            className="h-8 w-32 text-xs"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr,1.6fr]">
        {/* Left: Claim summary + inputs */}
        <Card className="border-slate-800 bg-slate-950/70 p-4 space-y-3">
          <p className="text-xs font-medium text-slate-200">Claim details</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">
                ICD Codes
              </label>
              <Input
                value={icdCodes}
                onChange={(e) => setIcdCodes(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">
                CPT Codes
              </label>
              <Input
                value={cptCodes}
                onChange={(e) => setCptCodes(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">
                Billed Amount (₹)
              </label>
              <Input
                type="number"
                value={billedAmount}
                onChange={(e) => setBilledAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">
                Provider Type
              </label>
              <Input
                value={providerType}
                onChange={(e) => setProviderType(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">
                Network Status
              </label>
              <Input
                value={networkStatus}
                onChange={(e) => setNetworkStatus(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">
              Agent notes / patient complaint (optional)
            </label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Member states MRI was ordered by in-network provider, wants to know why denied."
              className="text-xs"
            />
          </div>

          {error && (
            <p className="text-[11px] text-red-400">{error}</p>
          )}

          <Button
            size="sm"
            onClick={handleReview}
            disabled={loading}
            className="mt-1"
          >
            {loading ? "Reviewing claim..." : "Review claim"}
          </Button>
        </Card>

        {/* Right: Risk, reasons, explanation */}
        <div className="space-y-3">
          <Card className="border-slate-800 bg-slate-950/70 p-4 space-y-2">
            <p className="text-xs font-medium text-slate-200">
              Risk assessment
            </p>
            {!prediction ? (
              <p className="text-[11px] text-slate-400">
                Run a review to see approval vs denial probability and likely reasons.
              </p>
            ) : (
              <div className="space-y-1 text-xs text-slate-300">
                <p>
                  Approval probability:{" "}
                  <span className="font-semibold text-emerald-300">
                    {(prediction.approval_probability * 100).toFixed(1)}%
                  </span>
                </p>
                <p>
                  Denial probability:{" "}
                  <span className="font-semibold text-amber-300">
                    {(prediction.denial_probability * 100).toFixed(1)}%
                  </span>
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] font-medium text-slate-400">
                    Likely denial reasons:
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-slate-300">
                    {prediction.top_denial_reasons.map((r) => (
                      <li key={r.reason}>
                        {r.reason.replace(/_/g, " ")} —{" "}
                        {(r.probability * 100).toFixed(1)}%
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </Card>

          <Card className="border-slate-800 bg-slate-950/70 p-4 space-y-2">
            <p className="text-xs font-medium text-slate-200">
              Explanation & next steps
            </p>
            {!explanation ? (
              <p className="text-[11px] text-slate-400">
                After reviewing a claim, a natural-language explanation and guidance will appear here.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="whitespace-pre-line text-xs text-slate-200">
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