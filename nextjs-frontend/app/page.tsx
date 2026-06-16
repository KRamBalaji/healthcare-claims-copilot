// app/page.tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type PredictionResult = {
  approval_probability: number;
  denial_probability: number;
  top_denial_reasons: { reason: string; probability: number }[];
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
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setPrediction(null);
    setExplanation(null);

    try {
      const payload = {
        icd_codes: icdCodes.split(",").map((c) => c.trim()).filter(Boolean),
        cpt_codes: cptCodes.split(",").map((c) => c.trim()).filter(Boolean),
        billed_amount: parseFloat(billedAmount),
        provider_type: providerType || "primary_care",
        network_status: networkStatus || "in_network",
        patient_question: patientQuestion || null,
      };

      // Temporary: just log payload. We will wire this to FastAPI soon.
      console.log("Submitting claim payload", payload);

      // Fake result for now
      const fakeResult: PredictionResult = {
        approval_probability: 0.35,
        denial_probability: 0.65,
        top_denial_reasons: [
          { reason: "insufficient_documentation", probability: 0.5 },
          { reason: "no_prior_authorization", probability: 0.3 },
        ],
      };

      setPrediction(fakeResult);
      setExplanation(
        "Based on the provided codes and billed amount, this claim has a higher chance of denial due to missing prior authorization and potentially insufficient documentation for the requested service."
      );
    } catch (err) {
      console.error(err);
      setError("Something went wrong processing the claim.");
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

              <Button type="submit" disabled={loading}>
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
            {!explanation ? (
              <p className="text-xs text-muted-foreground">
                After analyzing a claim, a natural-language explanation will appear here.
              </p>
            ) : (
              <p className="text-sm">{explanation}</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
