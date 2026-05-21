# Production Deployment: Vercel + Render + Supabase + EAS

This is the production path for this repository.

- Frontend hosting: Vercel
- Backend hosting: Render
- Database/Auth data/Storage: Supabase
- Android APK builds: Expo EAS

The frontend project is the static portal in [netlify-dashboards](/Users/lohithvenkatreddy/Desktop/POP/netlify-dashboards). The folder name is historical; it now has Vercel config too.

## Architecture

```text
Vercel
  Landing page
  /admin
  /restaurant
  /delivery

Expo APK
  Mobile app

Both call:
  Render API Gateway
    -> auth-service
    -> user-service
    -> restaurant-service
    -> order-service
    -> delivery-service
    -> payment-service
    -> notification-service
    -> admin-service

Supabase
  Postgres database
  Storage buckets
  App auth data in the users table through auth-service
```

Important auth note:

This app currently uses its own FastAPI `auth-service` with JWT tokens. Supabase stores the auth data in Postgres, but the app does not directly use Supabase Auth APIs. Migrating to direct Supabase Auth would be a separate app/auth refactor.

## 1. Supabase

Create a Supabase project.

Run the database schema:

```text
database/schema.sql
```

Then run the storage setup:

```text
supabase/storage.sql
```

This creates buckets for:

- `restaurant-menu-images`
- `verification-documents`
- `support-attachments`

Get your Supabase pooler connection string. Use the pooler/session connection for Render.

Format:

```text
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
```

Use it later as:

```text
DATABASE_URL=...
```

## 2. Render Backend

This repo now includes [render.yaml](/Users/lohithvenkatreddy/Desktop/POP/render.yaml) as a Render Blueprint starter.

Render services:

- `pulsekitchen-auth-service`
- `pulsekitchen-user-service`
- `pulsekitchen-restaurant-service`
- `pulsekitchen-order-service`
- `pulsekitchen-delivery-service`
- `pulsekitchen-payment-service`
- `pulsekitchen-notification-service`
- `pulsekitchen-admin-service`
- `pulsekitchen-api-gateway`

Each service uses Docker and has `/health` as its health check.

### Required Support URLs

You also need:

- Redis URL
- RabbitMQ AMQP URL

Recommended:

- Redis: Render Key Value or another managed Redis
- RabbitMQ: CloudAMQP or a managed RabbitMQ provider

Use these values in Render:

```text
REDIS_URL=redis://...
RABBITMQ_URL=amqp://...
```

### Shared Render Env Vars

Add these to the `pulsekitchen-shared` env group in Render:

```text
DATABASE_URL=your_supabase_pooler_url
REDIS_URL=your_redis_url
RABBITMQ_URL=your_rabbitmq_url
JWT_SECRET_KEY=long_random_secret
JWT_ALGORITHM=HS256
```

### Service-Specific Env Vars

For `pulsekitchen-auth-service`:

```text
ACCESS_TOKEN_EXPIRE_MINUTES=30
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=...
BREVO_SENDER_NAME=PulseKitchen
SIGNUP_OTP_TTL_MINUTES=10
SIGNUP_OTP_RESEND_COOLDOWN_SECONDS=60
SIGNUP_OTP_MAX_ATTEMPTS=5
```

For `pulsekitchen-order-service`:

```text
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
EMERGENCY_VERIFICATION_MODE=auto
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=...
BREVO_SENDER_NAME=PulseKitchen
```

For `pulsekitchen-delivery-service`:

```text
GOOGLE_MAPS_API_KEY=...
GOOGLE_DISTANCE_MATRIX_URL=https://maps.googleapis.com/maps/api/distancematrix/json
OSRM_ROUTE_URL=https://router.project-osrm.org/route/v1/driving
ROUTING_TIMEOUT_SECONDS=4
```

### API Gateway Env Vars

After the first 8 backend services deploy, copy their Render URLs into the API gateway:

```text
AUTH_SERVICE_URL=https://pulsekitchen-auth-service.onrender.com
USER_SERVICE_URL=https://pulsekitchen-user-service.onrender.com
RESTAURANT_SERVICE_URL=https://pulsekitchen-restaurant-service.onrender.com
ORDER_SERVICE_URL=https://pulsekitchen-order-service.onrender.com
DELIVERY_SERVICE_URL=https://pulsekitchen-delivery-service.onrender.com
PAYMENT_SERVICE_URL=https://pulsekitchen-payment-service.onrender.com
NOTIFICATION_SERVICE_URL=https://pulsekitchen-notification-service.onrender.com
ADMIN_SERVICE_URL=https://pulsekitchen-admin-service.onrender.com
CORS_ORIGINS=https://your-vercel-site.vercel.app
```

Your public API URL will be:

```text
https://pulsekitchen-api-gateway.onrender.com
```

Test it:

```bash
curl https://pulsekitchen-api-gateway.onrender.com/health
```

## 3. Vercel Frontend

Create a Vercel project from this repo.

Use these Vercel settings:

```text
Root Directory: netlify-dashboards
Framework Preset: Other
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

The Vercel config is in:

```text
netlify-dashboards/vercel.json
```

Set this Vercel environment variable:

```text
API_GATEWAY_URL=https://pulsekitchen-api-gateway.onrender.com
```

Do not include `/api/v1` in `API_GATEWAY_URL`.

Correct:

```text
https://pulsekitchen-api-gateway.onrender.com
```

Wrong:

```text
https://pulsekitchen-api-gateway.onrender.com/api/v1
```

Vercel routes:

```text
https://your-vercel-site.vercel.app/
https://your-vercel-site.vercel.app/admin
https://your-vercel-site.vercel.app/restaurant
https://your-vercel-site.vercel.app/delivery
```

## 4. Expo EAS APK

The EAS config is in:

```text
mobile-app/eas.json
```

The `preview` profile builds an installable APK.

Install dependencies:

```bash
cd mobile-app
npm install
```

Login and initialize:

```bash
npx eas login
npx eas init
```

Set the preview API URL:

```bash
eas env:create --name EXPO_PUBLIC_API_BASE_URL --value https://pulsekitchen-api-gateway.onrender.com/api/v1 --environment preview --visibility plaintext
```

Set the production API URL:

```bash
eas env:create --name EXPO_PUBLIC_API_BASE_URL --value https://pulsekitchen-api-gateway.onrender.com/api/v1 --environment production --visibility plaintext
```

Build APK:

```bash
npm run apk:preview
```

Build Play Store bundle later:

```bash
npm run android:bundle
```

## 5. Smoke Tests

Backend:

```text
https://pulsekitchen-api-gateway.onrender.com/health
```

Vercel:

```text
https://your-vercel-site.vercel.app/
https://your-vercel-site.vercel.app/admin
https://your-vercel-site.vercel.app/restaurant
https://your-vercel-site.vercel.app/delivery
```

APK:

```text
App opens
Login works
Restaurants load
Cart works
Priority fees show 30 / 40 / 50 / 60
Orders can be placed
```

## 6. Repo Files Prepared for This Deployment

- [render.yaml](/Users/lohithvenkatreddy/Desktop/POP/render.yaml)
- [netlify-dashboards/vercel.json](/Users/lohithvenkatreddy/Desktop/POP/netlify-dashboards/vercel.json)
- [netlify-dashboards/scripts/build.mjs](/Users/lohithvenkatreddy/Desktop/POP/netlify-dashboards/scripts/build.mjs)
- [mobile-app/eas.json](/Users/lohithvenkatreddy/Desktop/POP/mobile-app/eas.json)
- [supabase/storage.sql](/Users/lohithvenkatreddy/Desktop/POP/supabase/storage.sql)
- [supabase/README.md](/Users/lohithvenkatreddy/Desktop/POP/supabase/README.md)

## 7. Official Docs

- Render Blueprints: https://render.com/docs/blueprint-spec
- Vercel rewrites/config: https://vercel.com/docs/rewrites
- Supabase Storage buckets: https://supabase.com/docs/guides/storage/buckets/creating-buckets
- EAS APK builds: https://docs.expo.dev/build-reference/apk/
- EAS environment variables: https://docs.expo.dev/eas/environment-variables/
