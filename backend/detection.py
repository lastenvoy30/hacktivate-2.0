import numpy as np
from qiskit.quantum_info import state_fidelity

from quantum_core import get_message_state
from signatures import derive_angles_for_copy

# Derived from calibration: in a noiseless simulation, legitimate
# signatures always show 0 error. 0.05 is a conservative safety
# margin above that theoretical baseline. In a physical deployment
# with real channel noise, this would instead be derived from the
# actual measured noise floor (see calibration notes).
DEFAULT_THRESHOLD = 0.05


def compute_error_rate(message: str, revealed_key: str, received_states: list) -> float:
    """
    Our QBER-style statistic: average deviation (1 - fidelity) between
    what was actually received and what a legitimate signature should
    produce. 0 = perfect match, 1 = completely different.
    """
    fidelities = []
    for i, received_state in enumerate(received_states):
        theta, phi = derive_angles_for_copy(message, revealed_key, i)
        expected_state = get_message_state(theta, phi)
        fidelities.append(state_fidelity(received_state, expected_state))
    avg_fidelity = float(np.mean(fidelities))
    return max(0.0, 1.0 - avg_fidelity) 

def compute_forgery_probability(error_rate: float, threshold: float = DEFAULT_THRESHOLD) -> float:
    """
    A smooth, deterministic score (0 to 1) indicating how strongly the
    error rate suggests tampering. This is a fixed mathematical
    transform, not a learned/trained model -- satisfies the no-AI/ML
    requirement. Saturates toward 1 as error_rate grows past threshold.
    """
    return float(1 - np.exp(-error_rate / threshold)) if threshold > 0 else (1.0 if error_rate > 0 else 0.0)


def evaluate_signature(message: str, revealed_key: str, received_states: list, threshold: float = DEFAULT_THRESHOLD) -> dict:
    """
    The final, deterministic accept/reject decision engine. Same
    error_rate always produces the same verdict -- no randomness in
    the decision logic itself, even though the underlying measurements
    are probabilistic.
    """
    error_rate = compute_error_rate(message, revealed_key, received_states)
    forgery_probability = compute_forgery_probability(error_rate, threshold)

    is_attack = error_rate > threshold
    return {
        "status": "attack_detected" if is_attack else "clean",
        "error_rate": round(error_rate, 6),
        "threshold": threshold,
        "verdict": "Signature Rejected — Attack Detected" if is_attack else "Signature Accepted",
        "forgery_probability": round(forgery_probability, 6),
        "trial_count": len(received_states),
    }