"""Phase D — Real NCMRWF/IMD NWP Ingestion & Multi-Sensor Blending API.

FastAPI endpoints for:
- Checking real NWP dataset ingestion status (Gate RD-09)
- Ingesting authentic NCMRWF NetCDF4 (.nc) / GRIB2 (.grib2) files
- Querying reprojected NWP forecast fields on Bagjola 846x934 GridSpec
- Executing multi-sensor NWP + Doppler radar blending
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from services.ingestion.grib_netcdf import (
    GATE_RD09,
    GLOBAL_REAL_NWP_ENGINE,
    RealNWPDataset,
    RealNWPIngestionEngine,
    get_authoritative_bagjola_grid,
)
from services.nowcast.blending import (
    GLOBAL_MULTI_SENSOR_BLENDER,
    BlendingMode,
    compute_blending_weights,
)

router = APIRouter(prefix="/api/v1/nwp", tags=["NWP & Multi-Sensor Blending"])


class IngestFilePathRequest(BaseModel):
    file_path: str = Field(..., description="Absolute or relative path to real NCMRWF NetCDF4/GRIB2 file")


class BlendRequest(BaseModel):
    lead_minutes: int = Field(default=60, ge=0, le=180, description="Forecast lead time in minutes")
    scenario_id: Optional[str] = Field(default="S4", description="Scenario ID to pull radar frame from")


@router.get("/status")
def get_nwp_status() -> dict[str, Any]:
    """Get status of real NCMRWF/IMD NWP dataset ingestion and Gate RD-09."""
    engine = GLOBAL_REAL_NWP_ENGINE
    dataset = engine._cached_dataset

    if dataset is None:
        # Check if raw file exists in canonical directory
        raw_file = engine.discover_raw_file()
        if raw_file:
            try:
                dataset = engine.ingest_file(raw_file)
            except Exception:
                dataset = None

    if dataset is None:
        return {
            "gate": GATE_RD09,
            "status": "NOT_FETCHED",
            "real_data_available": False,
            "message": "No authentic NCMRWF/IMD NetCDF4 (.nc) or GRIB2 (.grib2) forecast file found in data/raw/.",
            "supported_models": ["NCMRWF Regional Unified Model (NCUM)", "IMD High-Resolution WRF (3km)"],
            "target_grid": {
                "grid_id": engine.target_grid.grid_id,
                "dimensions": f"{engine.target_grid.width}x{engine.target_grid.height}",
                "resolution_m": engine.target_grid.cell_size_m,
                "crs": engine.target_grid.crs_wkt_or_epsg,
            },
            "blending_mode": "RADAR_ONLY_FALLBACK",
            "blending_schedule": {
                "0-30m": "100% Radar, 0% NWP",
                "30-150m": "Linear weight transition",
                "150-180m": "0% Radar, 100% NWP",
            },
        }

    return {
        "gate": GATE_RD09,
        "status": dataset.status.value,
        "real_data_available": True,
        "model_name": dataset.model_name,
        "file_name": dataset.file_path.name,
        "file_sha256": dataset.file_sha256,
        "file_size_bytes": dataset.file_size_bytes,
        "reference_time_utc": dataset.reference_time_utc.isoformat(),
        "available_lead_minutes": sorted(list(dataset.forecast_steps.keys())),
        "target_grid": {
            "grid_id": dataset.target_grid.grid_id,
            "dimensions": f"{dataset.target_grid.width}x{dataset.target_grid.height}",
            "resolution_m": dataset.target_grid.cell_size_m,
            "crs": dataset.target_grid.crs_wkt_or_epsg,
        },
        "provenance": dataset.source_provenance.to_dict(),
        "provenance_class": dataset.provenance_class.value,
        "quality_flags": [q.value for q in dataset.quality_flags],
    }


ALLOWED_NWP_EXTENSIONS = {".nc", ".nc4", ".netcdf", ".grib", ".grib2", ".grb2"}


@router.post("/ingest")
def ingest_nwp_file(req: IngestFilePathRequest) -> dict[str, Any]:
    """Ingest, validate, and reproject a real NCMRWF/IMD forecast file within data/raw."""
    engine = GLOBAL_REAL_NWP_ENGINE
    raw_root = Path("data/raw").resolve()
    safe_name = Path(req.file_path).name
    path = (raw_root / safe_name).resolve()

    if not path.is_file() or not path.is_relative_to(raw_root):
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "FILE_NOT_FOUND", "message": "Real NWP file not found in data/raw"}},
        )

    try:
        dataset = engine.ingest_file(path)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "NWP_INGESTION_FAILED", "message": "Failed to parse and reproject NWP dataset."}},
        ) from e

    return {
        "ingested": True,
        "status": dataset.status.value,
        "model_name": dataset.model_name,
        "file_name": dataset.file_path.name,
        "file_sha256": dataset.file_sha256,
        "reference_time_utc": dataset.reference_time_utc.isoformat(),
        "forecast_step_count": len(dataset.forecast_steps),
        "available_leads": sorted(list(dataset.forecast_steps.keys())),
        "target_grid": dataset.target_grid.grid_id,
        "provenance_class": dataset.provenance_class.value,
    }


MAX_NWP_UPLOAD_BYTES = 512 * 1024 * 1024  # 512 MB


@router.post("/upload")
async def upload_nwp_file(file: UploadFile = File(...)) -> dict[str, Any]:
    """Upload and ingest an authentic NCMRWF/IMD NetCDF4 (.nc) or GRIB2 (.grib2) file safely."""
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_FILENAME", "message": "Uploaded file must have a valid filename."}},
        )

    safe_name = Path(file.filename).name
    ext = Path(safe_name).suffix.lower()
    if ext not in ALLOWED_NWP_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "UNSUPPORTED_FILE_TYPE",
                    "message": f"Unsupported file extension '{ext}'. Allowed: {sorted(list(ALLOWED_NWP_EXTENSIONS))}",
                }
            },
        )

    raw_root = Path("data/raw").resolve()
    raw_root.mkdir(parents=True, exist_ok=True)
    target_path = (raw_root / safe_name).resolve()

    written = 0
    try:
        with open(target_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                written += len(chunk)
                if written > MAX_NWP_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail={"error": {"code": "FILE_TOO_LARGE", "message": f"Upload exceeds {MAX_NWP_UPLOAD_BYTES} bytes limit."}},
                    )
                buffer.write(chunk)
    except HTTPException:
        target_path.unlink(missing_ok=True)
        raise
    except Exception as exc:
        target_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "UPLOAD_WRITE_FAILED", "message": "Failed to write uploaded file."}},
        ) from exc

    engine = GLOBAL_REAL_NWP_ENGINE
    try:
        dataset = engine.ingest_file(target_path)
    except Exception as e:
        target_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "NWP_PARSE_ERROR", "message": "Failed to parse uploaded NWP dataset."}},
        ) from e

    return {
        "uploaded": True,
        "file_name": safe_name,
        "saved_path": str(target_path),
        "model_name": dataset.model_name,
        "file_sha256": dataset.file_sha256,
        "forecast_step_count": len(dataset.forecast_steps),
        "available_leads": sorted(list(dataset.forecast_steps.keys())),
    }


@router.get("/forecast/{lead_minutes}")
def get_nwp_forecast_field(lead_minutes: int) -> dict[str, Any]:
    """Retrieve 2D NWP precipitation field at specified lead minutes."""
    engine = GLOBAL_REAL_NWP_ENGINE
    dataset = engine._cached_dataset
    if dataset is None:
        raw_file = engine.discover_raw_file()
        if raw_file:
            try:
                dataset = engine.ingest_file(raw_file)
            except Exception:
                dataset = None

    if dataset is None:
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "REAL_NWP_DATA_UNAVAILABLE",
                    "message": "No validated real NCMRWF/IMD forecast dataset is currently loaded. Place authentic file in data/raw/ or upload via /api/v1/nwp/upload.",
                }
            },
        )

    step = dataset.get_step(lead_minutes)
    if step is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "LEAD_NOT_AVAILABLE", "message": f"Lead {lead_minutes}m not available"}},
        )

    return {
        "model_name": dataset.model_name,
        "lead_minutes": step.lead_minutes,
        "valid_time_utc": step.valid_time_utc.isoformat(),
        "units": step.units,
        "min_rate_mmh": step.min_rate_mmh,
        "max_rate_mmh": step.max_rate_mmh,
        "mean_rate_mmh": step.mean_rate_mmh,
        "grid_shape": [int(step.precip_rate_mmh.shape[0]), int(step.precip_rate_mmh.shape[1])],
        "file_sha256": dataset.file_sha256,
    }


@router.post("/blend")
def blend_nowcast_field(req: BlendRequest) -> dict[str, Any]:
    """Execute multi-sensor blending between Doppler radar and real NCMRWF NWP forecast."""
    engine = GLOBAL_REAL_NWP_ENGINE
    dataset = engine._cached_dataset
    if dataset is None:
        raw_file = engine.discover_raw_file()
        if raw_file:
            try:
                dataset = engine.ingest_file(raw_file)
            except Exception:
                dataset = None

    # Check for live observed radar observation from radar provider
    from apps.api.rainfall_api import get_provider
    radar_prov = get_provider("dwr-kolkata-v1")
    radar_obs = radar_prov.fetch_latest() if radar_prov else None

    is_observed_radar = (radar_obs is not None and radar_obs.rate_mmh is not None and getattr(radar_obs, "source_type", None) == "real")
    if is_observed_radar:
        radar_arr_src = radar_obs.rate_mmh
    else:
        # Synthetic fallback rendering for demonstration
        from services.rainfall.fields import render_interval
        interval_idx = max(0, req.lead_minutes // 15)
        radar_arr_src = render_interval((134, 134), "convective_cell", 35.0, interval_idx, seed=42)

    if dataset is not None:
        target_shape = (dataset.target_grid.height, dataset.target_grid.width)
        if radar_arr_src.shape != target_shape:
            from scipy.ndimage import zoom
            zoom_factors = (target_shape[0] / radar_arr_src.shape[0], target_shape[1] / radar_arr_src.shape[1])
            radar_arr = zoom(radar_arr_src, zoom_factors, order=1)
        else:
            radar_arr = radar_arr_src
    else:
        radar_arr = radar_arr_src

    blender = GLOBAL_MULTI_SENSOR_BLENDER
    res = blender.blend(radar_arr, dataset, req.lead_minutes)

    return {
        "lead_minutes": res.lead_minutes,
        "blending_mode": res.blending_mode.value,
        "weights": {
            "w_radar": res.weights.w_radar,
            "w_nwp": res.weights.w_nwp,
        },
        "radar_available": is_observed_radar,
        "nwp_available": res.nwp_available,
        "nwp_model_name": res.nwp_model_name,
        "nwp_sha256": res.nwp_sha256,
        "statistics": {
            "min_rate_mmh": res.min_rate_mmh,
            "max_rate_mmh": res.max_rate_mmh,
            "mean_rate_mmh": res.mean_rate_mmh,
        },
        "grid_shape": [int(res.blended_matrix.shape[0]), int(res.blended_matrix.shape[1])],
        "provenance_class": res.provenance_class.value if is_observed_radar else ("SYNTHETIC_RADAR_FALLBACK" if not res.nwp_available else ProvenanceClass.EXTERNAL_FORECAST.value),
    }
