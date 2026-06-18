# Healthcare Claims Triage & Explanation Copilot

An end-to-end **ML + GenAI-style** project that predicts healthcare claim denials,
explains them in natural language, and surfaces likely next steps for agents and patients.

Built with:

- Backend: FastAPI, scikit-learn (RandomForest), Python
- Frontend: Next.js (App Router), TypeScript, shadcn/ui
- Data & ML: Synthetic claims dataset, binary + multi-label models
- Infra: Docker-ready, CORS, clear API contracts

## Features

- **Claim Triage (Triage page `/`):**
  - Form to enter ICD/CPT, billed amount, provider type, network status, notes.
  - Predicts approval vs denial probability.
  - Shows top likely denial reasons with calibrated probabilities.
  - Backend-generated natural language explanation via `/explain_claim`.

- **Agent View (`/agent`):**
  - Focused view for a single claim: quick fields + agent notes.
  - Risk assessment panel (approval/denial probabilities, reasons).
  - Explanation & next-steps panel using the same backend APIs.

- **Policies (`/policies`):**
  - Catalog of policy documents that will ground RAG explanations.
  - Searchable by title, category, and description.

- **Health & Observability:**
  - `/health` endpoint on the API.
  - Frontend header shows live backend status (API healthy/down).

## Architecture

### Backend (FastAPI)

- `app/main.py`:
  - `/health` – health check.
  - `/predict_claim` – serves trained ML models for:
    - binary approval vs denial.
    - multi-label denial reasons.
  - `/explain_claim` – builds a natural-language explanation on top of predictions.

- ML artifacts:
  - `data/claims_synthetic.csv` – synthetic training data.
  - `scripts/generate_synthetic_claims.py` – data generator.
  - `scripts/train_models.py` – trains RandomForest-based models and saves:
    - `models/approval_model.joblib`
    - `models/denial_reasons_model.joblib`

### Frontend (Next.js + shadcn)

- `app/page.tsx` – Triage page.
- `app/agent/page.tsx` – Agent View.
- `app/policies/page.tsx` – Policies catalog.
- `components/BackendStatus.tsx` – shows backend health in header.
- `components/ui/*` – shadcn/ui components.

## Running locally

### Backend

```bash
cd fastapi-backend
python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt  # or install minimal deps: fastapi, uvicorn, scikit-learn, joblib, pandas, numpy

# (optional, first time) generate data and train models
python scripts/generate_synthetic_claims.py
python scripts/train_models.py

# run API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd nextjs-frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Roadmap ￼

- Plug in real RAG over policy documents for `/explain_claim`.
- Add simple Dockerfiles for backend and frontend.
- Add basic monitoring/logging and CI pipeline.