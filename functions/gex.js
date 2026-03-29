// Cloudflare Pages Function - /gex
// Fetches SPY options chain from CBOE and computes GEX + max pain live
// Available any time CBOE serves data (market hours + extended)
// Returns: { gex: {..., bar: {...}}, max_pain: [...], pcr_vol, pcr_oi, atm_iv, spot, updated }

function normalizeIV(value) {
  const iv = Number(value);
  if (!Number.isFinite(iv) || iv <= 0) return 0;
  return iv > 1 ? iv / 100 : iv;
}

function formatSignedDollar(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "$0";

  const abs = Math.abs(num);
  const sign = num >= 0 ? "+" : "-";

  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
}

function buildGexBar(strikes, spot, flipPoint) {
  if (!Array.isArray(strikes) || !strikes.length) return null;

  const maxAbsGex = strikes.reduce((max, row) => {
    const value = Math.abs(Number(row?.gex) || 0);
    return value > max ? value : max;
  }, 1);

  const rows = strikes.map((row) => {
    const strike = Number(row.strike);
    const gex = Number(row.gex) || 0;
    const rawWidthPct = (Math.abs(gex) / maxAbsGex) * 50;
    const widthPct = gex === 0 ? 0 : Math.max(1.5, Math.round(rawWidthPct * 10) / 10);
    const positive = gex >= 0;
    const isSpot = Number.isFinite(spot) && Math.abs(strike - spot) < 2.5;
    const isFlip = Number.isFinite(flipPoint) && Math.abs(strike - flipPoint) < 1.5;

    let marker = "";
    let markerColor = "#8b98b3";
    let background = "transparent";
    let labelColor = "#c7cedb";

    if (isSpot && isFlip) {
      marker = "SPOT/FLIP";
      markerColor = "#00ccff";
      background = "rgba(0,204,255,0.10)";
      labelColor = "#00ccff";
    } else if (isSpot) {
      marker = "SPOT";
      markerColor = "#00ccff";
      background = "rgba(0,204,255,0.08)";
      labelColor = "#00ccff";
    } else if (isFlip) {
      marker = "FLIP";
      markerColor = "#ffcc00";
      background = "rgba(255,204,0,0.06)";
      labelColor = "#ffcc00";
    }

    return {
      strike,
      gex,
      width_pct: widthPct,
      side: positive ? "right" : "left",
      color: positive ? "#00ff88" : "#ff3355",
      label: formatSignedDollar(gex),
      is_spot: isSpot,
      is_flip: isFlip,
      marker,
      marker_color: markerColor,
      background,
      label_color: labelColor,
    };
  });

  const html = `
<div style="display:flex;flex-direction:column;gap:4px;">
${rows.map((row) => `  <div style="display:flex;align-items:center;gap:8px;padding:3px 6px;border-radius:4px;background:${row.background};">
    <span style="font-family:'Share Tech Mono',monospace;font-size:12px;width:55px;text-align:right;color:${row.label_color};">$${row.strike}</span>
    <div style="flex:1;height:16px;background:#131722;border-radius:3px;overflow:hidden;position:relative;">
      ${row.side === "right"
        ? `<div style="position:absolute;left:50%;width:${row.width_pct}%;height:100%;background:${row.color}88;border-radius:0 3px 3px 0;"></div>`
        : `<div style="position:absolute;right:50%;width:${row.width_pct}%;height:100%;background:${row.color}88;border-radius:3px 0 0 3px;"></div>`}
      <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(139,152,179,0.35);"></div>
    </div>
    <span style="font-family:'Share Tech Mono',monospace;font-size:11px;width:78px;color:${row.color};text-align:right;">${row.label}</span>
    <span style="font-family:'Orbitron',monospace;font-size:7px;width:42px;color:${row.marker_color};text-align:right;">${row.marker}</span>
  </div>`).join("\n")}
</div>`.trim();

  return {
    spot: Number.isFinite(spot) ? Math.round(spot * 100) / 100 : null,
    flip_point: Number.isFinite(flipPoint) ? flipPoint : null,
    center_line_pct: 50,
    max_abs_gex: Math.round(maxAbsGex),
    rows,
    html,
  };
}

export async function onRequest(context) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "max-age=300",
  };

  try {
    const url = "https://cdn.cboe.com/api/global/delayed_quotes/options/SPY.json";
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "Accept": "application/json",
        "Referer": "https://www.cboe.com/",
      },
    });

    if (!resp.ok) throw new Error(`CBOE returned ${resp.status}`);

    const data = await resp.json();
    const raw = data?.data;
    if (!raw) throw new Error("No data field");

    const spot = Number.parseFloat(raw.current_price || 0);
    const options = raw.options || [];
    if (!spot || !options.length) throw new Error("No spot or options");

    const today = new Date();
    const pattern = /^SPY(\d{6})([CP])(\d+)$/;
    const parsed = [];

    for (const opt of options) {
      const match = pattern.exec(opt.option || "");
      if (!match) continue;

      const expDate = new Date(`20${match[1].slice(0, 2)}-${match[1].slice(2, 4)}-${match[1].slice(4, 6)}`);
      const dte = Math.round((expDate - today) / 86400000);
      if (dte < 0) continue;

      const strike = Number.parseInt(match[3], 10) / 1000;
      if (strike < spot * 0.75 || strike > spot * 1.25) continue;

      parsed.push({
        exp: expDate.toISOString().slice(0, 10),
        dte,
        cp: match[2],
        strike,
        iv: normalizeIV(opt.iv),
        oi: Number.parseInt(opt.open_interest || 0, 10),
        vol: Number.parseInt(opt.volume || 0, 10),
        gamma: Number.parseFloat(opt.gamma || 0),
        bid: Number.parseFloat(opt.bid || 0),
        ask: Number.parseFloat(opt.ask || 0),
      });
    }

    if (!parsed.length) throw new Error("No valid options after parsing");

    const expiries = [...new Set(parsed.map((option) => option.exp))].sort();
    const nearExpiries = expiries.slice(0, 8);

    // -- PCR ---------------------------------------------------------------
    const totalCallVol = parsed.filter((option) => option.cp === "C").reduce((sum, option) => sum + option.vol, 0);
    const totalPutVol = parsed.filter((option) => option.cp === "P").reduce((sum, option) => sum + option.vol, 0);
    const totalCallOI = parsed.filter((option) => option.cp === "C").reduce((sum, option) => sum + option.oi, 0);
    const totalPutOI = parsed.filter((option) => option.cp === "P").reduce((sum, option) => sum + option.oi, 0);
    const pcrVol = totalCallVol ? Math.round((totalPutVol / totalCallVol) * 1000) / 1000 : null;
    const pcrOI = totalCallOI ? Math.round((totalPutOI / totalCallOI) * 1000) / 1000 : null;

    // -- ATM IV ------------------------------------------------------------
    let atmIV = null;
    for (const exp of expiries.slice(0, 3)) {
      const nearestOpts = parsed
        .filter((option) => option.exp === exp && option.iv > 0)
        .sort((a, b) => {
          const distance = Math.abs(a.strike - spot) - Math.abs(b.strike - spot);
          if (distance !== 0) return distance;
          return (b.oi + b.vol) - (a.oi + a.vol);
        });

      if (!nearestOpts.length) continue;

      const closestDistance = Math.abs(nearestOpts[0].strike - spot);
      const atmCluster = nearestOpts
        .filter((option) => Math.abs(Math.abs(option.strike - spot) - closestDistance) < 0.001)
        .slice(0, 4);

      const ivValues = atmCluster.map((option) => option.iv).filter((value) => value > 0);
      if (ivValues.length) {
        const averageIV = ivValues.reduce((sum, iv) => sum + iv, 0) / ivValues.length;
        atmIV = Math.round(averageIV * 10000) / 10000;
        break;
      }
    }

    // -- Max Pain per expiry ----------------------------------------------
    const maxPainList = [];
    for (const exp of nearExpiries) {
      const expOpts = parsed.filter((option) => (
        option.exp === exp &&
        option.oi >= 50 &&
        spot * 0.85 <= option.strike &&
        option.strike <= spot * 1.15
      ));

      if (!expOpts.length) continue;

      const strikeMap = {};
      for (const option of expOpts) {
        if (!strikeMap[option.strike]) strikeMap[option.strike] = { call: 0, put: 0 };
        strikeMap[option.strike][option.cp === "C" ? "call" : "put"] += option.oi;
      }

      const strikes = Object.keys(strikeMap).map(Number);
      let minPain = Infinity;
      let maxPainStrike = null;

      for (const strike of strikes) {
        let loss = 0;
        for (const level of strikes) {
          loss += strikeMap[level].call * Math.max(level - strike, 0) * 100;
          loss += strikeMap[level].put * Math.max(strike - level, 0) * 100;
        }
        if (loss < minPain) {
          minPain = loss;
          maxPainStrike = strike;
        }
      }

      if (maxPainStrike !== null) {
        const totalOI = Object.values(strikeMap).reduce((sum, value) => sum + value.call + value.put, 0);
        const expDate = new Date(`${exp}T12:00:00`);
        const dte = Math.ceil((expDate - today) / 86400000);
        maxPainList.push({
          expiry: exp,
          dte,
          max_pain: maxPainStrike,
          total_oi: totalOI,
          dist_from_spot: Math.round((maxPainStrike - spot) * 100) / 100,
        });
      }
    }

    // -- GEX ---------------------------------------------------------------
    const gexByStrike = {};
    let totalCallGEX = 0;
    let totalPutGEX = 0;

    for (const option of parsed) {
      if (!nearExpiries.includes(option.exp)) continue;
      if (!option.oi) continue;

      let gamma = option.gamma;
      if (!gamma && option.iv > 0) {
        const t = Math.max(option.dte, 1) / 365;
        try {
          const d1 = (
            Math.log(spot / option.strike) +
            0.5 * option.iv * option.iv * t
          ) / (option.iv * Math.sqrt(t));
          gamma = Math.exp(-0.5 * d1 * d1) / (spot * option.iv * Math.sqrt(2 * Math.PI * t));
        } catch {
          continue;
        }
      }

      if (!gamma) continue;

      const gexVal = option.oi * gamma * spot * spot * 0.01 * 100;
      if (option.cp === "C") {
        gexByStrike[option.strike] = (gexByStrike[option.strike] || 0) + gexVal;
        totalCallGEX += gexVal;
      } else {
        gexByStrike[option.strike] = (gexByStrike[option.strike] || 0) - gexVal;
        totalPutGEX -= gexVal;
      }
    }

    const totalNetGEX = totalCallGEX + totalPutGEX;
    const sortedStrikes = Object.keys(gexByStrike).map(Number).sort((a, b) => a - b);

    let flipPoint = null;
    for (let i = 0; i < sortedStrikes.length - 1; i += 1) {
      const leftStrike = sortedStrikes[i];
      const rightStrike = sortedStrikes[i + 1];
      const leftGex = gexByStrike[leftStrike];
      const rightGex = gexByStrike[rightStrike];

      if (leftGex * rightGex < 0) {
        flipPoint = Math.round((
          leftStrike +
          (rightStrike - leftStrike) * Math.abs(leftGex) / (Math.abs(leftGex) + Math.abs(rightGex))
        ) * 100) / 100;
        break;
      }
    }

    const above = sortedStrikes.filter((strike) => strike > spot && gexByStrike[strike] > 0);
    const below = sortedStrikes.filter((strike) => strike < spot && gexByStrike[strike] < 0);
    const resistance = above.length
      ? above.reduce((best, strike) => (gexByStrike[best] > gexByStrike[strike] ? best : strike))
      : null;
    const support = below.length
      ? below.reduce((best, strike) => (gexByStrike[best] < gexByStrike[strike] ? best : strike))
      : null;

    const top20 = sortedStrikes
      .map((strike) => ({ strike, gex: Math.round(gexByStrike[strike]) }))
      .sort((a, b) => Math.abs(b.gex) - Math.abs(a.gex))
      .slice(0, 20)
      .sort((a, b) => a.strike - b.strike);

    const gexBar = buildGexBar(top20, spot, flipPoint);

    const regime = totalNetGEX > 1e9
      ? "STRONGLY STABILIZING"
      : totalNetGEX > 0
        ? "STABILIZING"
        : totalNetGEX > -1e9
          ? "SLIGHTLY DESTABILIZING"
          : "DESTABILIZING";

    const regimeDesc = totalNetGEX > 1e9
      ? "Dealers are heavily long gamma. Strong resistance to large moves."
      : totalNetGEX > 0
        ? "Dealers long gamma - they buy dips and sell rips, containing moves."
        : totalNetGEX > -1e9
          ? "Dealers slightly short gamma. Moves may extend further than normal."
          : "Dealers short gamma - they amplify moves in either direction.";

    return new Response(JSON.stringify({
      spot,
      updated: new Date().toISOString(),
      source: "cboe_live",
      gex: {
        net_gex: Math.round(totalNetGEX),
        call_gex: Math.round(totalCallGEX),
        put_gex: Math.round(totalPutGEX),
        flip_point: flipPoint,
        resistance,
        support,
        regime,
        regime_desc: regimeDesc,
        strikes: top20,
        bar: gexBar,
        spot,
      },
      max_pain: maxPainList,
      pcr_vol: pcrVol,
      pcr_oi: pcrOI,
      atm_iv: atmIV,
      total_call_vol: totalCallVol,
      total_put_vol: totalPutVol,
      total_call_oi: totalCallOI,
      total_put_oi: totalPutOI,
    }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers, status: 200 });
  }
}
