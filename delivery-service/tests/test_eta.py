from pathlib import Path
import importlib.util
import sys
import types

app_dir = Path(__file__).resolve().parents[1] / "app"
package_name = "delivery_test_app"
package = types.ModuleType(package_name)
package.__path__ = [str(app_dir)]
sys.modules[package_name] = package

config_spec = importlib.util.spec_from_file_location(f"{package_name}.config", app_dir / "config.py")
config_module = importlib.util.module_from_spec(config_spec)
assert config_spec.loader is not None
sys.modules[f"{package_name}.config"] = config_module
config_spec.loader.exec_module(config_module)

eta_spec = importlib.util.spec_from_file_location(f"{package_name}.eta", app_dir / "eta.py")
eta_module = importlib.util.module_from_spec(eta_spec)
assert eta_spec.loader is not None
sys.modules[f"{package_name}.eta"] = eta_module
eta_spec.loader.exec_module(eta_module)

calculate_eta = eta_module.calculate_eta
calculate_priority_eta = eta_module.calculate_priority_eta


def test_priority_eta_reduces_for_critical_orders():
    base_eta = 40
    assert calculate_priority_eta(base_eta, "critical") < calculate_priority_eta(base_eta, "normal")


def test_calculate_eta_returns_expected_shape():
    payload = calculate_eta(
        pickup_location={"latitude": 12.9716, "longitude": 77.5946},
        dropoff_location={"latitude": 12.9352, "longitude": 77.6245},
        partner_location={"latitude": 12.9611, "longitude": 77.6387},
    )

    assert payload["eta_minutes"] > 0
    assert payload["distance_km"] > 0
    assert "breakdown" in payload
