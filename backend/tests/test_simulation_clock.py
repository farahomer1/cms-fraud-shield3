# Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import time
from datetime import datetime, timezone, timedelta
from services.simulation_clock import SimulationClock


def test_simulation_clock_progression():
    # Arrange
    sim_start = datetime(2026, 7, 1, 0, 0, 0, tzinfo=timezone.utc)
    compression = 1000.0  # 1 second wall-clock = 1000 seconds sim-clock
    clock = SimulationClock(sim_start, compression)

    # Act
    time_1 = clock.now()
    time.sleep(0.05)
    time_2 = clock.now()

    # Assert
    assert time_1 >= sim_start
    assert time_2 > time_1
    # Check that sim time advanced substantially faster than real time
    elapsed_sim = time_2 - time_1
    assert elapsed_sim > timedelta(seconds=10)


def test_simulation_clock_conversions():
    # Arrange
    sim_start = datetime(2026, 7, 1, 0, 0, 0, tzinfo=timezone.utc)
    compression = 2016.0
    clock = SimulationClock(sim_start, compression)

    # Act
    wall_now = datetime.now(timezone.utc)
    sim_now = clock.to_sim_time(wall_now)
    wall_back = clock.to_wall_time(sim_now)

    # Assert
    assert abs((wall_back - wall_now).total_seconds()) < 0.01
