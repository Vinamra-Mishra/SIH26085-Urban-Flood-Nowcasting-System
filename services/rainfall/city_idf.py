"""Hydrologic & Hydraulic IDF Formulation and Design Storm Engine.

Implements authoritative mathematical formulations for urban flood nowcasting:
1. Sherman / Horner Power-Law IDF:
     I(t, T) = (K * T^m) / ((t + d)^n)
2. Kothyari-Garde Regional Formula for India (Zope, Eldho, & Jothiprakash 2016):
     I_{t, T} = C * (R_{24, 2}^{0.33} * T^{0.20}) / (t^{0.71})
   where C = 8.3 for Western India (Mumbai), C = 7.1 for Southern India (Krishna Basin).
3. CWC Krishna-Pennar Sub-Zone 3(h) Short-Duration Reduction:
     P_t = P_{24} * (t / 24)^{0.45}
4. Alternating Block Method (Chow, Maidment & Mays 1988) for hyetograph synthesis.
5. Doppler Radar Reflectivity to Rain Rate (Z-R Inversion):
     Z = a * R^b <=> R = (Z / a)^(1 / b)
   Marshall-Palmer (a=200, b=1.6), IMD Convective Monsoon (a=300, b=1.4 or a=260, b=1.4).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal

import numpy as np


@dataclass(frozen=True)
class CityIDFParameters:
    """City-specific Intensity-Duration-Frequency parameters."""

    city_id: str
    city_name: str
    c_kothyari: float
    r_24_2_mm: float
    k_sherman: float
    m_sherman: float
    d_sherman_min: float
    n_sherman: float
    zr_a: float = 300.0
    zr_b: float = 1.4


CITY_CONFIGS: dict[str, CityIDFParameters] = {
    "mumbai": CityIDFParameters(
        city_id="mumbai",
        city_name="Mumbai",
        c_kothyari=8.3,
        r_24_2_mm=260.0,
        k_sherman=5850.0,
        m_sherman=0.22,
        d_sherman_min=18.0,
        n_sherman=0.74,
        zr_a=300.0,
        zr_b=1.4,
    ),
    "vijayawada": CityIDFParameters(
        city_id="vijayawada",
        city_name="Vijayawada",
        c_kothyari=7.1,
        r_24_2_mm=180.0,
        k_sherman=4200.0,
        m_sherman=0.20,
        d_sherman_min=15.0,
        n_sherman=0.71,
        zr_a=260.0,
        zr_b=1.4,
    ),
}


def kothyari_garde_intensity(
    t_hours: float,
    t_return_years: float,
    c_regional: float = 8.3,
    r_24_2_mm: float = 260.0,
) -> float:
    """Calculate rainfall intensity (mm/h) using Kothyari-Garde formula.

    I_{t, T} = C * (R_{24, 2}^0.33 * T^0.20) / (t^0.71)
    """
    if t_hours <= 0 or t_return_years <= 0:
        raise ValueError("Duration and return period must be positive.")
    return float(c_regional * (r_24_2_mm**0.33) * (t_return_years**0.20) / (t_hours**0.71))


def sherman_intensity(
    t_minutes: float,
    t_return_years: float,
    k: float = 5850.0,
    m: float = 0.22,
    d_minutes: float = 18.0,
    n: float = 0.74,
) -> float:
    """Calculate rainfall intensity (mm/h) using Sherman / Horner power-law.

    I(t, T) = (K * T^m) / ((t + d)^n)
    """
    if t_minutes <= 0 or t_return_years <= 0:
        raise ValueError("Duration and return period must be positive.")
    return float((k * (t_return_years**m)) / ((t_minutes + d_minutes) ** n))


def cwc_short_duration_depth(t_hours: float, p_24_mm: float) -> float:
    """Calculate cumulative depth (mm) for duration t (hours) via CWC Sub-Zone 3(h).

    P_t = P_24 * (t / 24)^0.45
    """
    if t_hours <= 0:
        return 0.0
    return float(p_24_mm * ((t_hours / 24.0) ** 0.45))


def dbz_to_rain_rate(
    dbz: float | np.ndarray,
    a: float = 300.0,
    b: float = 1.4,
    min_dbz: float = 10.0,
    max_dbz: float = 55.0,
) -> np.ndarray:
    """Convert Doppler radar reflectivity dBZ to rain rate R (mm/h) using Z-R inversion.

    Z = 10^(dBZ / 10)
    R = (Z / a)^(1 / b)
    """
    dbz_arr = np.asarray(dbz, dtype=np.float64)
    capped = np.clip(dbz_arr, -30.0, max_dbz)
    z = np.power(10.0, capped / 10.0)
    rate = np.power(np.maximum(z / a, 0.0), 1.0 / b)
    rate[dbz_arr < min_dbz] = 0.0
    return np.nan_to_num(rate, nan=0.0, posinf=0.0, neginf=0.0)


def rain_rate_to_dbz(rate: float | np.ndarray, a: float = 300.0, b: float = 1.4) -> np.ndarray:
    """Convert rain rate R (mm/h) to radar reflectivity dBZ."""
    rate_arr = np.asarray(rate, dtype=np.float64)
    safe = np.maximum(rate_arr, 1e-6)
    z = a * np.power(safe, b)
    dbz = 10.0 * np.log10(np.maximum(z, 1e-10))
    dbz[rate_arr <= 0.0] = -30.0
    return np.nan_to_num(dbz, nan=-30.0, posinf=55.0, neginf=-30.0)


def synthesize_alternating_block_hyetograph(
    total_depth_mm: float,
    duration_minutes: int = 180,
    interval_minutes: int = 15,
    city_id: str = "mumbai",
    return_period_years: float = 10.0,
) -> list[float]:
    """Generate hyetograph (mm/h for each time interval) via Alternating Block Method."""
    n_steps = duration_minutes // interval_minutes
    durations_h = [(i + 1) * (interval_minutes / 60.0) for i in range(n_steps)]
    
    cfg = CITY_CONFIGS.get(city_id.lower(), CITY_CONFIGS["mumbai"])
    
    # Compute cumulative depths using Kothyari-Garde
    intensities = [
        kothyari_garde_intensity(d, return_period_years, cfg.c_kothyari, cfg.r_24_2_mm)
        for d in durations_h
    ]
    cum_depths = [i * d for i, d in zip(intensities, durations_h)]
    
    # Scale total depth to target
    scale = total_depth_mm / cum_depths[-1] if cum_depths[-1] > 0 else 1.0
    cum_depths = [cd * scale for cd in cum_depths]
    
    # Incremental depths
    inc_depths = [cum_depths[0]] + [
        cum_depths[i] - cum_depths[i - 1] for i in range(1, len(cum_depths))
    ]
    inc_depths.sort(reverse=True)
    
    # Alternate around peak
    blocks = [0.0] * n_steps
    mid = n_steps // 2
    left, right = mid, mid + 1
    for k, depth in enumerate(inc_depths):
        if k % 2 == 0:
            if left >= 0:
                blocks[left] = depth
                left -= 1
        else:
            if right < n_steps:
                blocks[right] = depth
                right += 1
                
    # Convert interval depths (mm) to intensities (mm/h)
    rate_factor = 60.0 / interval_minutes
    return [round(b * rate_factor, 2) for b in blocks]
