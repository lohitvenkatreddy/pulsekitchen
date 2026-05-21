const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || 4174);
const distDir = path.join(__dirname, '..', 'dist');
const apiTarget = new URL(process.env.API_TARGET || 'http://127.0.0.1:8000');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
};

function serveFile(req, res) {
  const requestPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(distDir, safePath === '/' ? 'index.html' : safePath);
  const resolvedPath = filePath.startsWith(distDir) ? filePath : path.join(distDir, 'index.html');

  fs.readFile(resolvedPath, (error, data) => {
    if (error) {
      fs.readFile(path.join(distDir, 'index.html'), (indexError, indexData) => {
        if (indexError) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(indexData);
      });
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentTypes[path.extname(resolvedPath)] || 'application/octet-stream',
    });
    res.end(data);
  });
}

function proxyApi(req, res) {
  const targetUrl = new URL(req.url, apiTarget);
  const proxyReq = http.request(
    targetUrl,
    {
      method: req.method,
      headers: {
        ...req.headers,
        host: apiTarget.host,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (error) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ detail: `API proxy error: ${error.message}` }));
  });

  req.pipe(proxyReq);
}

http
  .createServer((req, res) => {
    if (req.url.startsWith('/api/')) {
      proxyApi(req, res);
      return;
    }

    serveFile(req, res);
  })
  .listen(port, '127.0.0.1', () => {
    console.log(`Serving web app and API proxy at http://127.0.0.1:${port}`);
  });
