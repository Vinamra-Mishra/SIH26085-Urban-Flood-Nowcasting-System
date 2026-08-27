"""Unit and integration tests for city dataset transformations and hydrological formulations."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest

from services.rainfall.city_idf import (
    CITY_CONFIGS,
    cwc_short_duration_depth,
    dbz_to_rain_rate,
    kothyari_garde_intensity,
    rain_rate_to_dbz,
    sherman_intensity,
    synthesize_alternating_block_hyetograph,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIR = REPO_ROOT / "data" / "processed"


def test_kothyari_garde_formula_scaling():
    """Verify Kothyari-Garde intensity increases monotonically with return period and decreases with duration."""
    # Mumbai
    i_2yr_15min = kothyari_garde_intensity(0.25, 2, c_regional=8.3, r_24_2_mm=260.0)
    i_10yr_15min = kothyari_garde_intensity(0.25, 10, c_regional=8.3, r_24_2_mm=260.0)
    i_100yr_15min = kothyari_garde_intensity(0.25, 100, c_regional=8.3, r_24_2_mm=260.0)

    assert i_2yr_15min < i_10yr_15min < i_100yr_15min
    assert i_2yr_15min > 100.0  # Tropical monsoon high intensity

    # Duration scaling
    i_2yr_60min = kothyari_garde_intensity(1.0, 2, c_regional=8.3, r_24_2_mm=260.0)
    assert i_2yr_15min > i_2yr_60min


def test_sherman_formula():
    """Verify Sherman power-law formula properties."""
    i_10yr = sherman_intensity(t_minutes=30, t_return_years=10, k=5850.0, m=0.22, d_minutes=18.0, n=0.74)
    assert i_10yr > 0.0
    assert 50.0 < i_10yr < 800.0


def test_cwc_short_duration():
    """Verify CWC Krishna Sub-Zone 3(h) depth reduction formula."""
    d_1hr = cwc_short_duration_depth(1.0, 180.0)
    d_6hr = cwc_short_duration_depth(6.0, 180.0)
    d_24hr = cwc_short_duration_depth(24.0, 180.0)

    assert 0.0 < d_1hr < d_6hr < d_24hr
    assert pytest.approx(d_24hr, rel=1e-3) == 180.0


def test_zr_radar_inversion_roundtrip():
    """Verify Marshall-Palmer and IMD Z-R power law conversions are invertible."""
    a, b = 300.0, 1.4
    original_dbz = np.array([15.0, 30.0, 45.0, 52.0])
    rain_rates = dbz_to_rain_rate(original_dbz, a=a, b=b)
    recovered_dbz = rain_rate_to_dbz(rain_rates, a=a, b=b)

    np.testing.assert_allclose(recovered_dbz, original_dbz, atol=0.5)


def test_alternating_block_hyetograph_mass():
    """Verify hyetograph integrates to total target rainfall depth."""
    target_depth_mm = 105.9
    duration_min = 180
    interval_min = 15
    hyeto = synthesize_alternating_block_hyetograph(
        total_depth_mm=target_depth_mm,
        duration_minutes=duration_min,
        interval_minutes=interval_min,
        city_id="mumbai",
        return_period_years=10,
    )

    assert len(hyeto) == duration_min // interval_min
    # Convert mm/h rates back to total depth (mm)
    calculated_total_depth = sum(rate * (interval_min / 60.0) for rate in hyeto)
    assert pytest.approx(calculated_total_depth, rel=0.05) == target_depth_mm


def test_processed_city_datasets_exist():
    """Verify all transformed processed artifacts exist for both cities."""
    for city in ["mumbai", "vijayawada"]:
        city_dir = PROCESSED_DIR / city
        assert (city_dir / "dem_normalized.tif").exists()
        assert (city_dir / "grid_spec.json").exists()
        assert (city_dir / "drainage_network.inp").exists()
        assert (city_dir / "drainage_graph.json").exists()
        assert (city_dir / "road_graph.json").exists()
        assert (city_dir / "scenarios.json").exists()
        assert (city_dir / "manifest.json").exists()


def test_swmm_models_valid_execution():
    """Verify the generated EPA-SWMM .inp models initialize without syntax errors."""
    from pyswmm import Simulation

    for city in ["mumbai", "vijayawada"]:
        inp_file = PROCESSED_DIR / city / "drainage_network.inp"
        with Simulation(str(inp_file)) as sim:
            for _ in sim:
                break
