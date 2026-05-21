import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const src = resolve(root, "src");
const dist = resolve(root, "dist");
const gatewayUrl = (process.env.API_GATEWAY_URL || "").replace(/\/+$/, "");

const dashboardSources = [
  {
    from: resolve(root, "..", "admin-service", "app", "static", "dashboard.html"),
    to: resolve(src, "admin.html"),
  },
  {
    from: resolve(root, "..", "restaurant-service", "app", "static", "dashboard.html"),
    to: resolve(src, "restaurant.html"),
  },
  {
    from: resolve(root, "..", "delivery-service", "app", "static", "dashboard.html"),
    to: resolve(src, "delivery.html"),
  },
];

for (const dashboard of dashboardSources) {
  await cp(dashboard.from, dashboard.to);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(src, dist, { recursive: true });
await writeFile(
  resolve(dist, "config.js"),
  'window.PULSEKITCHEN_API_BASE_URL = "/api/v1";\n'
);

for (const fileName of ["admin.html", "restaurant.html", "delivery.html"]) {
  const htmlPath = resolve(dist, fileName);
  const html = await readFile(htmlPath, "utf8");
  await writeFile(
    htmlPath,
    html.replace("</head>", '    <script src="/config.js"></script>\n  </head>')
  );
}

const redirects = [
  "/admin /admin.html 200",
  "/restaurant /restaurant.html 200",
  "/delivery /delivery.html 200",
  ...(gatewayUrl
    ? [
        `/api/v1/* ${gatewayUrl}/api/v1/:splat 200`,
        `/health ${gatewayUrl}/health 200`,
      ]
    : []),
  "/* /index.html 200",
].join("\n");

await writeFile(resolve(dist, "_redirects"), `${redirects}\n`);
