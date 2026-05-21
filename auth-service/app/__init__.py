from fastapi import FastAPI
from sqlalchemy import text
from .database import engine
from . import models

models.Base.metadata.create_all(bind=engine)
with engine.begin() as conn:
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'approved'"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by_user_id INTEGER"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE"))
    conn.execute(text("UPDATE users SET approval_status = 'approved' WHERE approval_status IS NULL"))

app = FastAPI(title="Auth Service", version="1.0.0")

from . import routes

app.include_router(routes.router)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "auth-service"}
