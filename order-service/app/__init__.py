from fastapi import FastAPI
from sqlalchemy import text
from .database import engine
from . import models

models.Base.metadata.create_all(bind=engine)

with engine.begin() as connection:
    connection.execute(
        text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) DEFAULT 'normal'")
    )

app = FastAPI(title="Order Service", version="1.0.0")

from . import routes

app.include_router(routes.router)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "order-service"}
