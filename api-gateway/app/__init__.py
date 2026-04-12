from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx

app = FastAPI(title="API Gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upstream microservices (Docker service names)
SERVICES = {
    "auth": "http://auth-service:8000",
    "user": "http://user-service:8000",
    "restaurant": "http://restaurant-service:8000",
    "order": "http://order-service:8000",
    "delivery": "http://delivery-service:8000",
    "payment": "http://payment-service:8000",
    "notification": "http://notification-service:8000",
    "admin": "http://admin-service:8000",
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
    return {
        "service": "Food Delivery API Gateway",
        "version": "1.0.0",
        "endpoints": {
            "/api/v1/auth": "Authentication Service",
            "/api/v1/users": "User Service",
            "/api/v1/restaurants": "Restaurant Service",
            "/api/v1/orders": "Order Service",
            "/api/v1/delivery": "Delivery Service",
            "/api/v1/payment": "Payment Service",
            "/api/v1/notifications": "Notification Service",
            "/api/v1/admin": "Admin Service",
        },
    }


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
