from fastapi import FastAPI
from .database import engine
from . import address_models, models, settings_models, support_models  # noqa: F401

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="User Service", version="1.0.0")

from . import routes, address_routes, support_routes

app.include_router(routes.router)
app.include_router(address_routes.router)
app.include_router(support_routes.router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "user-service"}
