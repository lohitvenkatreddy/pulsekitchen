from fastapi import FastAPI
from sqlalchemy import text
from .database import engine
from . import models

models.Base.metadata.create_all(bind=engine)

with engine.begin() as connection:
    connection.execute(text("ALTER TABLE payments ALTER COLUMN currency SET DEFAULT 'INR'"))
    connection.execute(text("UPDATE payments SET currency = 'INR' WHERE currency = 'USD'"))

app = FastAPI(title="Payment Service", version="1.0.0")

from . import routes

app.include_router(routes.router)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "payment-service"}
