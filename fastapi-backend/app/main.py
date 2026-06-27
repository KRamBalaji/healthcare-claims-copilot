# backend/app/main.py
import os
import joblib
import pandas as pd
import asyncio
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager

from .rag import ClaimForRAG, PredictionForRAG, generate_explanation_from_policies

# --- Thread Pool & Memory State Configuration ---
# Isolate high-compute Scikit-Learn predictions away from your async event loop
cpu_pool = ThreadPoolExecutor(max_workers=4)
models_registry = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Production Lifespan: Pre-loads model matrices securely from disk into system RAM 
    exactly once on server boot, completely removing initialization lag from requests.
    """
    print("Initializing Lifespan: Pre-loading predictive artifacts into memory...")
    try:
        MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
        approval_model_path = os.path.abspath(os.path.join(MODELS_DIR, "approval_model.joblib"))
        denial_model_path = os.path.abspath(os.path.join(MODELS_DIR, "denial_reasons_model.joblib"))
        
        print(f"Loading artifact tables from:\n -> {approval_model_path}\n -> {denial_model_path}")
        
        models_registry["approval"] = joblib.load(approval_model_path)
        models_registry["denial"] = joblib.load(denial_model_path)
        print("✓ All machine learning inference models loaded successfully into active cache.")
    except Exception as e:
        print(f"❌ Error during model caching: {e}")
        # In a real pipeline, you could choose to raise the exception to stop server boot
        models_registry["approval"] = None
        models_registry["denial"] = None
        
    yield
    print("Clearing application memory state...")
    models_registry.clear()
    cpu_pool.shutdown()

# Initialize FastAPI with the managed lifecycle bounds
app = FastAPI(
    title="Healthcare Claims Triage & Explanation Copilot API",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Setup relaxed origins for seamless local developer integration
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Structures ---
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


# --- Feature Mapping Transformers (Synchronous Math Helpers) ---
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

def claim_to_feature_row_for_approval(claim: ClaimInput, feature_cols: List[str]) -> pd.DataFrame:
    row = base_feature_row(claim)
    df = pd.DataFrame([row])
    return df[feature_cols]

def claim_to_feature_row_for_denial(claim: ClaimInput, feature_cols: List[str]) -> pd.DataFrame:
    row = base_feature_row(claim)
    df = pd.DataFrame([row])
    return df[feature_cols]


# --- Thread-Isolated Inference Workers ---
def sync_calculate_inference(claim: ClaimInput) -> PredictionResponse:
    """
    Executes heavy mathematical dataframe manipulation and probability generation.
    Runs inside the ThreadPool executor to avoid freezing the FastAPI event loop.
    """
    approval_artifact = models_registry.get("approval")
    denial_artifact = models_registry.get("denial")
    
    if not approval_artifact or not denial_artifact:
        raise RuntimeError("Predictive model components are missing or uninitialized.")
        
    approval_pipeline = approval_artifact["pipeline"]
    approval_features = approval_artifact["feature_cols"]

    denial_pipeline = denial_artifact["pipeline"]
    denial_features = denial_artifact["feature_cols"]
    denial_labels = denial_artifact["reason_labels"]

    # 1. Approval Model Scoring
    X_approval = claim_to_feature_row_for_approval(claim, approval_features)
    proba_approval = approval_pipeline.predict_proba(X_approval)[0]
    denial_prob = float(proba_approval[0])
    approval_prob = float(proba_approval[1])

    # 2. Denial Multi-Label Model Scoring
    X_denial = claim_to_feature_row_for_denial(claim, denial_features)
    proba_list = denial_pipeline.predict_proba(X_denial)

    reason_probs = []
    for label, arr in zip(denial_labels, proba_list):
        p = float(arr[0])
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


# --- API Routes ---
@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/predict_claim", response_model=PredictionResponse)
async def predict_claim(claim: ClaimInput):
    """
    Asynchronously passes incoming inputs to the compute-isolated executor pool
    to maintain non-blocking network operations.
    """
    loop = asyncio.get_running_loop()
    try:
        result = await loop.run_in_executor(cpu_pool, sync_calculate_inference, claim)
        return result
    except RuntimeError as ex:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(ex))

@app.post("/explain_claim", response_model=ExplanationResponse)
async def explain_claim(claim: ClaimInput):
    """
    Asynchronous Pipeline Optimization: Offloads the statistical inference 
    calculation while making clean non-blocking structural passes down to your RAG service.
    """
    loop = asyncio.get_running_loop()
    try:
        # Step 1: Offload prediction calculus to thread pool
        prediction = await loop.run_in_executor(cpu_pool, sync_calculate_inference, claim)
        
        # Step 2: Assemble payload representations for policy retrieval
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

        # Step 3: Check if generator function is asynchronous or blocking
        if asyncio.iscoroutinefunction(generate_explanation_from_policies):
            explanation_text = await generate_explanation_from_policies(
                claim=claim_rag, prediction=prediction_rag
            )
        else:
            # If standard sync function, pass it to the background thread pool
            explanation_text = await loop.run_in_executor(
                cpu_pool, generate_explanation_from_policies, claim_rag, prediction_rag
            )

        return ExplanationResponse(
            explanation=explanation_text,
            approval_probability=prediction.approval_probability,
            denial_probability=prediction.denial_probability,
            top_denial_reasons=prediction.top_denial_reasons,
        )
    except RuntimeError as ex:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(ex))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline evaluation failure: {str(e)}"
        )