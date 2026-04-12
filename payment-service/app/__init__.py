from fastapi import FastAPI
from .database import engine
from . import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Payment Service", version="1.0.0")

from . import routes

app.include_router(routes.router)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "payment-service"}
