# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional

import os
import joblib
import pandas as pd
from .rag import ClaimForRAG, PredictionForRAG, init_policy_retriever, generate_explanation_from_policies

# After app is created:
init_policy_retriever()

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

# ---------- Load trained models ----------

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
approval_model_path = os.path.abspath(os.path.join(MODELS_DIR, "approval_model.joblib"))
denial_model_path = os.path.abspath(os.path.join(MODELS_DIR, "denial_reasons_model.joblib"))

print("Loading models from:", approval_model_path, denial_model_path)

approval_artifact = joblib.load(approval_model_path)
denial_artifact = joblib.load(denial_model_path)

approval_pipeline = approval_artifact["pipeline"]
approval_features = approval_artifact["feature_cols"]

denial_pipeline = denial_artifact["pipeline"]
denial_features = denial_artifact["feature_cols"]
denial_labels = denial_artifact["reason_labels"]

def base_feature_row(claim: ClaimInput) -> dict:
    return {
        "service_type": "consultation",
        "provider_type": claim.provider_type,
        "network_status": claim.network_status,
        "has_referral": 1,
        "has_prior_auth": 1,
        "documentation_level": "medium",
        "billed_amount": claim.billed_amount,
        "previous_claims_count": 0,
        "previous_denials_count": 0,
    }


def claim_to_feature_row_for_approval(claim: ClaimInput) -> pd.DataFrame:
    row = base_feature_row(claim)
    df = pd.DataFrame([row])
    return df[approval_features]


def claim_to_feature_row_for_denial(claim: ClaimInput) -> pd.DataFrame:
    row = base_feature_row(claim)
    df = pd.DataFrame([row])
    return df[denial_features]

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/predict_claim", response_model=PredictionResponse)
def predict_claim(claim: ClaimInput) -> PredictionResponse:
    # 1) Approval model
    X_approval = claim_to_feature_row_for_approval(claim)
    proba_approval = approval_pipeline.predict_proba(X_approval)[0]
    # Assuming classes [0,1] = [denied, approved]
    denial_prob = float(proba_approval[0])
    approval_prob = float(proba_approval[1])

    # 2) Denial reasons multi-label model
    X_denial = claim_to_feature_row_for_denial(claim)
    # OneVsRestClassifier.predict_proba returns list of arrays, one per label
    proba_list = denial_pipeline.predict_proba(X_denial)

    reason_probs = []
    for label, arr in zip(denial_labels, proba_list):
        p = float(arr[0])  # probability that this label is 1 for our single row
        reason_probs.append((label, p))

    reason_probs.sort(key=lambda x: x[1], reverse=True)
    top_reasons = [
        DenialReason(reason=name, probability=prob)
        for name, prob in reason_probs[:3]
    ]

    return PredictionResponse(
        approval_probability=approval_prob,
        denial_probability=denial_prob,
        top_denial_reasons=top_reasons,
    )


@app.post("/explain_claim", response_model=ExplanationResponse)
def explain_claim(claim: ClaimInput) -> ExplanationResponse:
    prediction = predict_claim(claim)

    claim_rag = ClaimForRAG(
        icd_codes=claim.icd_codes,
        cpt_codes=claim.cpt_codes,
        billed_amount=claim.billed_amount,
        provider_type=claim.provider_type,
        network_status=claim.network_status,
        patient_question=claim.patient_question,
    )

    prediction_rag = PredictionForRAG(
        approval_probability=prediction.approval_probability,
        denial_probability=prediction.denial_probability,
        top_denial_reasons=[r.reason for r in prediction.top_denial_reasons],
    )

    explanation_text = generate_explanation_from_policies(
        claim=claim_rag,
        prediction=prediction_rag,
    )

    return ExplanationResponse(
        explanation=explanation_text,
        approval_probability=prediction.approval_probability,
        denial_probability=prediction.denial_probability,
        top_denial_reasons=prediction.top_denial_reasons,
    )