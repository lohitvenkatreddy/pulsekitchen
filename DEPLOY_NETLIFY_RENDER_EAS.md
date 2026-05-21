# Deploy PulseKitchen on Netlify, Render, Supabase, and EAS

This path hosts the three dashboards on Netlify, hosts the FastAPI services on
Render, uses Supabase Postgres, and builds the mobile app as an Android APK with
Expo EAS.

## 1. Backend: Supabase and Render

The dashboards and APK both need a public API gateway URL.

1. Create a Supabase project.
2. Run [database/schema.sql](/Users/lohithvenkatreddy/Desktop/POP/database/schema.sql)
   in the Supabase SQL editor.
3. Deploy these Render services from the matching repo directories:
   `api-gateway`, `auth-service`, `user-service`, `restaurant-service`,
   `order-service`, `delivery-service`, `payment-service`,
   `notification-service`, and `admin-service`.
4. Create Render Redis and RabbitMQ services.
5. Set shared service env vars:

```text
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
REDIS_URL=[Render Redis URL]
RABBITMQ_URL=[Render RabbitMQ URL]
JWT_SECRET_KEY=[strong shared secret]
JWT_ALGORITHM=HS256
```

Set gateway upstream URLs on `api-gateway`:

```text
AUTH_SERVICE_URL=https://[auth-service].onrender.com
USER_SERVICE_URL=https://[user-service].onrender.com
RESTAURANT_SERVICE_URL=https://[restaurant-service].onrender.com
ORDER_SERVICE_URL=https://[order-service].onrender.com
DELIVERY_SERVICE_URL=https://[delivery-service].onrender.com
PAYMENT_SERVICE_URL=https://[payment-service].onrender.com
NOTIFICATION_SERVICE_URL=https://[notification-service].onrender.com
ADMIN_SERVICE_URL=https://[admin-service].onrender.com
CORS_ORIGINS=https://[your-netlify-site].netlify.app
```

After Render is live, keep the gateway URL. Example:

```text
https://pulsekitchen-api.onrender.com
```

## 2. Dashboards: Netlify

Deploy the new [netlify-dashboards](/Users/lohithvenkatreddy/Desktop/POP/netlify-dashboards)
folder as its own Netlify site.

Netlify settings:

```text
Base directory: netlify-dashboards
Build command: npm run build
Publish directory: dist
```

Netlify environment variable:

```text
API_GATEWAY_URL=https://[your-api-gateway].onrender.com
```

Dashboard URLs after deploy:

```text
https://[your-netlify-site].netlify.app/
https://[your-netlify-site].netlify.app/admin
https://[your-netlify-site].netlify.app/restaurant
https://[your-netlify-site].netlify.app/delivery
```

## 3. Mobile APK: Expo EAS

Set the mobile app API URL in Expo/EAS for the `preview` environment:

```bash
cd mobile-app
npx eas login
npx eas init
npx eas env:create --name EXPO_PUBLIC_API_BASE_URL --value https://[your-api-gateway].onrender.com/api/v1 --environment preview --visibility plaintext
npx eas build --platform android --profile preview --environment preview
```

The `preview` profile in [mobile-app/eas.json](/Users/lohithvenkatreddy/Desktop/POP/mobile-app/eas.json)
is already configured to produce an installable `.apk`.

For Play Store later:

```bash
npx eas env:create --name EXPO_PUBLIC_API_BASE_URL --value https://[your-api-gateway].onrender.com/api/v1 --environment production --visibility plaintext
npx eas build --platform android --profile production --environment production
```

## 4. Smoke Tests

Verify these before sharing:

```text
https://[gateway]/health
https://[netlify-site]/
https://[netlify-site]/admin
https://[netlify-site]/restaurant
https://[netlify-site]/delivery
APK opens, logs in, lists restaurants, creates an order, and tracks status
```
