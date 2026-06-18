# app/rag.py

import os
from typing import List

from pydantic import BaseModel

# If you use LangChain:
# from langchain_community.document_loaders import DirectoryLoader
# from langchain_text_splitters import RecursiveCharacterTextSplitter
# from langchain_community.vectorstores import FAISS
# from langchain.embeddings import <YourEmbeddingClass>
# from langchain.llms import <YourLLMClass>


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


# global retriever / vector store
_policy_retriever = None


def init_policy_retriever():
    global _policy_retriever

    policies_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "policies")

    # Pseudocode with LangChain-style APIs
    # loader = DirectoryLoader(policies_dir, glob="*.md", show_progress=True)
    # docs = loader.load()
    # splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=200)
    # splits = splitter.split_documents(docs)
    #
    # embeddings = <YourEmbeddingClass>(...)
    # vectorstore = FAISS.from_documents(splits, embeddings)
    # _policy_retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

    # For now, you can leave this as a stub or simple string search.
    _policy_retriever = None


def generate_explanation_from_policies(
    claim: ClaimForRAG, prediction: PredictionForRAG
) -> str:
    # Build a simple text query combining denial reasons + network status + amount
    reasons = ", ".join(prediction.top_denial_reasons)
    base_query = f"denial reasons: {reasons}, network_status: {claim.network_status}, billed_amount: {claim.billed_amount}"

    if claim.patient_question:
        user_q = claim.patient_question.strip()
    else:
        user_q = "Explain why this claim may be denied and what documentation or actions are needed."

    # retrieved_docs = []
    # if _policy_retriever:
    #     retrieved_docs = _policy_retriever.get_relevant_documents(base_query + " " + user_q)

    # Context text: concatenate top policy chunks
    # context_text = "\n\n".join(d.page_content for d in retrieved_docs)

    # For now, we can just stitch policies naively:
    context_text = (
        "Relevant policy excerpts:\n"
        "- MRI & Advanced Imaging Prior Authorization: high-cost imaging often requires prior auth and strong clinical documentation.\n"
        "- Out-of-Network Provider Coverage: out-of-network services can be denied if not covered or not authorized.\n"
        "- Clinical Documentation Requirements: high-cost procedures need clear diagnosis and progress notes."
    )

    # Pseudocode prompt; in real code, call your LLM
    # llm = <YourLLMClass>(...)
    # prompt = f"""
    # You are a healthcare claims assistant.
    # Claim details:
    # - ICD codes: {claim.icd_codes}
    # - CPT codes: {claim.cpt_codes}
    # - Billed amount: {claim.billed_amount}
    # - Provider type: {claim.provider_type}
    # - Network status: {claim.network_status}
    #
    # Model prediction:
    # - Approval probability: {prediction.approval_probability:.2f}
    # - Denial probability: {prediction.denial_probability:.2f}
    # - Top denial reasons: {reasons}
    #
    # Policy context:
    # {context_text}
    #
    # User question (if any): {user_q}
    #
    # In clear, simple language, explain:
    # 1) Why this claim is at risk of denial.
    # 2) What documentation or actions are needed to reduce denial risk.
    # 3) Any specific notes related to out-of-network, pre-authorization, or medical necessity.
    # """
    #
    # explanation = llm(prompt)
    #
    # return explanation

    # Temporary stub while wiring:
    explanation = (
        f"Based on the model prediction and policy context, this claim has a notable risk of denial, "
        f"with reasons such as {reasons}. High-cost services and out-of-network providers often require "
        f"prior authorization and strong clinical documentation.\n\n"
        f"To reduce denial risk, ensure that any required prior authorization is on file, verify whether "
        f"the provider is in-network or if out-of-network benefits apply, and include recent progress notes "
        f"and diagnostic information supporting the medical necessity of the service.\n\n"
        f"User question: {user_q}"
    )

    return explanation