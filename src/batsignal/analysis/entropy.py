import numpy as np


def calculate_entropy(image: np.ndarray):

    _, counts = np.unique(image, return_counts=True)

    probabilities = counts / counts.sum()

    probabilities = probabilities[probabilities > 0]

    entropy = -np.sum(probabilities * np.log2(probabilities))

    return float(entropy)
