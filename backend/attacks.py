import random
from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
from qiskit.quantum_info import partial_trace
from qiskit_aer import AerSimulator
from signatures import derive_angles_for_copy, sign_message

SIM = AerSimulator(method='statevector')


# ======================================================================
# ATTACK 1: FORGERY
# ======================================================================
def simulate_forgery_attack(message: str, num_copies: int = 20):
    """
    A forger has no real private key and no genuine entangled channel
    to Alice. They guess a key and produce a signature package as if
    it were legitimate.
    """
    fake_key = "attacker-guessed-key-" + str(random.randint(0, 99999))
    forged_states = sign_message(message, fake_key, num_copies)
    return forged_states, fake_key


# ======================================================================
# ATTACK 2: IMPERSONATION
# ======================================================================
def build_impersonated_teleportation_circuit(theta: float, phi: float = 0.0) -> QuantumCircuit:
    """
    Identical to normal teleportation, EXCEPT Bob's correction is
    deliberately applied based on flipped/wrong classical bits --
    simulating an impersonator substituting themselves as the relay
    of Alice's classical message to Bob.
    """
    qr = QuantumRegister(3, 'q')
    cr = ClassicalRegister(2, 'c')
    qc = QuantumCircuit(qr, cr)
    qc.ry(theta, 0)
    qc.rz(phi, 0)
    qc.h(1)
    qc.cx(1, 2)
    qc.cx(0, 1)
    qc.h(0)
    qc.measure(0, 0)
    qc.measure(1, 1)

    # Impersonator forces the OPPOSITE correction of what's actually correct
    with qc.if_test((cr[1], 0)):
        qc.x(2)
    with qc.if_test((cr[0], 0)):
        qc.z(2)
    return qc


def simulate_impersonation_attack(message: str, private_key: str, num_copies: int = 20):
    received_states = []
    for i in range(num_copies):
        theta, phi = derive_angles_for_copy(message, private_key, i)
        qc = build_impersonated_teleportation_circuit(theta, phi)
        qc.save_statevector()
        job = SIM.run(qc)
        final_state = job.result().get_statevector(qc)
        bob_state = partial_trace(final_state, [0, 1])
        received_states.append(bob_state)
    return received_states


# ======================================================================
# ATTACK 3: REPLAY
# ======================================================================
used_signature_log = set()


def submit_signature(message: str, key: str, signature_id: str, received_states: list, verify_fn):
    """
    Simulates submitting a signature for acceptance. Tracks signature_id
    (a stand-in for a nonce/timestamp) to catch reused signatures --
    detection here is NOT via fidelity, since a replayed signature is
    genuinely valid; it's caught by the reused-ID check instead.
    """
    if signature_id in used_signature_log:
        return {"status": "attack_detected", "attack_type": "replay", "reason": "signature_id already used"}

    result = verify_fn(message, key, received_states)
    used_signature_log.add(signature_id)
    return {"status": "clean" if result["accepted"] else "rejected", "fidelity_result": result}


# ======================================================================
# ATTACK 4: CHANNEL MANIPULATION
# ======================================================================
def build_channel_manipulated_circuit(theta: float, phi: float = 0.0) -> QuantumCircuit:
    """
    Eve intercepts Bob's half of the entangled pair mid-transit and
    measures it in a random basis before it reaches Bob, corrupting
    the entanglement the protocol depends on.
    """
    qr = QuantumRegister(3, 'q')
    cr = ClassicalRegister(3, 'c')
    qc = QuantumCircuit(qr, cr)
    qc.ry(theta, 0)
    qc.rz(phi, 0)

    qc.h(1)
    qc.cx(1, 2)

    # Eve intercepts qubit 2 in transit
    eve_basis = random.choice(["Z", "X"])
    if eve_basis == "X":
        qc.h(2)
    qc.measure(2, 2)
    if eve_basis == "X":
        qc.h(2)

    qc.cx(0, 1)
    qc.h(0)
    qc.measure(0, 0)
    qc.measure(1, 1)
    with qc.if_test((cr[1], 1)):
        qc.x(2)
    with qc.if_test((cr[0], 1)):
        qc.z(2)
    return qc


def simulate_channel_manipulation_attack(message: str, private_key: str, num_copies: int = 20):
    received_states = []
    for i in range(num_copies):
        theta, phi = derive_angles_for_copy(message, private_key, i)
        qc = build_channel_manipulated_circuit(theta, phi)
        qc.save_statevector()
        job = SIM.run(qc)
        final_state = job.result().get_statevector(qc)
        bob_state = partial_trace(final_state, [0, 1])
        received_states.append(bob_state)
    return received_states