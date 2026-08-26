"""Phase B — Automated Drainage Calibration & Hydraulic Parameter Estimation Engine.

Exports:
- Metrics: nash_sutcliffe_efficiency, kling_gupta_efficiency, peak_flow_error,
           time_to_peak_error, percent_bias, root_mean_squared_error,
           spatial_depth_rmse, evaluate_composite_fit, CompositeGoodnessOfFit
- Parameters: ParameterDefinition, CalibrationParameterSet, DEFAULT_PARAMETER_DEFINITIONS
- Observations: ObservationTarget, ObservationProvenance, NetworkProvenance,
                ValidationStatus, ObservedTimeSeries, SyntheticBenchmarkGenerator
- Optimizer: OptimizationStrategy, OptimizationResult, ParameterOptimizer,
             SensitivityAnalyzer, ParameterSensitivity
- Engine: DrainageCalibrationEngine, CalibrationResult, CALIBRATION_ENGINE_VERSION
- Ledger: CalibrationLedger, GLOBAL_CALIBRATION_LEDGER
"""

from services.calibration.engine import (
    CALIBRATION_ENGINE_VERSION,
    CalibrationResult,
    DrainageCalibrationEngine,
    run_forward_calibration_simulation,
)
from services.calibration.ledger import (
    GLOBAL_CALIBRATION_LEDGER,
    CalibrationLedger,
)
from services.calibration.metrics import (
    CompositeGoodnessOfFit,
    evaluate_composite_fit,
    kling_gupta_efficiency,
    nash_sutcliffe_efficiency,
    peak_flow_error,
    percent_bias,
    root_mean_squared_error,
    spatial_depth_rmse,
    time_to_peak_error,
)
from services.calibration.observations import (
    NetworkProvenance,
    ObservationProvenance,
    ObservationTarget,
    ObservedTimeSeries,
    SyntheticBenchmarkGenerator,
    ValidationStatus,
)
from services.calibration.optimizer import (
    IterationEvaluation,
    OptimizationResult,
    OptimizationStrategy,
    ParameterOptimizer,
    ParameterSensitivity,
    SensitivityAnalyzer,
)
from services.calibration.parameters import (
    DEFAULT_PARAMETER_DEFINITIONS,
    CalibrationParameterSet,
    ParameterDefinition,
)

__all__ = [
    "CALIBRATION_ENGINE_VERSION",
    "CalibrationResult",
    "DrainageCalibrationEngine",
    "run_forward_calibration_simulation",
    "CalibrationLedger",
    "GLOBAL_CALIBRATION_LEDGER",
    "CompositeGoodnessOfFit",
    "evaluate_composite_fit",
    "kling_gupta_efficiency",
    "nash_sutcliffe_efficiency",
    "peak_flow_error",
    "percent_bias",
    "root_mean_squared_error",
    "spatial_depth_rmse",
    "time_to_peak_error",
    "NetworkProvenance",
    "ObservationProvenance",
    "ObservationTarget",
    "ObservedTimeSeries",
    "SyntheticBenchmarkGenerator",
    "ValidationStatus",
    "IterationEvaluation",
    "OptimizationResult",
    "OptimizationStrategy",
    "ParameterOptimizer",
    "ParameterSensitivity",
    "SensitivityAnalyzer",
    "DEFAULT_PARAMETER_DEFINITIONS",
    "CalibrationParameterSet",
    "ParameterDefinition",
]
