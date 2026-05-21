# PulseKitchen Netlify Dashboards

Static Netlify build for the PulseKitchen portal landing page and the three dashboards:

- Admin: `/admin`
- Restaurant: `/restaurant`
- Delivery: `/delivery`

The dashboards still need the FastAPI backend hosted elsewhere. Set this Netlify
environment variable before deploying:

```text
API_GATEWAY_URL=https://your-api-gateway.onrender.com
```

During the build, the latest dashboard HTML is copied from:

- `../admin-service/app/static/dashboard.html`
- `../restaurant-service/app/static/dashboard.html`
- `../delivery-service/app/static/dashboard.html`

Netlify build settings:

```text
Base directory: netlify-dashboards
Build command: npm run build
Publish directory: dist
```

The build generates redirects so `/api/v1/*` is proxied to the hosted gateway.
