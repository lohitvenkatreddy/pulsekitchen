from fastapi import FastAPI
from sqlalchemy import text
from .database import engine
from . import models

models.Base.metadata.create_all(bind=engine)
with engine.begin() as conn:
    conn.execute(text("ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT"))

app = FastAPI(title="Restaurant Service", version="1.0.0")

from . import routes, partner_routes

app.include_router(routes.router)
app.include_router(partner_routes.router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "restaurant-service"}
