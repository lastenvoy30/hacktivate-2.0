from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional

from signatures import sign_message
from attacks import (
    simulate_forgery_attack,
    simulate_impersonation_attack,
    simulate_channel_manipulation_attack,
)
from detection import evaluate_signature, DEFAULT_THRESHOLD

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your exact Vercel URL before demo day
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Demo constants -- fixed message/key keep the live demo simple and repeatable.
DEMO_MESSAGE = "Transfer 500 credits to Bob"
DEMO_PRIVATE_KEY = "alice-secret-key-123"
NUM_COPIES = 20

# In-memory replay tracker (demo-only, resets on server restart).
# Pre-seeded so clicking "Replay Attack" ALWAYS demonstrates detection
# immediately, simulating an attacker resending an already-used signature.
used_signature_ids = {"demo-replay-signature"}


class AttackRequest(BaseModel):
    attack_type: str  # "forgery" | "impersonation" | "replay" | "channel_manipulation"


def _finalize(result: dict, attack_type: Optional[str]) -> dict:
    result["attack_type"] = attack_type
    result["timestamp"] = datetime.now(timezone.utc).isoformat()
    return result


@app.post("/simulate/clean")
def simulate_clean():
    received_states = sign_message(DEMO_MESSAGE, DEMO_PRIVATE_KEY, NUM_COPIES)
    result = evaluate_signature(DEMO_MESSAGE, DEMO_PRIVATE_KEY, received_states)
    return _finalize(result, None)


@app.post("/simulate/attack")
def simulate_attack(request: AttackRequest):
    attack_type = request.attack_type

    if attack_type == "forgery":
        forged_states, _ = simulate_forgery_attack(DEMO_MESSAGE, NUM_COPIES)
        result = evaluate_signature(DEMO_MESSAGE, DEMO_PRIVATE_KEY, forged_states)

    elif attack_type == "impersonation":
        impersonated_states = simulate_impersonation_attack(DEMO_MESSAGE, DEMO_PRIVATE_KEY, NUM_COPIES)
        result = evaluate_signature(DEMO_MESSAGE, DEMO_PRIVATE_KEY, impersonated_states)

    elif attack_type == "channel_manipulation":
        manipulated_states = simulate_channel_manipulation_attack(DEMO_MESSAGE, DEMO_PRIVATE_KEY, NUM_COPIES)
        result = evaluate_signature(DEMO_MESSAGE, DEMO_PRIVATE_KEY, manipulated_states)

    elif attack_type == "replay":
        signature_id = "demo-replay-signature"
        if signature_id in used_signature_ids:
            result = {
                "status": "attack_detected",
                "error_rate": 0.0,
                "threshold": DEFAULT_THRESHOLD,
                "verdict": "Signature Rejected — Replay Detected",
                "forgery_probability": 1.0,
                "trial_count": NUM_COPIES,
            }
        else:
            used_signature_ids.add(signature_id)
            clean_states = sign_message(DEMO_MESSAGE, DEMO_PRIVATE_KEY, NUM_COPIES)
            result = evaluate_signature(DEMO_MESSAGE, DEMO_PRIVATE_KEY, clean_states)

    else:
        raise HTTPException(status_code=400, detail=f"Unknown attack_type: {attack_type}")

    return _finalize(result, attack_type)