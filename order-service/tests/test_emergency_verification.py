from pathlib import Path
import importlib.util
import sys
import types


app_dir = Path(__file__).resolve().parents[1] / "app"
package_name = "order_emergency_verification_test_app"
package = types.ModuleType(package_name)
package.__path__ = [str(app_dir)]
sys.modules[package_name] = package

verification_spec = importlib.util.spec_from_file_location(
    f"{package_name}.emergency_verification",
    app_dir / "emergency_verification.py",
)
verification_module = importlib.util.module_from_spec(verification_spec)
assert verification_spec.loader is not None
sys.modules[f"{package_name}.emergency_verification"] = verification_module
verification_spec.loader.exec_module(verification_module)


def test_emergency_verification_token_is_user_and_type_scoped():
    verification_id = verification_module.issue_verification(
        user_id=10,
        emergency_type="travel",
        result={"decision": "APPROVED"},
    )

    assert verification_module.is_valid_verification(10, "travel_emergency", verification_id) is True
    assert verification_module.is_valid_verification(10, "hospital_emergency", verification_id) is False
    assert verification_module.is_valid_verification(11, "travel_emergency", verification_id) is False


def test_normalize_result_maps_pending_review():
    result = verification_module._normalize_result(
        {
            "approved": None,
            "confidence": "low",
            "fail_reasons": ["Image is blurry"],
            "summary": "Cannot verify confidently",
        }
    )

    assert result["decision"] == "MANUAL_REVIEW"
    assert result["approved"] is None
    assert result["fail_reasons"] == ["Image is blurry"]


def test_offline_demo_result_is_approved():
    result = verification_module._offline_demo_result("travel")

    assert result["decision"] == "APPROVED"
    assert result["approved"] is True
    assert result["verification_mode"] == "offline"
