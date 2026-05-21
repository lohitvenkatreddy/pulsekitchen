# Priority-Based Food Delivery System

A scalable, real-time food delivery platform with priority-aware order processing.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile App (React Native)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Login     │  │  Home       │  │  Priority Checkout  │  │
│  │  Register   │  │  Restaurants│  │  🚨🎓✈️⭐ Options   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway (Port 8000)                 │
└─────────────────────────────────────────────────────────────┘
                              │
    ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
    ▼         ▼         ▼         ▼         ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐
│  Auth  │ │  User  │ │Restaurant│ │  Order   │ │ Delivery│ │ Payment │
│ :8001  │ │ :8002  │ │  :8003   │ │  :8004   │ │  :8005  │ │  :8006   │
└────────┘ └────────┘ └──────────┘ └──────────┘ └─────────┘ └──────────┘
    │         │         │          │          │         │
    └─────────┴─────────┴──────────┼──────────┴─────────┘
                                   ▼
                          ┌──────────────────┐
                          │  Notification    │
                          │     :8007        │
                          └──────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
┌────────────────┐        ┌────────────────┐        ┌────────────────┐
│   PostgreSQL   │        │     Redis      │        │   RabbitMQ     │
│     :5432      │        │     :6379      │        │  :5672/:15672  │
└────────────────┘        └────────────────┘        └────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for mobile app)
- Expo CLI (for mobile development)

### Running with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Presentation Demo Reset

Use the reset helper before rehearsals or the live demo:

```bash
./scripts/demo_reset.sh
```

It rebuilds the stack, recreates the seeded PostgreSQL volume, waits for the API
gateway health check, then prints the seeded credentials and dashboard URLs.

### Mobile App Setup

```bash
cd mobile-app
npm install
npm start
```

For a physical phone, point Expo at your laptop instead of `127.0.0.1`:

```bash
cp mobile-app/.env.example mobile-app/.env
# Replace YOUR_LAPTOP_LAN_IP with the value printed by ./scripts/demo_reset.sh
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAPTOP_LAN_IP:8000/api/v1
```

## Cloud Deployment

For a durable hosted setup, deploy the landing page plus the admin, restaurant,
and delivery dashboards on Netlify, deploy the FastAPI services on Render, use
Supabase Postgres for the shared database, and build the Android app as an APK
through Expo EAS.

Deployment guide:

- [BEST_SIMPLE_DEPLOYMENT.md](/Users/lohithvenkatreddy/Desktop/POP/BEST_SIMPLE_DEPLOYMENT.md)
- [DEPLOY_VERCEL_RENDER_SUPABASE.md](/Users/lohithvenkatreddy/Desktop/POP/DEPLOY_VERCEL_RENDER_SUPABASE.md)
- [DEPLOY_NETLIFY_VPS_APK.md](/Users/lohithvenkatreddy/Desktop/POP/DEPLOY_NETLIFY_VPS_APK.md)

## 📁 Project Structure

```
POP/
├── auth-service/           # Authentication & JWT
├── user-service/           # User management
├── restaurant-service/     # Restaurant listings
├── order-service/          # Core order processing with priority
├── delivery-service/       # Delivery tracking & ETA
├── payment-service/        # Payment processing
├── notification-service/   # Push, SMS, Email notifications
├── api-gateway/            # API Gateway
├── mobile-app/             # React Native app
│   └── src/
│       ├── screens/        # Login, Home, Cart, OrderTracking
│       ├── components/     # Reusable components
│       ├── services/       # API services
│       └── store/          # Redux state management
├── database/               # PostgreSQL schema
└── docker-compose.yml      # Docker orchestration
```

## 🔑 Priority Algorithm

Orders are prioritized using:

```
Priority Score = 0.4 × urgency + 0.35 × distance + 0.25 × waiting_time
```

### Factors:
- **Urgency**: VIP status, order type (express/hospital/student), peak hours
- **Distance**: Shorter distances get higher priority
- **Waiting Time**: Prevents starvation by boosting old orders

### Priority Levels:
| Score Range | Level | Description |
|-------------|-------|-------------|
| 80-100 | Critical | Hospital/VIP orders |
| 60-79 | High | Travel emergency |
| 40-59 | Normal | Student urgent |
| 0-39 | Low | Standard delivery |

### Student Priority ID Verification

Student priority ordering now requires a college ID-card photo verification before
checkout can submit `student_urgent` orders.

1. Add a redacted reference card image at:

```bash
order-service/config/student_id_template.jpg
```

2. Rebuild/restart the order service so OpenCV dependencies are installed:

```bash
docker-compose up -d --build order-service api-gateway
```

3. In the mobile app, select **Student (Time-bound)** during checkout and upload
the ID-card photo. The backend compares the uploaded card layout against the
reference template and returns a temporary verification token.

4. `POST /api/v1/orders/` rejects `student_urgent` orders unless the request
includes a valid `student_verification_id`.

The default verification threshold is `0.65`, so only uploads with a match score
of `0.65` or higher are accepted. Override it with
`STUDENT_ID_MIN_MATCH_SCORE` if you need to tune the demo.

This validates that the uploaded card visually matches the college ID template.
It does not fully prove identity, so production systems should combine this with
college email, QR/barcode validation, expiry checks, or manual review.

### Travel and Hospital Emergency Verification

Travel and hospital priority ordering require document verification before
checkout can submit `travel_emergency` or `hospital_emergency` orders.

1. Create a Gemini API key in Google AI Studio and keep it only in your local
`.env` file:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
EMERGENCY_VERIFICATION_MODE=auto
```

2. Rebuild/restart the order service:

```bash
docker-compose up -d --build order-service api-gateway
```

3. In checkout, select **Travel Emergency** or **Hospital Emergency** and upload
a JPG/PNG/WEBP document. The order service calls Gemini Vision and returns one
of: `approved`, `rejected`, or `pending`.

4. `POST /api/v1/orders/` rejects emergency priority orders unless the request
   includes a valid `emergency_verification_id`.

`EMERGENCY_VERIFICATION_MODE` supports:

- `live`: require Gemini and fail if it is unavailable
- `offline`: approve through deterministic demo verification
- `auto`: use Gemini when possible, then fall back to offline demo verification

Endpoint:

```http
POST /api/v1/orders/emergency-verification/document
Content-Type: multipart/form-data
```

Fields:

| Field | Required | Description |
|-------|----------|-------------|
| `document` | yes | Image file (JPG / PNG / WEBP) |
| `emergencyType` | yes | `travel` or `hospital` |
| `user_id` | yes | User ID for token scoping |
| `customerName` | no | Name from user account |
| `orderId` | no | Order ID if already known |
| `customerId` | no | Customer/user ID for audit context |

## 🚨 Priority Delivery Options (Mobile App)

The checkout screen offers 5 priority levels:

| Option | Icon | Fee | Use Case |
|--------|------|-----|----------|
| Normal Delivery | 🚚 | $0 | Standard delivery |
| Student (Time-bound) | 🎓 | $30 | Between classes/exams |
| Travel Emergency | ✈️ | $40 | Catching flight/train |
| Hospital Emergency | 🚨 | $50 | Urgent medical situation |
| VIP Priority | ⭐ | $60 | Fastest delivery |

## 🛠️ Tech Stack

### Backend
- FastAPI (Python)
- PostgreSQL (Database)
- Redis (Caching)
- RabbitMQ (Message Queue)
- Celery (Async Tasks)

### Frontend
- React Native (Mobile)
- Redux Toolkit (State)
- React Navigation (Routing)
- Axios (HTTP Client)

### DevOps
- Docker & Docker Compose
- Nginx (Load Balancing)

## 📱 App Features

- User authentication (Login/Register)
- Browse restaurants with filters
- Cart management with priority selection
- Real-time order tracking with ETA
- Priority-based order processing
- Order history with priority display
- Profile management
- Push notifications

## 🔌 API Endpoints

### Auth Service (Port 8001)
```
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

### Order Service (Port 8004)
```
POST   /api/v1/orders/              # Create order with priority
GET    /api/v1/orders/              # List orders (sorted by priority)
GET    /api/v1/orders/:id           # Get order details
PATCH  /api/v1/orders/:id/status    # Update status
GET    /api/v1/orders/queue/pending # Priority queue
```

### Delivery Service (Port 8005)
```
POST   /api/v1/delivery/assign              # Assign delivery partner
GET    /api/v1/delivery/partners/available  # Get available partners
POST   /api/v1/delivery/:order_id/track     # Start tracking
GET    /api/v1/delivery/:order_id/eta       # Get ETA
POST   /api/v1/delivery/location            # Update partner location
```

### Payment Service (Port 8006)
```
POST   /api/v1/payment/create-intent        # Create payment intent
POST   /api/v1/payment/                     # Process payment
GET    /api/v1/payment/:payment_id          # Get payment
POST   /api/v1/payment/refund               # Process refund
GET    /api/v1/payment/priority-fees        # Get priority fees
```

### Notification Service (Port 8007)
```
POST   /api/v1/notifications/               # Create notification
GET    /api/v1/notifications/user/:user_id  # Get user notifications
POST   /api/v1/notifications/register-push-token  # Register device
POST   /api/v1/notifications/send-order-update    # Order status update
```

### Support Endpoints
```
POST   /api/v1/support/requests
POST   /api/v1/support/issues
GET    /api/v1/support/faq
```

## 🧪 Testing

```bash
# Run tests for a service
cd auth-service
pytest

# Run mobile app tests
cd mobile-app
npm test
```

## 📊 Service Ports

| Service | Port | Purpose |
|---------|------|---------|
| API Gateway | 8000 | Main entry point |
| Auth Service | 8001 | Authentication |
| User Service | 8002 | User management |
| Restaurant Service | 8003 | Restaurant data |
| Order Service | 8004 | Order processing |
| Delivery Service | 8005 | Delivery tracking |
| Payment Service | 8006 | Payment processing |
| Notification Service | 8007 | Notifications |
| Admin Service | 8008 | Operations dashboard |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache/Queue |
| RabbitMQ | 5672 | Message broker |
| RabbitMQ UI | 15672 | Management UI |

## 🔐 Security

- JWT-based authentication
- Role-based access control (Customer, Restaurant, Delivery, Admin)
- Input validation with Pydantic
- HTTPS encryption (production)
- Tokenized payment data (PCI compliant)

## 📈 Future Enhancements

- AI-based demand prediction
- Dynamic pricing based on load
- Real-time analytics dashboard
- Drone delivery integration
- Voice-based ordering
- Multi-language support

## 📝 License

MIT
