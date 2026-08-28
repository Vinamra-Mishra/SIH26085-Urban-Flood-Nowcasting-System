import sys
import os
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

@pytest.fixture(autouse=True)
def reset_active_city_for_tests():
    """Ensure every test runs with clean DEMO fixture baseline."""
    os.environ["UFNS_ACTIVE_CITY"] = "DEMO"
    from services.contracts import set_active_city
    from apps.api import city_api, impacts
    set_active_city("DEMO")
    city_api.ACTIVE_CITY = "DEMO"
    impacts.clear_caches()
    yield
    os.environ["UFNS_ACTIVE_CITY"] = "DEMO"
    set_active_city("DEMO")
    city_api.ACTIVE_CITY = "DEMO"
    impacts.clear_caches()
