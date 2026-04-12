from fastapi import FastAPI
from .database import engine
from . import models, address_models  # noqa: F401 — ensure user_addresses table exists

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="User Service", version="1.0.0")

from . import routes, address_routes

app.include_router(routes.router)
app.include_router(address_routes.router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "user-service"}
