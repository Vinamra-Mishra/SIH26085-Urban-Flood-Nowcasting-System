"""M9 — Nowcast → flood-impact projection pipeline.

This package connects the M8 rainfall observation/nowcast layer to the
existing M4 flood engine and M7 road-impact/routing stack.

Scope:
  observation -> nowcast -> forecast rainfall frames -> M4 flood projection
  -> M7 road impact -> M7 routing -> API/dashboard integration.

Claim boundary:
  - persistence-based flood impact projection only
  - NOT_REAL_TIME demonstration (providers remain SYNTHETIC/FIXTURE)
  - NOT_VALIDATED_FORECAST (no forecast skill is claimed)
  - B13 remains PROVISIONAL DEMONSTRATION
"""

MODEL_VERSION = "m9-nowcast-impact-v1"
PROJECTION_METHOD = "PERSISTENCE_IMPACT_PROJECTION_V1"
VALID_LEADS = (0, 15, 30, 45, 60)
VALID_LEADS_3H = (0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180)
RAINFALL_INTERVAL_MINUTES = 15
