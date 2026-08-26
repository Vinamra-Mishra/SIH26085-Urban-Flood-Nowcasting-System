"""UFNS Scientific Hydrodynamic Benchmark & Model Validation Package."""

from services.validation.benchmark import (
    BENCHMARK_CATALOG,
    BenchmarkDataset,
    BenchmarkEngine,
    BenchmarkEvaluationResult,
    GLOBAL_BENCHMARK_ENGINE,
)
from services.validation.metrics import (
    calculate_contingency_scores,
    calculate_depth_errors,
    calculate_kge,
    calculate_nse,
)

__all__ = [
    "BENCHMARK_CATALOG",
    "BenchmarkDataset",
    "BenchmarkEngine",
    "BenchmarkEvaluationResult",
    "GLOBAL_BENCHMARK_ENGINE",
    "calculate_contingency_scores",
    "calculate_depth_errors",
    "calculate_kge",
    "calculate_nse",
]
