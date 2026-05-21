function getApiBaseUrl() {
  const raw =
    process.env.API_GATEWAY_URL ||
    process.env.PULSEKITCHEN_API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_BASE_URL;

  if (!raw) {
    throw new Error('Set API_GATEWAY_URL to your backend gateway/ngrok URL in Vercel.');
  }

  return raw.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
}

module.exports = async function handler(_req, res) {
  let targetUrl;
  try {
    targetUrl = `${getApiBaseUrl()}/health`;
  } catch (error) {
    res.status(500).json({ detail: error.message });
    return;
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    res.status(502).json({ detail: `Backend unavailable: ${error.message}` });
  }
};
