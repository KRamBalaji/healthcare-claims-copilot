# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional

app = FastAPI(title="Healthcare Claims Triage & Explanation Copilot API")

# Allow frontend to talk to backend during dev
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # or ["*"] for dev, if you prefer
    allow_credentials=True,
    allow_methods=["*"],            # important: allow OPTIONS, POST, etc.
    allow_headers=["*"],
)

class ClaimInput(BaseModel):
    icd_codes: List[str] = Field(default_factory=list)
    cpt_codes: List[str] = Field(default_factory=list)
    billed_amount: float
    provider_type: str
    network_status: str
    patient_question: Optional[str] = None


class DenialReason(BaseModel):
    reason: str
    probability: float


class PredictionResponse(BaseModel):
    approval_probability: float
    denial_probability: float
    top_denial_reasons: List[DenialReason]

class ExplanationResponse(BaseModel):
    explanation: str
    approval_probability: float
    denial_probability: float
    top_denial_reasons: List[DenialReason]

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/predict_claim", response_model=PredictionResponse)
def predict_claim(claim: ClaimInput):
    denial_score = 0.5

    if claim.network_status.lower() == "out_of_network":
        denial_score += 0.25
    if claim.billed_amount > 10000:
        denial_score += 0.2
    if not claim.cpt_codes:
        denial_score += 0.1

    denial_score = min(max(denial_score, 0.0), 0.99)
    approval_score = 1.0 - denial_score

    reasons: List[DenialReason] = []

    if claim.network_status.lower() == "out_of_network":
        reasons.append(DenialReason(reason="out_of_network", probability=0.6))

    if claim.billed_amount > 10000:
        reasons.append(DenialReason(reason="high_cost_requires_pre_auth", probability=0.5))

    if not claim.cpt_codes:
        reasons.append(DenialReason(reason="missing_procedure_code", probability=0.4))

    if not reasons:
        reasons.append(DenialReason(reason="insufficient_documentation", probability=0.35))

    return PredictionResponse(
        approval_probability=approval_score,
        denial_probability=denial_score,
        top_denial_reasons=reasons,
    )


@app.post("/explain_claim", response_model=ExplanationResponse)
def explain_claim(claim: ClaimInput) -> ExplanationResponse:
    """
    For now: call our prediction logic and generate a structured,
    human-readable explanation from those results.
    Later: plug in RAG + LLM here.
    """
    prediction = predict_claim(claim)

    denial_pct = round(prediction.denial_probability * 100, 1)
    approval_pct = round(prediction.approval_probability * 100, 1)

    reasons_str = ", ".join(
        f"{r.reason.replace('_', ' ')} ({round(r.probability * 100, 1)}%)"
        for r in prediction.top_denial_reasons
    )

    base_explanation = (
        f"This claim has an estimated {denial_pct}% chance of being denied and a "
        f"{approval_pct}% chance of being approved, based on similar past cases.\n\n"
        f"The most likely denial reasons are: {reasons_str}."
    )

    if claim.patient_question:
        explanation = (
            f"You asked: \"{claim.patient_question.strip()}\"\n\n"
            f"{base_explanation}\n\n"
            "To reduce the risk of denial, you may need to provide additional clinical "
            "documentation, confirm whether the provider is in network, and ensure that "
            "any required prior authorization or referral is on file."
        )
    else:
        explanation = (
            f"{base_explanation}\n\n"
            "To reduce the risk of denial, the reviewing agent should check for required "
            "prior authorizations, referrals, and adequate clinical documentation for the "
            "requested procedures."
        )

    return ExplanationResponse(
        explanation=explanation,
        approval_probability=prediction.approval_probability,
        denial_probability=prediction.denial_probability,
        top_denial_reasons=prediction.top_denial_reasons,
    )