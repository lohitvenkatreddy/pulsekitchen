from fastapi import FastAPI
from . import routes, models
from .database import Base, engine


# Ensure admin-owned tables such as audit_logs exist before serving requests.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Admin Service", version="1.0.0")
app.include_router(routes.router)


@app.get("/health")
def health():
    return {"status": "healthy", "service": "admin-service"}
