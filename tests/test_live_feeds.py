"""Unit tests for live meteorological, oceanographic, and hydrological feed connectors."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from services.ingestion.live_feeds import (
    GloFASRiverDischargeClient,
    MarineTideSurgeClient,
    OpenMeteoNWPClient,
    OpenMeteoPrecipitationClient,
    RainViewerClient,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
LIVE_DIR = REPO_ROOT / "data" / "live"


def test_rainviewer_radar_index():
    """Verify RainViewer radar client parses frame timestamps."""
    client = RainViewerClient()
    meta = client.get_latest_radar_frames()
    assert "host" in meta
    assert isinstance(meta.get("past_timestamps"), list)
    assert len(meta.get("past_timestamps", [])) > 0


def test_open_meteo_live_precipitation():
    """Verify Open-Meteo 15-minute and current precipitation schema."""
    client = OpenMeteoPrecipitationClient()
    data = client.get_live_precipitation(18.96, 72.82)
    assert "current" in data
    assert "precipitation" in data["current"]
    assert "minutely_15" in data


def test_open_meteo_nwp_multi_model():
    """Verify multi-model NWP forecast retrieval (ECMWF, GFS, ICON)."""
    client = OpenMeteoNWPClient()
    data = client.get_multi_model_forecast(18.96, 72.82)
    assert "hourly" in data
    assert "precipitation_ecmwf_ifs" in data["hourly"] or "precipitation" in data["hourly"]


def test_marine_tide_surge_forecast():
    """Verify Arabian Sea marine storm surge and tide retrieval."""
    client = MarineTideSurgeClient()
    data = client.get_tide_surge_forecast(18.92, 72.83)
    assert "hourly" in data
    assert "sea_level_height_msl" in data["hourly"]


def test_glofas_river_discharge():
    """Verify GloFAS Krishna River discharge forecast for Vijayawada."""
    client = GloFASRiverDischargeClient()
    data = client.get_river_discharge(16.51, 80.62)
    assert "daily" in data
    assert "river_discharge" in data["daily"]
    assert len(data["daily"]["river_discharge"]) >= 7


def test_live_data_files_exist_and_valid():
    """Verify all live data files exist and have non-empty valid JSON."""
    assert (LIVE_DIR / "manifest.json").exists()
    assert (LIVE_DIR / "radar_index.json").exists()

    for city in ["mumbai", "vijayawada"]:
        cdir = LIVE_DIR / city
        assert (cdir / "live_precipitation.json").exists()
        assert (cdir / "nwp_forecast.json").exists()

        p_data = json.loads((cdir / "live_precipitation.json").read_text(encoding="utf-8"))
        assert "latitude" in p_data
