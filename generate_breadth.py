import csv
import json
from datetime import datetime

import yfinance as yf
import pandas as pd

from payload_meta import stamp

CONSTITUENTS = "data/sp500_constituents.csv"
OUTPUT = "breadth_data.json"


def load_symbols():
    with open(CONSTITUENTS, newline="") as f:
        return [r["Symbol"].replace(".", "-") for r in csv.DictReader(f)]


def compute(symbols):
    px = yf.download(symbols, period="1y", interval="1d", auto_adjust=False, group_by="column", threads=True, progress=False)
    close = px["Close"].dropna(how="all")
    vol = px["Volume"].reindex(close.index)
    high = px["High"].reindex(close.index)
    low = px["Low"].reindex(close.index)
    if len(close) < 2:
        raise RuntimeError("not enough daily rows for breadth")
    today, prev = close.iloc[-1], close.iloc[-2]
    valid = today.notna() & prev.notna()
    chg = (today - prev)[valid]
    adv = chg[chg > 0].index; dec = chg[chg < 0].index; unch = chg[chg == 0].index
    v_today = vol.iloc[-1]
    hi52_prior = high.rolling(252, min_periods=200).max().shift(1).iloc[-1]
    lo52_prior = low.rolling(252, min_periods=200).min().shift(1).iloc[-1]
    h_today, l_today = high.iloc[-1], low.iloc[-1]
    ma50 = close.rolling(50).mean().iloc[-1]
    ma200 = close.rolling(200).mean().iloc[-1]
    n = int(valid.sum())
    return {
        "date": close.index[-1].strftime("%Y-%m-%d"),
        "universe": "S&P 500 constituents",
        "issues": n,
        "advancing": int(len(adv)), "declining": int(len(dec)), "unchanged": int(len(unch)),
        "up_volume": int(v_today[adv].sum()), "down_volume": int(v_today[dec].sum()),
        "new_highs": int((h_today[valid] >= hi52_prior[valid]).sum()), "new_lows": int((l_today[valid] <= lo52_prior[valid]).sum()),
        "pct_above_50d": round(float((today[valid] > ma50[valid]).mean() * 100), 1),
        "pct_above_200d": round(float((today[valid] > ma200[valid]).mean() * 100), 1),
    }


def main():
    symbols = load_symbols()
    data = compute(symbols)
    data.update(stamp())
    with open(OUTPUT, "w") as f:
        json.dump(data, f, indent=1)
    print(f"{OUTPUT}: {data['date']} adv {data['advancing']} dec {data['declining']} highs {data['new_highs']} lows {data['new_lows']} >50d {data['pct_above_50d']}% >200d {data['pct_above_200d']}%")


if __name__ == "__main__":
    main()
