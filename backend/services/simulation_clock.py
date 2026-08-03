# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import os
from datetime import datetime, timezone

# Load from environment or use sensible defaults (14 days compressed into 10 minutes is a 2016x ratio)
_sim_start_str = os.getenv("SIMULATION_START_TIME")
if _sim_start_str:
    try:
        # Expected ISO format (e.g. 2026-07-01T00:00:00+00:00)
        _sim_start = datetime.fromisoformat(_sim_start_str)
    except ValueError:
        _sim_start = datetime(2026, 7, 1, 0, 0, 0, tzinfo=timezone.utc)
else:
    _sim_start = datetime(2026, 7, 1, 0, 0, 0, tzinfo=timezone.utc)

_compression_str = os.getenv("SIMULATION_COMPRESSION_RATIO")
# 14 days in simulated time (1,209,600 seconds) in 10 minutes (600 seconds) = 2016.0
_compression = float(_compression_str) if _compression_str else 2016.0


class SimulationClock:
    """A virtual compressed clock for driving simulation-based rule evaluation and time models.

    Maps real elapsed wall-clock time onto a faster, virtual simulation timeline.
    """

    def __init__(self, sim_start: datetime, compression: float):
        self._sim_start = sim_start
        self._compression = compression
        self._wall_start = datetime.now(timezone.utc)

    def now(self) -> datetime:
        """Returns the current simulated time."""
        elapsed = datetime.now(timezone.utc) - self._wall_start
        return self._sim_start + elapsed * self._compression

    def to_sim_time(self, wall_time: datetime) -> datetime:
        """Converts an arbitrary wall-clock time to its simulated counterpart."""
        elapsed = wall_time - self._wall_start
        return self._sim_start + elapsed * self._compression

    def to_wall_time(self, sim_time: datetime) -> datetime:
        """Converts an arbitrary simulated time back to real wall-clock time."""
        elapsed_sim = sim_time - self._sim_start
        return self._wall_start + elapsed_sim / self._compression

    @property
    def sim_start(self) -> datetime:
        return self._sim_start

    @property
    def compression(self) -> float:
        return self._compression


# Global singleton clock
simulation_clock = SimulationClock(_sim_start, _compression)
