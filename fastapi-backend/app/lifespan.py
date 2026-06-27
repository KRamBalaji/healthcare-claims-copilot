import os
import pickle
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI

# Global thread-safe memory registry
ml_registry = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Server Startup Initialization ---
    print("Initializing server lifespan: caching models and vector tables...")
    
    # Define absolute paths based on your workspace hierarchy
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_path = os.path.join(base_dir, "models", "yes_bank_rf_model.pkl")
    
    # 1. Cache the trained random forest model
    if os.path.exists(model_path):
        with open(model_path, "rb") as f:
            ml_registry["classifier"] = pickle.load(f)
        print("✓ Classifier model loaded successfully into runtime memory.")
    else:
        print(f"⚠ Warning: Classifier not found at {model_path}. Using fallback mock engine.")
        ml_registry["classifier"] = None

    # 2. Cache your static target grounding vectors or reference lookups
    # (Replace mock policies list below with your local pickling/FAISS reading script)
    ml_registry["policy_database"] = [
        {"id": "mri", "title": "MRI Prior Auth", "text": "MRI scans require pre-auth over ₹4000..."},
        {"id": "oon", "title": "Out-of-Network", "text": "OON services have 40% co-pay rules..."}
    ]
    print("✓ Policy grounding text maps initialized.")

    yield
    
    # --- Server Shutdown Cleanup ---
    print("Clearing out memory spaces...")
    ml_registry.clear()