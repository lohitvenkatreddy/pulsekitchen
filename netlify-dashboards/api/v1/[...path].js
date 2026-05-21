const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'content-encoding',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

function getApiBaseUrl() {
  const raw = process.env.API_GATEWAY_URL || process.env.PULSEKITCHEN_API_BASE_URL;

  if (!raw) {
    throw new Error('Set API_GATEWAY_URL to your backend gateway/ngrok URL in Vercel.');
  }

  return raw.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
}

function getPath(req) {
  const value = req.query.path;
  return Array.isArray(value) ? value.join('/') : value || '';
}

function getQueryString(req) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(req.query || {})) {
    if (key === 'path') {
      continue;
    }

    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item !== undefined) {
        params.append(key, item);
      }
    }
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

function readBody(req) {
  if (req.body !== undefined) {
    if (Buffer.isBuffer(req.body)) {
      return Promise.resolve(req.body);
    }

    if (typeof req.body === 'string') {
      return Promise.resolve(Buffer.from(req.body));
    }

    return Promise.resolve(Buffer.from(JSON.stringify(req.body)));
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function copyRequestHeaders(req) {
  const headers = {};

  for (const [key, value] of Object.entries(req.headers)) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase()) && value !== undefined) {
      headers[key] = Array.isArray(value) ? value.join(', ') : value;
    }
  }

  headers['ngrok-skip-browser-warning'] = 'true';
  return headers;
}

function copyResponseHeaders(upstream, res) {
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      res.setHeader(key, value);
    }
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  let targetUrl;
  try {
    targetUrl = `${getApiBaseUrl()}/api/v1/${getPath(req)}${getQueryString(req)}`;
  } catch (error) {
    res.status(500).json({ detail: error.message });
    return;
  }

  try {
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req);
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: copyRequestHeaders(req),
      body,
      redirect: 'manual',
    });

    copyResponseHeaders(upstream, res);
    res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    res.status(502).json({ detail: `Backend unavailable: ${error.message}` });
  }
};
