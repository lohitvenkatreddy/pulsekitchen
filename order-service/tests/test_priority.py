from datetime import datetime, timedelta
from pathlib import Path
import importlib.util
import sys
import types

app_dir = Path(__file__).resolve().parents[1] / "app"
package_name = "order_test_app"
package = types.ModuleType(package_name)
package.__path__ = [str(app_dir)]
sys.modules[package_name] = package

config_spec = importlib.util.spec_from_file_location(f"{package_name}.config", app_dir / "config.py")
config_module = importlib.util.module_from_spec(config_spec)
assert config_spec.loader is not None
sys.modules[f"{package_name}.config"] = config_module
config_spec.loader.exec_module(config_module)

priority_spec = importlib.util.spec_from_file_location(f"{package_name}.priority", app_dir / "priority.py")
priority_module = importlib.util.module_from_spec(priority_spec)
assert priority_spec.loader is not None
sys.modules[f"{package_name}.priority"] = priority_module
priority_spec.loader.exec_module(priority_module)

calculate_priority_score = priority_module.calculate_priority_score
get_priority_level = priority_module.get_priority_level


def test_priority_score_increases_for_hospital_vip_orders():
    regular = calculate_priority_score(
        {
            "is_vip": False,
            "user_type": "regular",
            "order_type": "normal",
            "item_count": 2,
            "pickup_location": {"latitude": 12.97, "longitude": 77.59},
            "dropoff_location": {"latitude": 12.98, "longitude": 77.6},
            "placed_at": datetime.now() - timedelta(minutes=5),
        }
    )
    critical = calculate_priority_score(
        {
            "is_vip": True,
            "user_type": "hospital",
            "order_type": "express",
            "item_count": 2,
            "pickup_location": {"latitude": 12.97, "longitude": 77.59},
            "dropoff_location": {"latitude": 12.98, "longitude": 77.6},
            "placed_at": datetime.now() - timedelta(minutes=5),
        }
    )

    assert critical["priority_score"] > regular["priority_score"]
    assert get_priority_level(critical["priority_score"]) in {"high", "critical"}


def test_waiting_time_prevents_starvation():
    fresh = calculate_priority_score(
        {
            "is_vip": False,
            "user_type": "regular",
            "order_type": "normal",
            "item_count": 1,
            "pickup_location": {"latitude": 12.97, "longitude": 77.59},
            "dropoff_location": {"latitude": 12.98, "longitude": 77.6},
            "placed_at": datetime.now(),
        }
    )
    old = calculate_priority_score(
        {
            "is_vip": False,
            "user_type": "regular",
            "order_type": "normal",
            "item_count": 1,
            "pickup_location": {"latitude": 12.97, "longitude": 77.59},
            "dropoff_location": {"latitude": 12.98, "longitude": 77.6},
            "placed_at": datetime.now() - timedelta(minutes=45),
        }
    )

    assert old["waiting_time_score"] > fresh["waiting_time_score"]
