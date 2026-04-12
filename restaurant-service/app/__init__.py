from fastapi import FastAPI
from .database import engine
from . import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Restaurant Service", version="1.0.0")

from . import routes, partner_routes

app.include_router(routes.router)
app.include_router(partner_routes.router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "restaurant-service"}
