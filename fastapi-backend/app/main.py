# app/main.py
from fastapi import FastAPI

app = FastAPI(title="Healthcare Claims Triage & Explanation Copilot API")

@app.get("/health")
def health_check():
    return {"status": "ok"}
