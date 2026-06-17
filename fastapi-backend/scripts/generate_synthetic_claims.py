# scripts/generate_synthetic_claims.py
import os
import random
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

N_CLAIMS = 20000
RANDOM_SEED = 42

random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

ICD_CODES = ["E11.9", "I10", "M54.5", "J45.909", "K21.9"]
CPT_CODES = ["99213", "99214", "71020", "73721", "80053", "93000"]
SERVICE_TYPES = ["consultation", "lab", "imaging", "surgery"]
PROVIDER_TYPES = ["primary_care", "specialist", "lab", "imaging_center"]
NETWORK_STATUSES = ["in_network", "out_of_network"]
DENIAL_REASONS = [
    "out_of_network",
    "no_prior_auth",
    "insufficient_documentation",
    "non_covered_service",
    "billing_error",
]


def random_date(days_back: int = 365) -> datetime:
    offset = random.randint(0, days_back)
    return datetime.today() - timedelta(days=offset)


def generate_single_claim(idx: int) -> dict:
    claim_id = f"C{idx:06d}"
    patient_id = f"P{random.randint(1, 3000):05d}"
    provider_id = f"PR{random.randint(1, 800):04d}"

    visit_date = random_date()
    service_type = random.choice(SERVICE_TYPES)
    provider_type = random.choice(PROVIDER_TYPES)
    network_status = random.choices(
        NETWORK_STATUSES,
        weights=[0.8, 0.2],  # mostly in network
        k=1,
    )[0]

    n_icd = random.randint(1, 3)
    n_cpt = random.randint(1, 2)

    icd_codes = random.sample(ICD_CODES, n_icd)
    cpt_codes = random.sample(CPT_CODES, n_cpt)

    # baseline billed amount by service
    base_amount = {
        "consultation": np.random.normal(1500, 400),
        "lab": np.random.normal(800, 200),
        "imaging": np.random.normal(6000, 1500),
        "surgery": np.random.normal(25000, 8000),
    }[service_type]
    billed_amount = max(300, float(np.round(base_amount, 0)))

    has_referral = int(random.random() < 0.7)
    has_prior_auth = int(random.random() < 0.6)
    documentation_level = random.choices(
        ["low", "medium", "high"],
        weights=[0.25, 0.5, 0.25],
        k=1,
    )[0]

    previous_claims_count = random.randint(0, 15)
    previous_denials_count = random.randint(0, min(previous_claims_count, 5))

    # ---- Rule-based label logic ----
    denial_score = 0.1  # base

    reasons = []

    if network_status == "out_of_network":
        denial_score += 0.35
        reasons.append("out_of_network")

    if billed_amount > 15000 and not has_prior_auth:
        denial_score += 0.35
        reasons.append("no_prior_auth")

    if service_type in {"imaging", "surgery"} and documentation_level == "low":
        denial_score += 0.25
        reasons.append("insufficient_documentation")

    if random.random() < 0.05:
        denial_score += 0.2
        reasons.append("non_covered_service")

    if random.random() < 0.05:
        denial_score += 0.15
        reasons.append("billing_error")

    # Add some randomness
    denial_score += np.random.normal(0, 0.05)
    denial_score = max(0.0, min(denial_score, 0.99))

    approved_prob = 1.0 - denial_score
    label_approved = int(random.random() < approved_prob)

    if label_approved == 1:
        denial_reasons = []
    else:
        if not reasons:
            reasons = ["insufficient_documentation"]
        # unique reasons only
        denial_reasons = sorted(list(set(reasons)))

    return {
        "claim_id": claim_id,
        "patient_id": patient_id,
        "provider_id": provider_id,
        "visit_date": visit_date.date().isoformat(),
        "service_type": service_type,
        "icd_codes": ",".join(icd_codes),
        "cpt_codes": ",".join(cpt_codes),
        "billed_amount": billed_amount,
        "provider_type": provider_type,
        "network_status": network_status,
        "has_referral": has_referral,
        "has_prior_auth": has_prior_auth,
        "documentation_level": documentation_level,
        "previous_claims_count": previous_claims_count,
        "previous_denials_count": previous_denials_count,
        "label_approved": label_approved,
        "denial_reasons": "|".join(denial_reasons),
    }


def main():
    records = [generate_single_claim(i) for i in range(1, N_CLAIMS + 1)]
    df = pd.DataFrame(records)

    os.makedirs("data", exist_ok=True)
    out_path = os.path.join("data", "claims_synthetic.csv")
    df.to_csv(out_path, index=False)
    print(f"Wrote {len(df)} synthetic claims to {out_path}")


if __name__ == "__main__":
    main()