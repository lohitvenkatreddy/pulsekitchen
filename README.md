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

### Mobile App Setup

```bash
cd mobile-app
npm install
npm start
```

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

## 🚨 Priority Delivery Options (Mobile App)

The checkout screen offers 5 priority levels:

| Option | Icon | Fee | Use Case |
|--------|------|-----|----------|
| Normal Delivery | 🚚 | $0 | Standard delivery |
| Student (Time-bound) | 🎓 | $3 | Between classes/exams |
| Travel Emergency | ✈️ | $4 | Catching flight/train |
| Hospital Emergency | 🚨 | $5 | Urgent medical situation |
| VIP Priority | ⭐ | $6 | Fastest delivery |

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
