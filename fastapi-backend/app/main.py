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