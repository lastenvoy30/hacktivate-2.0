from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timezone

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your exact Vercel URL before demo day
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AttackRequest(BaseModel):
    attack_type: str  # "forgery" | "impersonation" | "replay" | "channel_manipulation"

@app.post("/simulate/clean")
def simulate_clean():
    return {
        "status": "clean",
        "attack_type": None,
        "error_rate": 0.02,
        "threshold": 0.11,
        "verdict": "Signature Accepted",
        "forgery_probability": 0,
        "trial_count": 100,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.post("/simulate/attack")
def simulate_attack(request: AttackRequest):
    return {
        "status": "attack_detected",
        "attack_type": request.attack_type,
        "error_rate": 0.34,
        "threshold": 0.11,
        "verdict": "Signature Rejected — Attack Detected",
        "forgery_probability": 0.91,
        "trial_count": 100,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }