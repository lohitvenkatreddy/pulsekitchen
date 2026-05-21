import os
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import httpx

app = FastAPI(title="API Gateway", version="1.0.0")
STATIC_DIR = Path(__file__).resolve().parent / "static"


def _csv_env(name: str, default: str) -> list[str]:
    raw_value = os.getenv(name, default)
    return [item.strip() for item in raw_value.split(",") if item.strip()]


def _service_url(name: str, default: str) -> str:
    return os.getenv(name, default).rstrip("/")


cors_origins = _csv_env("CORS_ORIGINS", "*")
allow_all_origins = cors_origins == ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else cors_origins,
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upstream microservices default to Docker hostnames locally and can be
# overridden in Render using environment variables.
SERVICES = {
    "auth": _service_url("AUTH_SERVICE_URL", "http://auth-service:8000"),
    "user": _service_url("USER_SERVICE_URL", "http://user-service:8000"),
    "restaurant": _service_url("RESTAURANT_SERVICE_URL", "http://restaurant-service:8000"),
    "order": _service_url("ORDER_SERVICE_URL", "http://order-service:8000"),
    "delivery": _service_url("DELIVERY_SERVICE_URL", "http://delivery-service:8000"),
    "payment": _service_url("PAYMENT_SERVICE_URL", "http://payment-service:8000"),
    "notification": _service_url("NOTIFICATION_SERVICE_URL", "http://notification-service:8000"),
    "admin": _service_url("ADMIN_SERVICE_URL", "http://admin-service:8000"),
}

# First path segment after /api/v1/
SERVICE_PREFIX_MAP = {
    "auth": "auth",
    "users": "user",
    "restaurants": "restaurant",
    "orders": "order",
    "delivery": "delivery",
    "payment": "payment",
    "notifications": "notification",
    "admin": "admin",
    "support": "user",
}

HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "host",
}


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "api-gateway"}


@app.get("/")
def root():
    return FileResponse(STATIC_DIR / "landing.html")


@app.api_route(
    "/api/v1/{full_path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
)
async def proxy_to_service(request: Request, full_path: str):
    prefix = full_path.split("/", 1)[0]
    service_key = SERVICE_PREFIX_MAP.get(prefix)
    if not service_key:
        return JSONResponse(
            status_code=404,
            content={"detail": f"Unknown API segment: {prefix}"},
        )

    target_base = SERVICES[service_key]
    url = f"{target_base}{request.url.path}"
    if request.url.query:
        url = f"{url}?{request.url.query}"

    headers = {
        k: v
        for k, v in request.headers.items()
        if k.lower() not in HOP_BY_HOP_HEADERS
    }

    body = await request.body()

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            upstream = await client.request(
                request.method,
                url,
                headers=headers,
                content=body if body else None,
            )
        except httpx.RequestError as exc:
            return JSONResponse(
                status_code=502,
                content={"detail": f"Upstream unavailable: {exc!s}"},
            )

    response_headers = {
        k: v
        for k, v in upstream.headers.items()
        if k.lower() not in HOP_BY_HOP_HEADERS and k.lower() != "content-length"
    }

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
        media_type=upstream.headers.get("content-type"),
    )
