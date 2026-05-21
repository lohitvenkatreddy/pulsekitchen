# Deploy with Netlify, Your Own VPS, and Expo APK

This option uses:

- Netlify for the landing page and dashboards
- Your own Ubuntu VPS for the backend stack
- Docker Compose on the VPS
- Host Nginx + Let's Encrypt for HTTPS
- Expo EAS for the Android APK

Recommended DNS layout:

- `www.yourdomain.com` or `app.yourdomain.com` -> Netlify
- `api.yourdomain.com` -> your VPS public IP

## 1. Netlify web

Deploy [netlify-dashboards](/Users/lohithvenkatreddy/Desktop/POP/netlify-dashboards) on Netlify.

Settings:

```text
Base directory: netlify-dashboards
Build command: npm run build
Publish directory: dist
```

Environment variable:

```text
API_GATEWAY_URL=https://api.yourdomain.com
```

After deploy, your web URLs are:

```text
https://your-site.netlify.app/
https://your-site.netlify.app/admin
https://your-site.netlify.app/restaurant
https://your-site.netlify.app/delivery
```

## 2. VPS setup

These steps assume Ubuntu 22.04 or 24.04.

Install Docker and the Compose plugin using Docker’s official docs:

- Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Compose plugin on Linux: https://docs.docker.com/compose/install/linux/

Then install Nginx:

```bash
sudo apt update
sudo apt install -y nginx
```

Optional but recommended firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 3. Copy project to VPS

Clone the repo on the VPS:

```bash
git clone <your-repo-url>
cd POP
```

Create VPS env file:

```bash
cp .env.vps.example .env.vps
```

Edit `.env.vps` and set at minimum:

```text
POSTGRES_PASSWORD=strong_password_here
DATABASE_URL=postgresql://postgres:strong_password_here@postgres:5432/food_delivery
JWT_SECRET_KEY=a_long_random_secret
CORS_ORIGINS=https://your-site.netlify.app
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=...
GEMINI_API_KEY=...
GOOGLE_MAPS_API_KEY=...
```

## 4. Start backend stack

Run:

```bash
docker compose -f docker-compose.vps.yml up -d --build
```

Check status:

```bash
docker compose -f docker-compose.vps.yml ps
curl http://127.0.0.1:8000/health
```

The API gateway is intentionally bound only to localhost:

```text
127.0.0.1:8000
```

So it is only exposed publicly through Nginx.

## 5. Nginx reverse proxy

Copy the sample config:

```bash
sudo cp nginx/pulsekitchen-api.conf.example /etc/nginx/sites-available/pulsekitchen-api.conf
```

Edit the server name:

```text
server_name api.yourdomain.com;
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/pulsekitchen-api.conf /etc/nginx/sites-enabled/pulsekitchen-api.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 6. HTTPS with Let's Encrypt

Use Certbot’s official Nginx instructions:

- https://certbot.eff.org/instructions

Typical Ubuntu command:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

After that, test:

```bash
curl https://api.yourdomain.com/health
```

## 7. APK build

The mobile app should point to your VPS API domain:

```text
https://api.yourdomain.com/api/v1
```

From [mobile-app](/Users/lohithvenkatreddy/Desktop/POP/mobile-app):

```bash
npm install
npx eas login
npx eas init
```

Create EAS environment variable for preview:

```bash
eas env:create --name EXPO_PUBLIC_API_BASE_URL --value https://api.yourdomain.com/api/v1 --environment preview --visibility plaintext
```

Create it for production too:

```bash
eas env:create --name EXPO_PUBLIC_API_BASE_URL --value https://api.yourdomain.com/api/v1 --environment production --visibility plaintext
```

Build APK:

```bash
npm run apk:preview
```

Expo docs for APK builds:

- https://docs.expo.dev/build-reference/apk/
- https://docs.expo.dev/eas/environment-variables/

## 8. Smoke tests

Backend:

```text
https://api.yourdomain.com/health
https://api.yourdomain.com/api/v1/admin/dashboard
https://api.yourdomain.com/api/v1/restaurants/partner/dashboard
https://api.yourdomain.com/api/v1/delivery/dashboard
```

Frontend:

```text
https://your-site.netlify.app/
https://your-site.netlify.app/admin
https://your-site.netlify.app/restaurant
https://your-site.netlify.app/delivery
```

Mobile:

- APK downloads successfully
- App opens
- Login works
- Restaurants load from `https://api.yourdomain.com/api/v1`

## 9. Useful commands on the VPS

Restart:

```bash
docker compose -f docker-compose.vps.yml restart
```

Rebuild after code changes:

```bash
docker compose -f docker-compose.vps.yml up -d --build
```

Logs:

```bash
docker compose -f docker-compose.vps.yml logs -f api-gateway
docker compose -f docker-compose.vps.yml logs -f auth-service
docker compose -f docker-compose.vps.yml logs -f order-service
```
