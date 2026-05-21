# Best Simple Deployment

Recommended setup for this project:

- Netlify for the landing page and dashboards
- One Ubuntu VPS for the full backend stack
- Docker Compose on the VPS
- Nginx + HTTPS for the public API
- Expo EAS for the Android APK

This is simpler than Render for this repo because the backend has many services.
On a VPS, all services run together with one `docker compose` command.

## Final Architecture

```text
Android APK
  -> https://api.yourdomain.com/api/v1

Netlify Web
  -> https://your-site.netlify.app
  -> /admin
  -> /restaurant
  -> /delivery
  -> proxies API calls to https://api.yourdomain.com

VPS
  -> Nginx HTTPS
  -> API Gateway
  -> auth, user, restaurant, order, delivery, payment, notification, admin
  -> Postgres, Redis, RabbitMQ
```

## What You Need

- A Netlify account
- A VPS, preferably Ubuntu 22.04 or 24.04
- A domain or subdomain for the API, for example `api.yourdomain.com`
- An Expo account for APK builds

You do not need Supabase or Render for this path.

## Step 1: Deploy Web on Netlify

Use these Netlify settings:

```text
Base directory: netlify-dashboards
Build command: npm run build
Publish directory: dist
```

Set this Netlify environment variable:

```text
API_GATEWAY_URL=https://api.yourdomain.com
```

If the VPS API is not ready yet, Netlify will fail until this value exists.
Use the final API domain value, not `/api/v1`.

Correct:

```text
https://api.yourdomain.com
```

Wrong:

```text
https://api.yourdomain.com/api/v1
```

## Step 2: Point API Domain to VPS

In your DNS provider, create:

```text
Type: A
Name: api
Value: YOUR_VPS_PUBLIC_IP
```

Wait until this works:

```bash
ping api.yourdomain.com
```

## Step 3: Prepare the VPS

SSH into the VPS:

```bash
ssh root@YOUR_VPS_PUBLIC_IP
```

Install Docker using the official Docker Ubuntu instructions:

```text
https://docs.docker.com/engine/install/ubuntu/
```

Install Nginx:

```bash
sudo apt update
sudo apt install -y nginx
```

Allow SSH and web traffic:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Step 4: Run Backend on VPS

Clone the repo:

```bash
git clone YOUR_REPO_URL
cd POP
```

Create the VPS env file:

```bash
cp .env.vps.example .env.vps
```

Edit `.env.vps`:

```text
POSTGRES_PASSWORD=strong_password_here
DATABASE_URL=postgresql://postgres:strong_password_here@postgres:5432/food_delivery
JWT_SECRET_KEY=long_random_secret_here
CORS_ORIGINS=https://your-site.netlify.app
```

Then start everything:

```bash
docker compose -f docker-compose.vps.yml up -d --build
```

Test locally on the VPS:

```bash
curl http://127.0.0.1:8000/health
```

Expected:

```json
{"status":"healthy","service":"api-gateway"}
```

## Step 5: Expose API with Nginx

Copy the sample config:

```bash
sudo cp nginx/pulsekitchen-api.conf.example /etc/nginx/sites-available/pulsekitchen-api.conf
```

Edit it:

```bash
sudo nano /etc/nginx/sites-available/pulsekitchen-api.conf
```

Change:

```text
server_name api.example.com;
```

To:

```text
server_name api.yourdomain.com;
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/pulsekitchen-api.conf /etc/nginx/sites-enabled/pulsekitchen-api.conf
sudo nginx -t
sudo systemctl reload nginx
```

## Step 6: Add HTTPS

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Issue SSL:

```bash
sudo certbot --nginx -d api.yourdomain.com
```

Test public API:

```bash
curl https://api.yourdomain.com/health
```

## Step 7: Build APK

In this repo on your laptop:

```bash
cd mobile-app
npm install
npx eas login
npx eas init
```

Set the API URL for APK builds:

```bash
eas env:create --name EXPO_PUBLIC_API_BASE_URL --value https://api.yourdomain.com/api/v1 --environment preview --visibility plaintext
```

Build APK:

```bash
npm run apk:preview
```

Download the APK from the Expo build link and install it on Android.

## Step 8: Final Checks

Web:

```text
https://your-site.netlify.app/
https://your-site.netlify.app/admin
https://your-site.netlify.app/restaurant
https://your-site.netlify.app/delivery
```

API:

```text
https://api.yourdomain.com/health
```

APK:

```text
Login works
Restaurants load
Cart total shows updated priority fees
Orders can be placed
```

## Useful VPS Commands

Restart:

```bash
docker compose -f docker-compose.vps.yml restart
```

Rebuild:

```bash
docker compose -f docker-compose.vps.yml up -d --build
```

Logs:

```bash
docker compose -f docker-compose.vps.yml logs -f api-gateway
```

Stop:

```bash
docker compose -f docker-compose.vps.yml down
```

## Best Choice Summary

Use this setup:

```text
Netlify + one Ubuntu VPS + Docker Compose + Expo EAS APK
```

Skip this for now:

```text
Render + Supabase
```

Render + Supabase is good, but it is more dashboard clicking because this project has many backend services.
