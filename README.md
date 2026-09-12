# QBIT — Quantum Digital Signature Threat Detection Framework

**Built for Hacktivate 2.0**

A live, working simulation of a teleportation-based Quantum Digital Signature (QDS) protocol, paired with a real-time statistical engine that detects forgery, impersonation, replay, and quantum channel manipulation attacks — using pure math and statistics, with no AI or machine learning involved.

---

## The Problem

Classical digital signatures (RSA, ECC) rely on computational hardness — math problems that are hard to solve *today*. Shor's Algorithm, run on a sufficiently powerful quantum computer, breaks that assumption entirely. Quantum Digital Signatures fix the underlying cryptography using physics instead of math, but almost nothing exists to demonstrate how you'd actually *detect* an attack against one in real time.

## What We Built

QBIT simulates the full lifecycle of a teleportation-based QDS exchange between two parties — Alice (signer) and Bob (verifier) — using real quantum circuit simulation (Qiskit), then runs a deterministic statistical engine on top to catch tampering. Every decision the system makes is explainable with an exact, calculable number — no black-box AI involved anywhere in the detection logic.

### Core Capabilities

- **Quantum Teleportation Simulation** — Bell-state entanglement, joint Bell measurement, and Pauli correction, implemented and verified in Qiskit.
- **Quantum Digital Signature Scheme** — signing and verification using independently-derived quantum fingerprints per trial copy.
- **Four Attack Simulations** — Forgery, Impersonation, Replay, and Channel Manipulation, each using a distinct, appropriate detection mechanism.
- **Statistical Detection Engine** — error-rate (QBER-style) calculation, threshold-based deterministic accept/reject decisions, and forgery probability scoring.
- **Live Interactive Dashboard** — real-time Alice → Bob visualization, live error-rate telemetry graph, verdict banner, attack controls, and session run history.

---

## Tech Stack

**Backend**
- Python 3.11
- Qiskit 2.5.2 + Qiskit Aer (local quantum circuit simulation)
- FastAPI (REST API layer)

**Frontend**
- Next.js 14 + TypeScript
- Tailwind CSS
- Recharts (live telemetry graph)
- lucide-react (icons)

**Deployment**
- Backend: Render
- Frontend: Vercel

---

## Architecture

```
hacktivate-2.0/
├── shared/
│   └── api_contract.json      # Single source of truth for API request/response shape
├── backend/
│   ├── main.py                 # FastAPI endpoints
│   ├── quantum_core.py         # Qubit measurement, Bell states, teleportation circuit
│   ├── signatures.py           # QDS signing & verification logic
│   ├── attacks.py              # Forgery, impersonation, channel manipulation simulations
│   ├── detection.py            # Error rate, threshold, forgery probability engine
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── globals.css      # Global styles
    │   │   ├── layout.tsx       # Root layout
    │   │   └── page.tsx         # Main dashboard — all sections composed here
    │   └── lib/
    │       ├── api.ts           # Typed API layer
    │       └── types.ts         # TypeScript interfaces matching the API contract
    └── package.json
```

---

## How It Works

1. **Entanglement Distribution** — Alice and Bob each receive one half of a pre-shared entangled Bell-state qubit pair.
2. **Signing** — Alice derives a set of independent quantum fingerprints from her message and private key, and teleports them to Bob.
3. **Bell Measurement & Transmission** — Alice performs a joint Bell-state measurement and sends Bob two classical bits per trial.
4. **Pauli Correction** — Bob applies the corresponding correction (I, X, Z, or XZ) to reconstruct the original signed state.
5. **Statistical Verification** — the detection engine computes an error rate from the measurement outcomes and compares it against a fixed threshold. If the error rate exceeds the threshold, the signature is rejected as an attack.

Replay attacks are the one exception to this statistical flow — since a replayed signature is quantum-mechanically valid (it was legitimately signed once already), it's instead caught via a classical reused-signature check, not error-rate analysis.

---

## API

Two endpoints, both returning the same response shape (see `shared/api_contract.json` for the full spec):

**`POST /simulate/clean`** — runs a legitimate signing and verification cycle.

**`POST /simulate/attack`** — body: `{ "attack_type": "forgery" | "impersonation" | "replay" | "channel_manipulation" }`

**Response fields:**
```json
{
  "status": "clean | attack_detected",
  "attack_type": "string or null",
  "error_rate": "number, 0 to 1",
  "threshold": "number, 0 to 1",
  "verdict": "human-readable string",
  "forgery_probability": "number, 0 to 1",
  "trial_count": "integer",
  "timestamp": "ISO 8601 string",
  "latency_ms": "real measured backend computation time",
  "session_hash": "genuine SHA3-512-derived fingerprint of this result"
}
```

---

## Running It Locally

**Backend**
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload
```
Runs on `http://127.0.0.1:8000`. Interactive API docs at `http://127.0.0.1:8000/docs`.

**Frontend**
```bash
cd frontend
npm install
```
Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```
```bash
npm run dev
```
Runs on `http://localhost:3000`.

---

## Why No AI/ML

Every detection decision in this system is deterministic: the same measured error rate always produces the same accept/reject verdict, and every flagged attack comes with an exact, calculable statistic behind it — not a learned prediction from a black-box model. This makes the system fully auditable, which matters for a security-critical use case like signature verification.

---

## Security Note: A Real Vulnerability We Found and Fixed

During development, our first signature design encoded an entire signature into a single qubit's rotation angles. Stress-testing it against 200 tampered messages showed a **10% false-accept rate** — a genuine collision vulnerability, not a coding bug. We redesigned the scheme to derive an independent quantum fingerprint per trial copy instead of one shared fingerprint, and retested against 500 tampered messages: false accepts dropped to **0.2%**.

---

## What This Is (and Isn't)

This is a software simulation and proof-of-concept — not a production cryptographic service. Real-world deployment of teleportation-based QDS requires physical quantum hardware for entanglement distribution, which doesn't exist at usable civilian scale yet. What's built here is a complete, honestly-tested validation of the detection approach: the mathematical modelling, attack simulation, and statistical security analysis needed to demonstrate it works, built on the standard Qiskit SDK so it could extend to real quantum hardware as that infrastructure matures.

---

## Team

Built for **Hacktivate 2.0**.

---

## License

This project was built for hackathon purposes. Add a license of your choice if open-sourcing further.
