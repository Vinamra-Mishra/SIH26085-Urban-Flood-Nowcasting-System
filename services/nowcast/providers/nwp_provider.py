"""Phase D — Real NWP Rainfall Provider.

Implements the RainfallProvider interface for authentic NCMRWF/IMD
Numerical Weather Prediction rasters.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

import numpy as np

from services.ingestion.grib_netcdf import (
    GLOBAL_REAL_NWP_ENGINE,
    RealNWPDataset,
    RealNWPIngestionEngine,
    get_authoritative_bagjola_grid,
)
from services.nowcast.providers import (
    ProviderHealth,
    ProviderStatus,
    RainfallObservation,
    RainfallProvider,
    SourceType,
)


class RealNWPRainfallProvider(RainfallProvider):
    """Rainfall provider backed by authentic NCMRWF/IMD NWP forecasts."""

    def __init__(
        self,
        *,
        provider_id: str = "ncmrwf-ncum-provider",
        source_name: str = "NCMRWF Regional Unified Model",
        source_type: SourceType = SourceType.REAL,
        ingestion_engine: RealNWPIngestionEngine | None = None,
    ) -> None:
        self._provider_id = provider_id
        self._source_name = source_name
        self._source_type = source_type
        self._engine = ingestion_engine or GLOBAL_REAL_NWP_ENGINE
        self._target_grid = self._engine.target_grid
        self._dataset: RealNWPDataset | None = None

        # Check if raw file exists
        discovered = self._engine.discover_raw_file()
        if discovered:
            try:
                self._dataset = self._engine.ingest_file(discovered)
            except Exception:
                self._dataset = None

    @property
    def provider_id(self) -> str:
        return self._provider_id

    @property
    def source_name(self) -> str:
        return self._source_name

    @property
    def source_type(self) -> SourceType:
        return self._source_type

    @property
    def dataset(self) -> RealNWPDataset | None:
        return self._dataset

    def status(self) -> ProviderStatus:
        has_data = self._dataset is not None and bool(self._dataset.forecast_steps)
        return ProviderStatus(
            provider_id=self._provider_id,
            source_name=self._source_name,
            source_type=self._source_type,
            health=ProviderHealth.ONLINE if has_data else ProviderHealth.OFFLINE,
            frame_count=len(self._dataset.forecast_steps) if self._dataset else 0,
            latest_observation_time=self._dataset.reference_time_utc if self._dataset else None,
            spatial_reference=self._target_grid.crs_wkt_or_epsg,
            spatial_resolution_m=self._target_grid.cell_size_m,
            grid_shape=(self._target_grid.height, self._target_grid.width),
            metadata={
                "model_name": self._dataset.model_name if self._dataset else None,
                "file_sha256": self._dataset.file_sha256 if self._dataset else None,
                "provenance": self._dataset.source_provenance.to_dict() if self._dataset else None,
            },
        )

    def get_forecast_grid(self, lead_minutes: int) -> np.ndarray | None:
        """Retrieve 2D precipitation matrix at lead time t."""
        if self._dataset is None:
            return None
        step = self._dataset.get_step(lead_minutes)
        if step is None:
            return None
        return step.precip_rate_mmh


GLOBAL_REAL_NWP_PROVIDER = RealNWPRainfallProvider()
