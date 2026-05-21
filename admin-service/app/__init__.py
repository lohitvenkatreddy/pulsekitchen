from fastapi import FastAPI
from sqlalchemy import text
from . import routes, models
from .database import Base, engine


# Ensure admin-owned tables such as audit_logs exist before serving requests.
Base.metadata.create_all(bind=engine)
with engine.begin() as conn:
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'approved'"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by_user_id INTEGER"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE"))
    conn.execute(text("UPDATE users SET approval_status = 'approved' WHERE approval_status IS NULL"))

app = FastAPI(title="Admin Service", version="1.0.0")
app.include_router(routes.router)


@app.get("/health")
def health():
    return {"status": "healthy", "service": "admin-service"}
