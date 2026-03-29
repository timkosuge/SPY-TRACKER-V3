export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'max-age=300' // cache 5 mins
  };

  const fetchRSS = async (url, source) => {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/rss+xml, application/xml, text/xml' }
      });
      if (!r.ok) return [];
      const text = await r.text();
      const items = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(text)) !== null && items.length < 8) {
        const block = match[1];
        const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                       block.match(/<title>(.*?)<\/title>/))?.[1]?.trim();
        const link  = (block.match(/<link>(.*?)<\/link>/) ||
                       block.match(/<guid>(.*?)<\/guid>/))?.[1]?.trim();
        const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim();
        const desc = (block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ||
                      block.match(/<description>(.*?)<\/description>/))?.[1]
                      ?.replace(/<[^>]+>/g,'')?.trim()?.substring(0,150);
        if (title && title.length > 10) {
          items.push({
            title: title.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"'),
            link: link || '',
            pubDate: pubDate || '',
            desc: desc || '',
            source
          });
        }
      }
      return items;
    } catch(e) { return []; }
  };

  const feeds = [
    { url: 'https://feeds.reuters.com/reuters/businessNews', source: 'Reuters' },
    { url: 'https://feeds.reuters.com/reuters/topNews', source: 'Reuters' },
    { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', source: 'CNBC' },
    { url: 'https://www.cnbc.com/id/20910258/device/rss/rss.html', source: 'CNBC Markets' },
    { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', source: 'MarketWatch' },
    { url: 'https://feeds.marketwatch.com/marketwatch/marketpulse/', source: 'MarketWatch' },
    { url: 'https://www.benzinga.com/feed', source: 'Benzinga' },
    { url: 'https://seekingalpha.com/market_currents.xml', source: 'Seeking Alpha' },
  ];

  // Fetch all feeds in parallel
  const results = await Promise.all(feeds.map(f => fetchRSS(f.url, f.source)));
  let allItems = results.flat();

  // Parse dates and sort by recency
  const parseDate = str => {
    try { return new Date(str).getTime(); } catch(e) { return 0; }
  };
  allItems.sort((a, b) => parseDate(b.pubDate) - parseDate(a.pubDate));

  // Deduplicate by similar titles
  const seen = new Set();
  const deduped = allItems.filter(item => {
    const key = item.title.toLowerCase().substring(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Filter for market relevance
  const marketKeywords = [
    'stock','market','fed','rate','inflation','GDP','earnings','SPY','S&P',
    'nasdaq','dow','bond','yield','dollar','gold','oil','crypto','bitcoin',
    'economy','trade','tariff','recession','employment','jobs','CPI','NFP',
    'federal reserve','powell','treasury','equity','options','volatility',
    'rally','selloff','bull','bear','hedge','invest','wall street','nasdaq'
  ];
  const relevant = deduped.filter(item => {
    const text = (item.title + ' ' + item.desc).toLowerCase();
    return marketKeywords.some(kw => text.includes(kw.toLowerCase()));
  });

  // Return top 20 relevant, fallback to top 20 if filter too aggressive
  const final = relevant.length >= 5 ? relevant.slice(0, 20) : deduped.slice(0, 20);

  // Format time ago
  const timeAgo = str => {
    const d = parseDate(str);
    if (!d) return '';
    const mins = Math.round((Date.now() - d) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.round(mins/60)}h ago`;
    return `${Math.round(mins/1440)}d ago`;
  };

  return new Response(JSON.stringify({
    items: final.map(i => ({ ...i, timeAgo: timeAgo(i.pubDate) })),
    count: final.length,
    sources: [...new Set(final.map(i => i.source))]
  }), { headers: corsHeaders });
}
