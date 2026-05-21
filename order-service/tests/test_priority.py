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


def test_mobile_priority_options_increase_score_in_expected_order():
    class FixedDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            return cls(2026, 1, 15, 10, 0, 0, tzinfo=tz)

    original_datetime = priority_module.datetime
    priority_module.datetime = FixedDatetime

    base_order = {
        "is_vip": False,
        "user_type": "regular",
        "item_count": 2,
        "pickup_location": None,
        "dropoff_location": None,
        "placed_at": FixedDatetime.now(),
    }

    try:
        normal = calculate_priority_score({**base_order, "order_type": "normal"})
        student = calculate_priority_score({**base_order, "order_type": "student_urgent"})
        travel = calculate_priority_score({**base_order, "order_type": "travel_emergency"})
        vip = calculate_priority_score(
            {**base_order, "order_type": "vip", "is_vip": True}
        )
        hospital = calculate_priority_score(
            {
                **base_order,
                "order_type": "hospital_emergency",
                "user_type": "hospital",
            }
        )

        assert normal["priority_score"] < student["priority_score"] < travel["priority_score"]
        assert travel["priority_score"] < vip["priority_score"] < hospital["priority_score"]
        assert get_priority_level(normal["priority_score"]) == "low"
        assert get_priority_level(student["priority_score"]) == "normal"
        assert get_priority_level(travel["priority_score"]) == "high"
        assert get_priority_level(vip["priority_score"]) == "high"
        assert get_priority_level(hospital["priority_score"]) == "critical"
    finally:
        priority_module.datetime = original_datetime
