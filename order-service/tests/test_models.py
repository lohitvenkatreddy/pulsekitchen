from pathlib import Path
import importlib.util
import sys
import types

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

app_dir = Path(__file__).resolve().parents[1] / "app"
package_name = "order_model_test_app"
package = types.ModuleType(package_name)
package.__path__ = [str(app_dir)]
sys.modules[package_name] = package

database_module = types.ModuleType(f"{package_name}.database")
database_module.Base = declarative_base()
sys.modules[f"{package_name}.database"] = database_module

models_spec = importlib.util.spec_from_file_location(
    f"{package_name}.models",
    app_dir / "models.py",
)
models_module = importlib.util.module_from_spec(models_spec)
assert models_spec.loader is not None
sys.modules[f"{package_name}.models"] = models_module
models_spec.loader.exec_module(models_module)

models = models_module


def test_order_enum_columns_read_existing_database_values():
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(bind=engine)

    with engine.begin() as connection:
        connection.execute(text("INSERT INTO users (id) VALUES (1)"))
        connection.execute(
            text(
                """
                INSERT INTO restaurants (id, name, address)
                VALUES (1, 'Pizza Palace', '123 Main St')
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO orders (
                    id,
                    user_id,
                    restaurant_id,
                    items,
                    total_amount,
                    delivery_address,
                    priority_level,
                    status
                )
                VALUES (
                    1,
                    1,
                    1,
                    '[]',
                    12.99,
                    '{}',
                    'HIGH',
                    'out_for_delivery'
                )
                """
            )
        )

    Session = sessionmaker(bind=engine)
    with Session() as session:
        order = session.query(models.Order).first()

    assert order.priority_level == models.PriorityLevel.HIGH
    assert order.status == models.OrderStatus.OUT_FOR_DELIVERY
