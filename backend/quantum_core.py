from qiskit import QuantumCircuit
from qiskit_aer.primitives import SamplerV2 as Sampler


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

if __name__ == "__main__":
    for basis in ["Z", "X", "Y"]:
        counts = measure_qubit(basis)
        print(f"{basis}-basis measurement of |0> over 1000 shots:", counts)

    print()

    for basis in ["Z", "X", "Y"]:
        counts = run_bell_test(basis)
        print(f"{basis}-basis Bell pair measurement over 1000 shots:", counts)