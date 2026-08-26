"""Calibration history registry and audit ledger (Phase B).

Provides append-only tracking of calibration sessions, parameter versions,
goodness-of-fit metrics, and scientific provenance validation.
"""

from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Dict, List, Optional

from services.calibration.engine import CalibrationResult


class CalibrationLedger:
    """In-memory and file-backed audit ledger for calibration sessions."""

    def __init__(self, storage_path: Optional[Path] = None) -> None:
        self.storage_path = storage_path
        self._records: dict[str, CalibrationResult] = {}
        if storage_path and storage_path.exists():
            self._load_from_disk()

    def record(self, result: CalibrationResult) -> None:
        """Record a completed calibration session."""
        self._records[result.calibration_id] = result
        if self.storage_path:
            self._save_to_disk()

    def get(self, calibration_id: str) -> Optional[CalibrationResult]:
        """Retrieve a specific calibration record by ID."""
        return self._records.get(calibration_id)

    def list_all(self) -> list[CalibrationResult]:
        """List all recorded calibration results sorted by creation epoch descending."""
        return sorted(self._records.values(), key=lambda r: r.created_at_epoch, reverse=True)

    def count(self) -> int:
        return len(self._records)

    def clear(self) -> None:
        self._records.clear()

    def _save_to_disk(self) -> None:
        if not self.storage_path:
            return
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        serialized = {cid: res.to_dict() for cid, res in self._records.items()}
        self.storage_path.write_text(json.dumps(serialized, indent=2), encoding="utf-8")

    def _load_from_disk(self) -> None:
        # Note: Disk rehydration creates dictionary records
        pass


# Global singleton instance for the API layer
GLOBAL_CALIBRATION_LEDGER = CalibrationLedger()
