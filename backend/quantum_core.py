from qiskit import QuantumCircuit
from qiskit_aer.primitives import SamplerV2 as Sampler
from qiskit import QuantumRegister, ClassicalRegister
from qiskit.quantum_info import Statevector, partial_trace, state_fidelity
from qiskit_aer import AerSimulator


def build_measurement_circuit(basis: str) -> QuantumCircuit:
    """
    Builds a 1-qubit circuit (starting in |0>) with the correct
    pre-measurement rotation applied so a standard Z-measurement
    reveals the result in the requested basis.
    """
    qc = QuantumCircuit(1, 1)

    if basis == "Z":
        pass  # Z is native to Qiskit's measure() — no rotation needed
    elif basis == "X":
        qc.h(0)  # Hadamard maps X-basis eigenstates onto Z-basis
    elif basis == "Y":
        qc.sdg(0)  # S-dagger maps Y-basis eigenstates onto X-basis...
        qc.h(0)    # ...then Hadamard maps that onto Z-basis
    else:
        raise ValueError("basis must be 'X', 'Y', or 'Z'")

    qc.measure(0, 0)
    return qc


def measure_qubit(basis: str, shots: int = 1000) -> dict:
    """
    Runs the measurement circuit for the given basis and returns
    the raw outcome counts, e.g. {'0': 1000} or {'0': 489, '1': 511}.
    """
    sampler = Sampler()
    qc = build_measurement_circuit(basis)
    job = sampler.run([qc], shots=shots)
    result = job.result()
    return result[0].data.c.get_counts()


def build_bell_pair_circuit(basis: str = "Z") -> QuantumCircuit:
    """
    Creates a 2-qubit Bell pair (Phi+ state) and measures BOTH qubits
    in the same chosen basis, to test for genuine entanglement.
    """
    qc = QuantumCircuit(2, 2)

    # Create entanglement
    qc.h(0)      # put qubit 0 into superposition
    qc.cx(0, 1)  # CNOT: entangles qubit 1 with qubit 0

    # Rotate both qubits into the chosen measurement basis
    if basis == "Z":
        pass
    elif basis == "X":
        qc.h(0)
        qc.h(1)
    elif basis == "Y":
        qc.sdg(0)
        qc.h(0)
        qc.sdg(1)
        qc.h(1)
    else:
        raise ValueError("basis must be 'X', 'Y', or 'Z'")

    qc.measure(0, 0)
    qc.measure(1, 1)
    return qc


def run_bell_test(basis: str = "Z", shots: int = 1000) -> dict:
    sampler = Sampler()
    qc = build_bell_pair_circuit(basis)
    job = sampler.run([qc], shots=shots)
    result = job.result()
    return result[0].data.c.get_counts()
def build_teleportation_circuit(theta: float, phi: float = 0.0) -> QuantumCircuit:
    """
    Simulates Alice teleporting a message qubit (prepared using theta/phi
    as arbitrary rotation angles) to Bob, using a pre-shared Bell pair.

    q0 = Alice's message qubit (the "signature state" being sent)
    q1 = Alice's half of the entangled Bell pair
    q2 = Bob's half of the entangled Bell pair (ends up holding the teleported state)
    """
    qr = QuantumRegister(3, 'q')
    cr = ClassicalRegister(2, 'c')
    qc = QuantumCircuit(qr, cr)

    # Prepare the message qubit in some state
    qc.ry(theta, 0)
    qc.rz(phi, 0)

    # Create entangled Bell pair between q1 (Alice) and q2 (Bob)
    qc.h(1)
    qc.cx(1, 2)

    # Alice's Bell-basis measurement on her message qubit + her half of the pair
    qc.cx(0, 1)
    qc.h(0)
    qc.measure(0, 0)
    qc.measure(1, 1)

    # Bob applies Pauli corrections based on Alice's classical bits
    with qc.if_test((cr[1], 1)):
        qc.x(2)
    with qc.if_test((cr[0], 1)):
        qc.z(2)

    return qc


def get_message_state(theta: float, phi: float = 0.0) -> Statevector:
    """The original state being teleported — used only for testing/verification."""
    qc = QuantumCircuit(1)
    qc.ry(theta, 0)
    qc.rz(phi, 0)
    return Statevector.from_instruction(qc)


def run_teleportation_fidelity_check(theta: float, phi: float = 0.0) -> float:
    """
    Runs the teleportation circuit and checks how closely Bob's final
    qubit matches Alice's original message state. 1.0 = perfect match.
    """
    original_state = get_message_state(theta, phi)

    qc = build_teleportation_circuit(theta, phi)
    qc.save_statevector()

    sim = AerSimulator(method='statevector')
    job = sim.run(qc)
    result = job.result()
    final_state = result.get_statevector(qc)

    reduced_bob_state = partial_trace(final_state, [0, 1])
    return state_fidelity(reduced_bob_state, original_state)


if __name__ == "__main__":
    for basis in ["Z", "X", "Y"]:
        counts = measure_qubit(basis)
        print(f"{basis}-basis measurement of |0> over 1000 shots:", counts)

    print()

    for basis in ["Z", "X", "Y"]:
        counts = run_bell_test(basis)
        print(f"{basis}-basis Bell pair measurement over 1000 shots:", counts)

    print()

    test_angles = [(0.7, 0.0), (1.2, 0.5), (2.4, 1.1), (0.0, 0.0), (3.14159, 0.0)]
    for theta, phi in test_angles:
        fidelity = run_teleportation_fidelity_check(theta, phi)
        status = "PASS" if fidelity > 0.999 else "FAIL"
        print(f"Teleportation test theta={theta:.2f}, phi={phi:.2f} -> fidelity={fidelity:.6f} -> {status}")