"""Phase J — Civil Engineering Cost Models & Avoided Loss Valuation.

Standard civic schedule of rates (Indian Municipal / CPWD norms) for nature-based
and grey drainage interventions, along with empirical damage avoidance functions.
"""

from __future__ import annotations

from typing import Any

# Standard Civic Unit Rates (INR)
CIVIL_COST_RATES: dict[str, float] = {
    "lid_permeable_pavement_inr_per_m2": 1800.0,
    "detention_basin_inr_per_m3": 450.0,
    "mobile_pump_inr_per_m3s": 2500000.0,
    "desilt_culvert_in004_inr": 1500000.0,
    "catchment_impervious_area_m2": 100000.0,  # 100,000 m2 (10 hectares) municipal public paved surface
}

# Empirical Municipal Avoided Loss Valuation Rates (INR)
DAMAGE_VALUATION_RATES: dict[str, float] = {
    "inundated_area_damage_inr_per_m2": 1200.0,
    "flood_volume_damage_inr_per_m3": 180.0,
    "road_closure_loss_inr_per_corridor": 2500000.0,
    "critical_asset_protection_inr": 5000000.0,
}


def calculate_intervention_cost(
    lid_permeable_fraction: float = 0.0,
    detention_basin_m3: float = 0.0,
    emergency_pump_m3s: float = 0.0,
    unblock_culvert_in004: bool = False,
) -> dict[str, Any]:
    """Calculate itemized capital expenditure (CAPEX) for a proposed drainage intervention."""
    lid_area = lid_permeable_fraction * CIVIL_COST_RATES["catchment_impervious_area_m2"]
    lid_cost = lid_area * CIVIL_COST_RATES["lid_permeable_pavement_inr_per_m2"]
    basin_cost = detention_basin_m3 * CIVIL_COST_RATES["detention_basin_inr_per_m3"]
    pump_cost = emergency_pump_m3s * CIVIL_COST_RATES["mobile_pump_inr_per_m3s"]
    desilt_cost = CIVIL_COST_RATES["desilt_culvert_in004_inr"] if unblock_culvert_in004 else 0.0

    total_capex_inr = lid_cost + basin_cost + pump_cost + desilt_cost

    return {
        "lid_cost_inr": round(lid_cost, 2),
        "basin_cost_inr": round(basin_cost, 2),
        "pump_cost_inr": round(pump_cost, 2),
        "desilt_cost_inr": round(desilt_cost, 2),
        "total_capex_inr": round(total_capex_inr, 2),
        "total_capex_crores": round(total_capex_inr / 1e7, 3),
    }


def calculate_damage_valuation(
    area_reduction_m2: float = 0.0,
    volume_reduction_m3: float = 0.0,
    reopened_roads_count: int = 0,
    protected_assets_count: int = 0,
) -> dict[str, Any]:
    """Calculate economic value of avoided direct flood losses and civic disruptions."""
    area_benefit = area_reduction_m2 * DAMAGE_VALUATION_RATES["inundated_area_damage_inr_per_m2"]
    volume_benefit = volume_reduction_m3 * DAMAGE_VALUATION_RATES["flood_volume_damage_inr_per_m3"]
    transport_benefit = reopened_roads_count * DAMAGE_VALUATION_RATES["road_closure_loss_inr_per_corridor"]
    asset_benefit = protected_assets_count * DAMAGE_VALUATION_RATES["critical_asset_protection_inr"]

    total_benefit_inr = area_benefit + volume_benefit + transport_benefit + asset_benefit

    return {
        "avoided_property_damage_inr": round(area_benefit, 2),
        "avoided_sewage_volume_damage_inr": round(volume_benefit, 2),
        "avoided_traffic_disruption_inr": round(transport_benefit, 2),
        "avoided_critical_asset_damage_inr": round(asset_benefit, 2),
        "total_avoided_losses_inr": round(total_benefit_inr, 2),
        "total_avoided_losses_crores": round(total_benefit_inr / 1e7, 3),
    }
