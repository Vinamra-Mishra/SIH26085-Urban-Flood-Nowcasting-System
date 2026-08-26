"""Phase F — Nature-Based Solutions (NbS) & Urban Mitigation API.

FastAPI endpoints for:
- Listing preset green/grey mitigation strategies
- Running dynamic non-mutating counterfactual simulations
- Exporting spatial depth difference fields
"""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from services.mitigation.engine import (
    GLOBAL_MITIGATION_ENGINE,
    InterventionConfig,
)
from services.mitigation.evaluator import (
    MITIGATION_STRATEGIES,
    MitigationStrategyPreset,
)

router = APIRouter(prefix="/api/v1/mitigation", tags=["Mitigation & Sponge City"])


class SimulateMitigationRequest(BaseModel):
    scenario_id: str = Field(default="S4", description="Base scenario identifier (S1..S4)")
    lead_minutes: int = Field(default=110, ge=0, le=180, description="Lead time snapshot to mitigate")
    lid_permeable_fraction: float = Field(default=0.0, ge=0.0, le=0.50, description="Permeable pavement / green roof coverage (0.0 to 0.50)")
    detention_basin_m3: float = Field(default=0.0, ge=0.0, le=100000.0, description="Detention basin volume in m³")
    emergency_pump_m3s: float = Field(default=0.0, ge=0.0, le=10.0, description="Dewatering pump rate in m³/s")
    unblock_culvert_in004: bool = Field(default=False, description="Desilt and unblock Culvert IN-004")
    include_raster: bool = Field(default=False, description="Whether to include the full 2D mitigated depth grid")


@router.get("/strategies")
def list_strategies() -> dict[str, Any]:
    """List available standard green and grey flood mitigation strategies."""
    return {
        "count": len(MITIGATION_STRATEGIES),
        "strategies": [s.to_dict() for s in MITIGATION_STRATEGIES.values()],
        "provenance": {
            "classification": "MITIGATION_STRATEGY_CATALOG",
            "model": "NbS / Low-Impact Development (LID) + Grey Hydraulic Drainage",
        },
    }


@router.post("/simulate")
def simulate_mitigation(req: SimulateMitigationRequest) -> dict[str, Any]:
    """Execute dynamic counterfactual flood mitigation simulation on a baseline scenario."""
    config = InterventionConfig(
        scenario_id=req.scenario_id,
        lead_minutes=req.lead_minutes,
        lid_permeable_fraction=req.lid_permeable_fraction,
        detention_basin_m3=req.detention_basin_m3,
        emergency_pump_m3s=req.emergency_pump_m3s,
        unblock_culvert_in004=req.unblock_culvert_in004,
    )

    engine = GLOBAL_MITIGATION_ENGINE
    res = engine.simulate(config, return_raster=req.include_raster)
    return res.to_dict(include_raster=req.include_raster)


@router.get("/strategies/{strategy_id}/simulate")
def simulate_preset_strategy(
    strategy_id: str,
    scenario_id: Optional[str] = Query(default=None),
    lead_minutes: Optional[int] = Query(default=None),
    include_raster: bool = Query(default=False),
) -> dict[str, Any]:
    """Simulate a predefined mitigation strategy preset."""
    clean_id = strategy_id.lower()
    if clean_id not in MITIGATION_STRATEGIES:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "STRATEGY_NOT_FOUND", "message": f"Strategy {strategy_id!r} not found", "available": list(MITIGATION_STRATEGIES.keys())}},
        )

    preset = MITIGATION_STRATEGIES[clean_id]
    cfg = preset.config
    config = InterventionConfig(
        scenario_id=scenario_id or cfg.scenario_id,
        lead_minutes=lead_minutes if lead_minutes is not None else cfg.lead_minutes,
        lid_permeable_fraction=cfg.lid_permeable_fraction,
        detention_basin_m3=cfg.detention_basin_m3,
        emergency_pump_m3s=cfg.emergency_pump_m3s,
        unblock_culvert_in004=cfg.unblock_culvert_in004,
    )

    engine = GLOBAL_MITIGATION_ENGINE
    res = engine.simulate(config, return_raster=include_raster)
    return {
        "preset_strategy": preset.name,
        "category": preset.category,
        "description": preset.description,
        **res.to_dict(include_raster=include_raster),
    }
