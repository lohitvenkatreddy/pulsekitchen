from pathlib import Path
import importlib.util
import sys
import types


app_dir = Path(__file__).resolve().parents[1] / "app"
package_name = "order_student_verification_test_app"
package = types.ModuleType(package_name)
package.__path__ = [str(app_dir)]
sys.modules[package_name] = package

verification_spec = importlib.util.spec_from_file_location(
    f"{package_name}.student_verification",
    app_dir / "student_verification.py",
)
verification_module = importlib.util.module_from_spec(verification_spec)
assert verification_spec.loader is not None
sys.modules[f"{package_name}.student_verification"] = verification_module
verification_spec.loader.exec_module(verification_module)


def test_issued_student_verification_is_user_scoped():
    verification_id = verification_module.issue_verification(user_id=10, score=0.8)

    assert verification_module.is_valid_verification(10, verification_id) is True
    assert verification_module.is_valid_verification(11, verification_id) is False
    assert verification_module.is_valid_verification(10, "missing") is False
