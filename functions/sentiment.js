export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Content-Type': 'application/json'
  };

  // AAII data via their CSV download (most reliable)
  try {
    const r = await fetch('https://www.aaii.com/files/surveys/sentiment.xls', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.aaii.com/sentimentsurvey' }
    });
    if (r.ok) {
      // XLS is actually TSV/CSV format for AAII
      const text = await r.text();
      const lines = text.split('\n').filter(l => l.trim());
      // Find last data row - format is: date, bullish, neutral, bearish, ...
      for (let i = lines.length - 1; i >= 0; i--) {
        const cols = lines[i].split('\t');
        if (cols.length >= 4) {
          const bull = parseFloat(cols[1]);
          const neu = parseFloat(cols[2]);
          const bear = parseFloat(cols[3]);
          if (!isNaN(bull) && bull > 0 && bull < 100) {
            return new Response(JSON.stringify({
              date: cols[0]?.trim(),
              bullish: Math.round(bull * 100) / 100,
              neutral: Math.round(neu * 100) / 100,
              bearish: Math.round(bear * 100) / 100,
              spread: Math.round((bull - bear) * 100) / 100,
              avg_bullish: 37.5,
              avg_bearish: 31.0,
              source: 'aaii_xls'
            }), { headers: corsHeaders });
          }
        }
      }
    }
  } catch(e) {}

  // Try AAII HTML page and parse the table
  try {
    const r = await fetch('https://www.aaii.com/sentimentsurvey', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    if (r.ok) {
      const text = await r.text();
      // Look for percentage values in the sentiment table
      const bullMatch = text.match(/class="[^"]*bull[^"]*"[^>]*>\s*([\d.]+)%/i) ||
                        text.match(/Bullish[^<]*<[^>]+>\s*([\d.]+)%/i) ||
                        text.match(/>(\d+\.?\d*)%<\/td>[^<]*<td[^>]*>[^<]*<\/td>[^<]*<td/i);
      const numbers = text.match(/(\d{1,2}\.\d)%.*?(\d{1,2}\.\d)%.*?(\d{1,2}\.\d)%/s);
      if (numbers) {
        return new Response(JSON.stringify({
          bullish: parseFloat(numbers[1]),
          neutral: parseFloat(numbers[2]),
          bearish: parseFloat(numbers[3]),
          spread: parseFloat(numbers[1]) - parseFloat(numbers[3]),
          avg_bullish: 37.5,
          avg_bearish: 31.0,
          source: 'aaii_html'
        }), { headers: corsHeaders });
      }
    }
  } catch(e) {}

  // Return last known values as static fallback (updated weekly manually if needed)
  // As of March 2026 - Extreme fear environment
  return new Response(JSON.stringify({
    bullish: 19.4,
    neutral: 28.2,
    bearish: 52.4,
    spread: -33.0,
    avg_bullish: 37.5,
    avg_bearish: 31.0,
    source: 'static_fallback',
    note: 'Static data — AAII live feed unavailable. Update weekly.'
  }), { headers: corsHeaders });
}
