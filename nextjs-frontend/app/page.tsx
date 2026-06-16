// app/page.tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setPrediction(null);
    setExplanationResult(null);

    // 1) Validate required fields
    const amount = parseFloat(billedAmount);

    if (!billedAmount || Number.isNaN(amount) || amount <= 0) {
      setError("Please enter a valid billed amount.");
      setLoading(false);
      return;
    }

    // you can also enforce some defaults:
    const provider = providerType || "primary_care";
    const network = networkStatus || "in_network";

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
      provider_type: provider,
      network_status: network,
      patient_question: patientQuestion || null,
    };

    try {
      console.log("payload to /predict_claim", payload);

      // 2) Predict
      const predRes = await fetch("http://localhost:8000/predict_claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!predRes.ok) {
        const body = await predRes.text();
        console.error("predict_claim error body:", body);
        throw new Error(`Backend error in /predict_claim: ${predRes.status}`);
      }

      const predData = (await predRes.json()) as PredictionResult;
      setPrediction(predData);

      // 3) Explain
      const explRes = await fetch("http://localhost:8000/explain_claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!explRes.ok) {
        const body = await explRes.text();
        console.error("explain_claim error body:", body);
        throw new Error(`Backend error in /explain_claim: ${explRes.status}`);
      }

      const explData = (await explRes.json()) as ExplanationResult;
      setExplanationResult(explData);
    } catch (err) {
      console.error(err);
      setError("Could not reach the claims copilot service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Claim Triage</h2>
      <p className="text-sm text-muted-foreground">
        Enter claim details and a patient question to predict denials and get explanations.
      </p>

      <Tabs defaultValue="triage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="triage">Triage</TabsTrigger>
          <TabsTrigger value="explanation">Explanation</TabsTrigger>
        </TabsList>

        <TabsContent value="triage" className="space-y-4">
          <Card className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    ICD Codes (comma-separated)
                  </label>
                  <Input
                    placeholder="e.g. E11.9, I10"
                    value={icdCodes}
                    onChange={(e) => setIcdCodes(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    CPT Codes (comma-separated)
                  </label>
                  <Input
                    placeholder="e.g. 99213, 71020"
                    value={cptCodes}
                    onChange={(e) => setCptCodes(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Billed Amount (₹)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 4500"
                    value={billedAmount}
                    onChange={(e) => setBilledAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Provider Type
                  </label>
                  <Input
                    placeholder="e.g. primary_care, specialist"
                    value={providerType}
                    onChange={(e) => setProviderType(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Network Status
                  </label>
                  <Input
                    placeholder="in_network / out_of_network"
                    value={networkStatus}
                    onChange={(e) => setNetworkStatus(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Patient Question (optional)
                </label>
                <Textarea
                  placeholder="e.g. Why was my MRI claim denied?"
                  value={patientQuestion}
                  onChange={(e) => setPatientQuestion(e.target.value)}
                  rows={3}
                />
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <Button
                type="submit"
                disabled={
                  loading ||
                  !billedAmount // require at least amount
                }
              >
                {loading ? "Analyzing claim..." : "Analyze claim"}
              </Button>
            </form>
          </Card>

          <Card className="p-4 space-y-2">
            <h3 className="text-sm font-medium">Prediction</h3>
            {!prediction ? (
              <p className="text-xs text-muted-foreground">
                Submit a claim to see predicted approval/denial and reasons.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                <p>
                  Approval probability:{" "}
                  <span className="font-medium">
                    {(prediction.approval_probability * 100).toFixed(1)}%
                  </span>
                </p>
                <p>
                  Denial probability:{" "}
                  <span className="font-medium">
                    {(prediction.denial_probability * 100).toFixed(1)}%
                  </span>
                </p>
                <div className="space-y-1">
                  <p className="font-medium text-xs text-muted-foreground">
                    Likely denial reasons:
                  </p>
                  <ul className="list-disc list-inside text-xs">
                    {prediction.top_denial_reasons.map((r) => (
                      <li key={r.reason}>
                        {r.reason} — {(r.probability * 100).toFixed(1)}%
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="explanation">
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-2">Explanation</h3>
            {!explanationResult ? (
              <p className="text-xs text-muted-foreground">
                After analyzing a claim, a natural-language explanation will appear here.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="whitespace-pre-line">
                  {explanationResult.explanation}
                </p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
