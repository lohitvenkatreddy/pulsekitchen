from fastapi.testclient import TestClient
from restaurant_service.app.main import app

client = TestClient(app)
response = client.get("/api/v1/restaurants/1/menu")
print("Status:", response.status_code)
print("Data:", response.json())
