# app/rag.py

import os
from typing import List

from pydantic import BaseModel
from groq import Groq


class ClaimForRAG(BaseModel):
    icd_codes: List[str]
    cpt_codes: List[str]
    billed_amount: float
    provider_type: str
    network_status: str
    patient_question: str | None = None


class PredictionForRAG(BaseModel):
    approval_probability: float
    denial_probability: float
    top_denial_reasons: List[str]

def load_policy_snippets() -> str:
    """
    Temporarily: read all policy markdown files and concatenate them
    into a single context string. Later, replace this with real retrieval.
    """
    base_dir = os.path.dirname(os.path.dirname(__file__))  # fastapi-backend/
    policies_dir = os.path.join(base_dir, "policies")

    snippets: list[str] = []
    if not os.path.isdir(policies_dir):
        return ""

    for name in os.listdir(policies_dir):
        if not name.endswith((".md", ".txt")):
            continue
        path = os.path.join(policies_dir, name)
        try:
            with open(path, "r", encoding="utf-8") as f:
                text = f.read()
            snippets.append(f"# {name}\n{text}")
        except Exception:
            continue

    return "\n\n".join(snippets)


POLICY_CONTEXT = load_policy_snippets()

def _get_groq_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Please export it in the backend environment."
        )
    return Groq(api_key=api_key)


def generate_explanation_from_policies(
    claim: ClaimForRAG, prediction: PredictionForRAG
) -> str:
    """
    Use Groq + Llama 3.1 to generate a natural-language explanation of
    why a claim may be denied and what to do next, grounded in policy text
    and model predictions.
    """

    reasons_list = prediction.top_denial_reasons
    reasons_str = ", ".join(reasons_list) if reasons_list else "none identified"

    user_q = (
        claim.patient_question.strip()
        if claim.patient_question
        else "Explain why this claim may be denied and what is needed to get it approved."
    )

    # If policy context is empty for some reason, keep the prompt robust.
    policy_block = (
        POLICY_CONTEXT
        if POLICY_CONTEXT
        else "No explicit policy documents were loaded. Use only generic insurer best practices."
    )

    # Build a single clear prompt for the LLM.
    prompt = f"""
You are an experienced healthcare claims assistant working for a health insurer.
You explain claims decisions in simple, non-legal language and always ground
your reasoning in the policy excerpts provided.

POLICY EXCERPTS (for grounding your answer):
{policy_block}

CLAIM DETAILS:
- ICD codes: {claim.icd_codes}
- CPT codes: {claim.cpt_codes}
- Billed amount: {claim.billed_amount}
- Provider type: {claim.provider_type}
- Network status: {claim.network_status}

MODEL PREDICTION:
- Approval probability: {prediction.approval_probability:.2f}
- Denial probability: {prediction.denial_probability:.2f}
- Top denial reasons (model): {reasons_str}

USER QUESTION (if any):
"{user_q}"

YOUR TASK:
Write a concise explanation (2–4 short paragraphs, no bullet points) that:

1) Explains in plain language why this claim is at risk of denial, explicitly referencing the relevant ideas from the policy excerpts (e.g., out-of-network rules, prior authorization requirements, or documentation requirements).
2) Describes what documentation, authorizations, or actions could reduce the denial risk or support an appeal.
3) Uses a neutral, empathetic tone that a customer service agent could read directly to a patient.

Avoid legal jargon. Do not invent new policies; stay consistent with the policy excerpts above.
"""

    client = _get_groq_client()

    # Llama 3.1 70B via Groq; adjust model name if needed
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are an expert healthcare claims assistant who explains decisions clearly and empathetically.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        temperature=0.2,
        max_tokens=600,
    )


    explanation = response.choices[0].message.content.strip()
    return explanation