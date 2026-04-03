export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // ── API paths: always pass through, no auth required ──────────────────────
  // These are called by browser JS after the page loads — they must never
  // require auth or the live data refresh silently fails with 401.
  const API_PATHS = [
    '/quotes', '/spyintraday', '/spy', '/gex', '/futures', '/news',
    '/fg', '/breadth', '/sentiment', '/cal', '/fomc', '/cot',
    '/premarket', '/ai', '/liquidity', '/ollama', '/gex-history',
    '/chat',  // chat API — has its own session auth
    '/blog',  // blog API — public read, password-protected write
  ];
  if (API_PATHS.some(p => path === p || path.startsWith(p + '?') || path.startsWith(p + '/'))) {
    return next();
  }

  // ── Static assets: always pass through ────────────────────────────────────
  const ext = path.split('.').pop().toLowerCase();
  if (['js','json','css','html','png','jpg','jpeg','svg','ico','db','csv','txt','woff','woff2','map'].includes(ext)) {
    return next();
  }

  // ── Everything else: require Basic Auth ───────────────────────────────────
  const authorization = request.headers.get('Authorization');
  if (authorization) {
    const [scheme, encoded] = authorization.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded);
      const [user, pass] = decoded.split(':');
      const correctPass = env.CFP_PASSWORD || 'Tetsuo314!';
      const correctUser = env.CFP_USERNAME || 'TKosuge';
      if (user === correctUser && pass === correctPass) {
        return next();
      }
    }
  }

  return new Response('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="SPY Tracker"' },
  });
}
