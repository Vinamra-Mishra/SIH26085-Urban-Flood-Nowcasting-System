"""Phase I — Scientific Hydrological & Hydrodynamic Validation Metrics.

Formulations:
- Nash–Sutcliffe Efficiency (NSE)
- Kling–Gupta Efficiency (KGE)
- Critical Success Index (CSI / Threat Score)
- Probability of Detection (POD / Hit Rate)
- False Alarm Ratio (FAR)
- 2D Spatial Depth RMSE, MAE, Mean Bias
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np


def calculate_nse(sim: np.ndarray, obs: np.ndarray) -> float:
    """Compute Nash–Sutcliffe Efficiency (NSE) between simulated and observed 1D series."""
    s = np.asarray(sim, dtype=np.float64).reshape(-1)
    o = np.asarray(obs, dtype=np.float64).reshape(-1)
    if s.size == 0 or o.size == 0 or s.size != o.size:
        raise ValueError("Simulated and observed arrays must have identical non-zero dimensions.")

    denom = np.sum((o - np.mean(o)) ** 2)
    if denom <= 1e-12:
        # Constant observation baseline
        num = np.sum((s - o) ** 2)
        return 1.0 if num <= 1e-12 else -float("inf")

    num = np.sum((s - o) ** 2)
    return float(1.0 - (num / denom))


def calculate_kge(sim: np.ndarray, obs: np.ndarray) -> dict[str, float]:
    """Compute Kling–Gupta Efficiency (KGE) and decomposed components (r, alpha, beta)."""
    s = np.asarray(sim, dtype=np.float64).reshape(-1)
    o = np.asarray(obs, dtype=np.float64).reshape(-1)
    if s.size == 0 or o.size == 0 or s.size != o.size:
        raise ValueError("Simulated and observed arrays must have identical non-zero dimensions.")

    std_s = float(np.std(s))
    std_o = float(np.std(o))
    mean_s = float(np.mean(s))
    mean_o = float(np.mean(o))

    # Pearson correlation coefficient r
    if std_s > 1e-12 and std_o > 1e-12:
        cov = float(np.mean((s - mean_s) * (o - mean_o)))
        r = cov / (std_s * std_o)
        r = max(-1.0, min(1.0, r))
    else:
        r = 1.0 if abs(std_s - std_o) <= 1e-6 else 0.0

    # Variability ratio alpha
    alpha = (std_s / std_o) if std_o > 1e-12 else 1.0

    # Bias ratio beta
    beta = (mean_s / mean_o) if abs(mean_o) > 1e-12 else 1.0

    # Composite KGE score
    kge = 1.0 - math.sqrt((r - 1.0) ** 2 + (alpha - 1.0) ** 2 + (beta - 1.0) ** 2)

    return {
        "kge": round(float(kge), 4),
        "correlation_r": round(float(r), 4),
        "variability_alpha": round(float(alpha), 4),
        "bias_beta": round(float(beta), 4),
    }


def calculate_contingency_scores(
    sim_grid: np.ndarray,
    obs_grid: np.ndarray,
    threshold_m: float = 0.05,
) -> dict[str, Any]:
    """Compute 2D spatial flood extent contingency table metrics (CSI, POD, FAR, F1)."""
    s = np.asarray(sim_grid, dtype=np.float64).reshape(-1)
    o = np.asarray(obs_grid, dtype=np.float64).reshape(-1)
    if s.size != o.size:
        raise ValueError("Simulation and observation grids must have identical pixel count.")

    sim_wet = s >= threshold_m
    obs_wet = o >= threshold_m

    hits = int(np.count_nonzero(sim_wet & obs_wet))
    misses = int(np.count_nonzero(~sim_wet & obs_wet))
    false_alarms = int(np.count_nonzero(sim_wet & ~obs_wet))
    correct_negatives = int(np.count_nonzero(~sim_wet & ~obs_wet))

    # CSI (Threat Score)
    csi_denom = hits + misses + false_alarms
    csi = (hits / csi_denom) if csi_denom > 0 else 1.0

    # Probability of Detection (POD / Hit Rate)
    pod_denom = hits + misses
    pod = (hits / pod_denom) if pod_denom > 0 else 1.0

    # False Alarm Ratio (FAR)
    far_denom = hits + false_alarms
    far = (false_alarms / far_denom) if far_denom > 0 else 0.0

    # Spatial F1 Score
    f1_denom = 2 * hits + misses + false_alarms
    f1 = (2 * hits / f1_denom) if f1_denom > 0 else 1.0

    return {
        "threshold_m": threshold_m,
        "hits": hits,
        "misses": misses,
        "false_alarms": false_alarms,
        "correct_negatives": correct_negatives,
        "critical_success_index_csi": round(float(csi), 4),
        "probability_of_detection_pod": round(float(pod), 4),
        "false_alarm_ratio_far": round(float(far), 4),
        "f1_score": round(float(f1), 4),
    }


def calculate_depth_errors(sim_grid: np.ndarray, obs_grid: np.ndarray) -> dict[str, float]:
    """Compute continuous water-depth spatial error statistics (RMSE, MAE, Max Error, Bias)."""
    s = np.asarray(sim_grid, dtype=np.float64).reshape(-1)
    o = np.asarray(obs_grid, dtype=np.float64).reshape(-1)
    diff = s - o

    rmse = float(np.sqrt(np.mean(diff ** 2)))
    mae = float(np.mean(np.abs(diff)))
    max_err = float(np.max(np.abs(diff)))
    mean_bias = float(np.mean(diff))

    return {
        "rmse_m": round(rmse, 4),
        "mae_m": round(mae, 4),
        "max_abs_error_m": round(max_err, 4),
        "mean_bias_m": round(mean_bias, 4),
    }
