"""Phase G — Multi-Modal Vehicle & Mobility Profiles for Evacuation Routing.

Defines vehicle-specific flood depth tolerance, speed degradation curves, and passability policies.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class VehicleProfile:
    profile_id: str
    name: str
    icon: str
    max_depth_m: float           # Critical flood depth threshold beyond which link is IMPASSABLE
    base_speed_kmh: float        # Free-flow dry travel speed in km/h
    min_speed_factor: float      # Minimum crawling speed factor in wet conditions (e.g. 0.20)
    description: str

    def effective_speed_kmh(self, depth_m: float) -> float:
        """Compute degradation of travel speed as water depth increases up to max_depth_m."""
        if depth_m <= 0.01:
            return self.base_speed_kmh
        if depth_m > self.max_depth_m:
            return 0.0  # Impassable
        # Linear degradation from 1.0 down to min_speed_factor at max_depth_m
        fraction = depth_m / self.max_depth_m
        factor = max(self.min_speed_factor, 1.0 - (1.0 - self.min_speed_factor) * fraction)
        return self.base_speed_kmh * factor

    def is_passable(self, depth_m: float) -> bool:
        """Check if vehicle can safely traverse a road with the given water depth."""
        return depth_m <= self.max_depth_m

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Standard Multi-Modal Vehicle Fleet Catalog
# ---------------------------------------------------------------------------

VEHICLE_PROFILES: dict[str, VehicleProfile] = {
    "AMBULANCE": VehicleProfile(
        profile_id="AMBULANCE",
        name="Emergency Ambulance",
        icon="🚑",
        max_depth_m=0.20,
        base_speed_kmh=45.0,
        min_speed_factor=0.30,
        description="High-priority medical transport. Can traverse water up to 20 cm with moderate speed reduction.",
    ),
    "HEAVY_RESCUE": VehicleProfile(
        profile_id="HEAVY_RESCUE",
        name="NDRF / Fire Rescue Truck",
        icon="🚒",
        max_depth_m=0.45,
        base_speed_kmh=30.0,
        min_speed_factor=0.25,
        description="Heavy 4x4 high-clearance emergency rescue vehicle. Capable of traversing severe floodwaters up to 45 cm.",
    ),
    "LIGHT_VEHICLE": VehicleProfile(
        profile_id="LIGHT_VEHICLE",
        name="Civilian Light Vehicle / Car",
        icon="🚗",
        max_depth_m=0.10,
        base_speed_kmh=50.0,
        min_speed_factor=0.20,
        description="Standard passenger cars and auto-rickshaws. Highly vulnerable; impassable when water depth exceeds 10 cm.",
    ),
    "PEDESTRIAN": VehicleProfile(
        profile_id="PEDESTRIAN",
        name="Pedestrian Evacuee",
        icon="🚶",
        max_depth_m=0.05,
        base_speed_kmh=4.5,
        min_speed_factor=0.40,
        description="Walking evacuation on foot. Strict safety limit of 5 cm to avoid open manhole and swift-water hazards.",
    ),
}


def get_profile(profile_id: str) -> VehicleProfile:
    """Lookup vehicle profile by ID (case-insensitive) with default fallback to LIGHT_VEHICLE."""
    clean_id = (profile_id or "LIGHT_VEHICLE").upper()
    return VEHICLE_PROFILES.get(clean_id, VEHICLE_PROFILES["LIGHT_VEHICLE"])
