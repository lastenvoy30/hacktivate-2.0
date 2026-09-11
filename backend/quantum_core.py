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


if __name__ == "__main__":
    for basis in ["Z", "X", "Y"]:
        counts = measure_qubit(basis)
        print(f"{basis}-basis measurement of |0> over 1000 shots:", counts)