export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache'
  };

  // Try Fed's official calendar page
  try {
    const r = await fetch('https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      }
    });
    if (r.ok) {
      const text = await r.text();
      const dates = [];
      
      // Fed page format: dates appear as "January 28-29, 2026*" or "March 18-19, 2026"
      // The * indicates press conference
      const months = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
      
      // Match patterns like "April 28-29, 2026" or "June 17-18, 2026*"
      const pattern = new RegExp(
        `(${months.join('|')})\\s+(\\d{1,2})(?:[-–](\\d{1,2}))?(?:,?\\s*)?[,]?\\s*(202[5-9])\\s*(\\*?)`,
        'g'
      );
      
      let match;
      const today = new Date();
      today.setHours(0,0,0,0);
      
      while ((match = pattern.exec(text)) !== null) {
        const month = months.indexOf(match[1]) + 1;
        const year = parseInt(match[4]);
        // Use the last day of the range (decision day)
        const day = parseInt(match[3] || match[2]);
        const hasPresser = match[5] === '*';
        
        const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const d = new Date(dateStr + 'T00:00:00');
        
        if (d >= today && year <= today.getFullYear() + 1) {
          dates.push({
            date: dateStr,
            press_conference: hasPresser || true, // Most meetings have pressers now
            display: `${match[1]} ${day}, ${year}`
          });
        }
      }
      
      if (dates.length > 0) {
        // Deduplicate
        const unique = dates.filter((d, i, arr) => 
          arr.findIndex(x => x.date === d.date) === i
        ).sort((a, b) => a.date.localeCompare(b.date));
        
        return new Response(JSON.stringify({
          source: 'federalreserve.gov',
          meetings: unique
        }), { headers: corsHeaders });
      }
    }
  } catch(e) {}

  // Hardcoded fallback with full 2026 schedule
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const all2026 = [
    { date: '2026-01-28', press_conference: true,  display: 'January 28, 2026' },
    { date: '2026-03-18', press_conference: true,  display: 'March 18, 2026' },
    { date: '2026-04-29', press_conference: true,  display: 'April 29, 2026' },
    { date: '2026-06-17', press_conference: true,  display: 'June 17, 2026' },
    { date: '2026-07-29', press_conference: true,  display: 'July 29, 2026' },
    { date: '2026-09-16', press_conference: true,  display: 'September 16, 2026' },
    { date: '2026-10-28', press_conference: true,  display: 'October 28, 2026' },
    { date: '2026-12-16', press_conference: true,  display: 'December 16, 2026' },
  ].filter(m => new Date(m.date + 'T00:00:00') >= today);

  return new Response(JSON.stringify({
    source: 'hardcoded_2026',
    meetings: all2026
  }), { headers: corsHeaders });
}
