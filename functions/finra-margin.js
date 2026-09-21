const FINRA_XLSX = 'https://www.finra.org/sites/default/files/2021-03/margin-statistics.xlsx';
const FINRA_PAGE = 'https://www.finra.org/rules-guidance/key-topics/margin-accounts/margin-statistics';

export function isWorkbook(bytes) {
  return bytes.length > 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const key = new Request('https://finra-margin.cache/workbook');
  const hit = await cache.match(key);
  if (hit) return hit;
  let status = 0, detail = '';
  try {
    const r = await fetch(FINRA_XLSX, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*',
        'Referer': FINRA_PAGE,
      },
    });
    status = r.status;
    const bytes = new Uint8Array(await r.arrayBuffer());
    if (r.ok && isWorkbook(bytes)) {
      const res = new Response(bytes, { headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Cache-Control': 'public, max-age=21600',
        'X-Fetched-Via': 'cloudflare',
      } });
      context.waitUntil(cache.put(key, res.clone()));
      return res;
    }
    detail = r.ok ? 'FINRA answered with a page, not the workbook' : `FINRA answered HTTP ${r.status}`;
  } catch (e) {
    detail = `request failed: ${e.message}`;
  }
  return new Response(JSON.stringify({ error: detail, finra_status: status }), {
    status: 502, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
