import hashlib
import numpy as np
from qiskit.quantum_info import state_fidelity
from qiskit_aer import AerSimulator
from qiskit.quantum_info import partial_trace

from quantum_core import build_teleportation_circuit, get_message_state


def derive_angles_for_copy(message: str, key: str, copy_index: int) -> tuple:
    """
    Derives an INDEPENDENT (theta, phi) angle pair for each copy index,
    from message + key + copy_index. Using a different point per copy
    (instead of one shared point) makes forgery/tampering exponentially
    harder to fake by chance, since all copies would need to match.
    """
    combined = f"{message}|{key}|{copy_index}".encode('utf-8')
    digest = hashlib.sha256(combined).digest()
    theta_int = int.from_bytes(digest[0:4], 'big')
    phi_int = int.from_bytes(digest[4:8], 'big')
    theta = (theta_int / 0xFFFFFFFF) * np.pi
    phi = (phi_int / 0xFFFFFFFF) * 2 * np.pi
    return theta, phi


def sign_message(message: str, private_key: str, num_copies: int = 20) -> list:
    """
    Alice signs by teleporting `num_copies` independently-derived quantum
    states to Bob. Returns what Bob actually receives (simulated).
    """
    sim = AerSimulator(method='statevector')
    received_states = []
    for i in range(num_copies):
        theta, phi = derive_angles_for_copy(message, private_key, i)
        qc = build_teleportation_circuit(theta, phi)
        qc.save_statevector()
        job = sim.run(qc)
        result = job.result()
        final_state = result.get_statevector(qc)
        bob_state = partial_trace(final_state, [0, 1])
        received_states.append(bob_state)
    return received_states


def verify_signature(message: str, revealed_key: str, received_states: list, fidelity_threshold: float = 0.9) -> dict:
    """
    Bob recomputes the expected states from (message, revealed_key) and
    checks how closely each received copy matches, per-copy.
    """
    fidelities = []
    for i, received_state in enumerate(received_states):
        theta, phi = derive_angles_for_copy(message, revealed_key, i)
        expected_state = get_message_state(theta, phi)
        fidelities.append(state_fidelity(received_state, expected_state))

    avg_fidelity = float(np.mean(fidelities))
    return {
        "accepted": avg_fidelity >= fidelity_threshold,
        "average_fidelity": avg_fidelity,
        "num_copies_checked": len(received_states),
    }