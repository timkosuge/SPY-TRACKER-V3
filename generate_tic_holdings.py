import json
import re
import urllib.request

from payload_meta import stamp

SOURCES = [
    "https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/mfhhis01.txt",
    "https://ticdata.treasury.gov/resource-center/data-chart-center/tic/Documents/mfh.txt",
]
OUTPUT = "tic_holdings.js"
COUNTRIES = {"Japan": "japan", "China, Mainland": "china", "United Kingdom": "uk", "Grand Total": "total"}
MONTHS = {m: i + 1 for i, m in enumerate(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("latin-1")


def parse(text):
    """Every block of the file: a month row, a year row, then country rows. Returns {key: {YYYY-MM: billions}}."""
    lines = [l.rstrip("\r") for l in text.split("\n")]
    out = {v: {} for v in COUNTRIES.values()}
    i = 0
    while i < len(lines):
        cells = [c.strip() for c in re.split(r"\t|\s{2,}", lines[i]) if c.strip()]
        if cells and all(c in MONTHS for c in cells):
            ycells = [c.strip() for c in re.split(r"\t|\s{2,}", lines[i + 1]) if c.strip()]
            years = [c for c in ycells if re.fullmatch(r"\d{4}", c)]
            if len(years) == len(cells):
                periods = [f"{y}-{MONTHS[m]:02d}" for m, y in zip(cells, years)]
                j = i + 2
                while j < len(lines) and not (lambda cc: cc and all(c in MONTHS for c in cc))([c.strip() for c in re.split(r"\t|\s{2,}", lines[j]) if c.strip()]):
                    row = [c.strip().strip('"') for c in re.split(r"\t|\s{2,}", lines[j]) if c.strip()]
                    if row and row[0] in COUNTRIES:
                        vals = row[1:1 + len(periods)]
                        for p, v in zip(periods, vals):
                            try:
                                out[COUNTRIES[row[0]]].setdefault(p, float(v.replace(",", "")))
                            except ValueError:
                                pass
                    j += 1
                i = j
                continue
        i += 1
    return out


def main():
    merged = {v: {} for v in COUNTRIES.values()}
    for url in SOURCES:
        try:
            for k, series in parse(fetch(url)).items():
                for p, v in series.items():
                    merged[k].setdefault(p, v)
        except Exception as e:
            print(f"  {url}: {e}")
    if not merged["japan"]:
        raise RuntimeError("no TIC data parsed")
    data = {k: [{"d": p, "v": merged[k][p]} for p in sorted(merged[k])] for k in merged}
    latest = data["japan"][-1]["d"]
    payload = {"unit": "billions of U.S. dollars, holdings at end of month", "source": "U.S. Treasury TIC, Major Foreign Holders of Treasury Securities", "latest": latest, "series": data}
    payload.update(stamp())
    with open(OUTPUT, "w") as f:
        f.write("const TIC_HOLDINGS = " + json.dumps(payload, separators=(",", ":")) + ";\n")
    print(f"{OUTPUT}: {len(data['japan'])} months through {latest}; Japan {data['japan'][-1]['v']}B China {data['china'][-1]['v']}B total {data['total'][-1]['v']}B")


if __name__ == "__main__":
    main()
