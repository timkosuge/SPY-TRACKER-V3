"""The Setup Engine's condition registry: a fixed vocabulary, each entry a pure function of one day-frame row."""
from datetime import date


def _gap_up(th):
    return lambda r: r["gap_pct"] is not None and r["gap_pct"] > th


def _gap_down(th):
    return lambda r: r["gap_pct"] is not None and r["gap_pct"] < -th


CONDITIONS = [
    {"name": "gap_up_030", "label": "Gap up above 0.30%", "category": "gap", "test": _gap_up(0.30), "requires": ["daily_ohlcv"], "earliest": date(1993, 2, 1)},
    {"name": "gap_up_060", "label": "Gap up above 0.60%", "category": "gap", "test": _gap_up(0.60), "requires": ["daily_ohlcv"], "earliest": date(1993, 2, 1)},
    {"name": "gap_up_100", "label": "Gap up above 1.00%", "category": "gap", "test": _gap_up(1.00), "requires": ["daily_ohlcv"], "earliest": date(1993, 2, 1)},
    {"name": "gap_down_030", "label": "Gap down below −0.30%", "category": "gap", "test": _gap_down(0.30), "requires": ["daily_ohlcv"], "earliest": date(1993, 2, 1)},
    {"name": "gap_down_060", "label": "Gap down below −0.60%", "category": "gap", "test": _gap_down(0.60), "requires": ["daily_ohlcv"], "earliest": date(1993, 2, 1)},
    {"name": "gap_down_100", "label": "Gap down below −1.00%", "category": "gap", "test": _gap_down(1.00), "requires": ["daily_ohlcv"], "earliest": date(1993, 2, 1)},
    {"name": "gap_flat", "label": "Flat open (within ±0.25%)", "category": "gap", "test": lambda r: r["gap_pct"] is not None and abs(r["gap_pct"]) <= 0.25, "requires": ["daily_ohlcv"], "earliest": date(1993, 2, 1)},
    {"name": "prior_red", "label": "Prior session closed below its open", "category": "prior_session", "test": lambda r: r["prior_oc_pct"] is not None and r["prior_oc_pct"] < 0, "requires": ["daily_ohlcv"], "earliest": date(1993, 2, 1)},
    {"name": "prior_green", "label": "Prior session closed above its open", "category": "prior_session", "test": lambda r: r["prior_oc_pct"] is not None and r["prior_oc_pct"] > 0, "requires": ["daily_ohlcv"], "earliest": date(1993, 2, 1)},
    {"name": "prior_big_red", "label": "Prior session fell more than 1% open to close", "category": "prior_session", "test": lambda r: r["prior_oc_pct"] is not None and r["prior_oc_pct"] < -1.0, "requires": ["daily_ohlcv"], "earliest": date(1993, 2, 1)},
    {"name": "prior_big_green", "label": "Prior session rose more than 1% open to close", "category": "prior_session", "test": lambda r: r["prior_oc_pct"] is not None and r["prior_oc_pct"] > 1.0, "requires": ["daily_ohlcv"], "earliest": date(1993, 2, 1)},
    {"name": "monday", "label": "Monday", "category": "weekday", "test": lambda r: r["weekday"] == 0, "requires": ["daily_ohlcv"], "earliest": date(1993, 1, 29)},
    {"name": "tuesday", "label": "Tuesday", "category": "weekday", "test": lambda r: r["weekday"] == 1, "requires": ["daily_ohlcv"], "earliest": date(1993, 1, 29)},
    {"name": "wednesday", "label": "Wednesday", "category": "weekday", "test": lambda r: r["weekday"] == 2, "requires": ["daily_ohlcv"], "earliest": date(1993, 1, 29)},
    {"name": "thursday", "label": "Thursday", "category": "weekday", "test": lambda r: r["weekday"] == 3, "requires": ["daily_ohlcv"], "earliest": date(1993, 1, 29)},
    {"name": "friday", "label": "Friday", "category": "weekday", "test": lambda r: r["weekday"] == 4, "requires": ["daily_ohlcv"], "earliest": date(1993, 1, 29)},
    {"name": "monthly_opex", "label": "Monthly expiry day", "category": "calendar", "test": lambda r: bool(r["is_monthly_opex"]), "requires": ["daily_ohlcv"], "earliest": date(1993, 1, 29)},
    {"name": "month_first", "label": "First session of the month", "category": "calendar", "test": lambda r: bool(r["is_month_first"]), "requires": ["daily_ohlcv"], "earliest": date(1993, 1, 29)},
    {"name": "month_last", "label": "Last session of the month", "category": "calendar", "test": lambda r: bool(r["is_month_last"]), "requires": ["daily_ohlcv"], "earliest": date(1993, 1, 29)},
    {"name": "open_above_wem_high", "label": "Opened above the static weekly range", "category": "weekly_range", "test": lambda r: r["wem_high"] is not None and r["open"] > r["wem_high"], "requires": ["weekly_em"], "earliest": None},
    {"name": "open_below_wem_low", "label": "Opened below the static weekly range", "category": "weekly_range", "test": lambda r: r["wem_low"] is not None and r["open"] < r["wem_low"], "requires": ["weekly_em"], "earliest": None},
    {"name": "open_inside_wem", "label": "Opened inside the static weekly range", "category": "weekly_range", "test": lambda r: r["wem_low"] is not None and r["wem_low"] <= r["open"] <= r["wem_high"], "requires": ["weekly_em"], "earliest": None},
    {"name": "vix_under_15", "label": "VIX closed under 15", "category": "vix_regime", "test": lambda r: r["vix"] is not None and r["vix"] < 15, "requires": ["vix_daily"], "earliest": None},
    {"name": "vix_15_20", "label": "VIX closed 15 to 20", "category": "vix_regime", "test": lambda r: r["vix"] is not None and 15 <= r["vix"] < 20, "requires": ["vix_daily"], "earliest": None},
    {"name": "vix_20_30", "label": "VIX closed 20 to 30", "category": "vix_regime", "test": lambda r: r["vix"] is not None and 20 <= r["vix"] < 30, "requires": ["vix_daily"], "earliest": None},
    {"name": "vix_over_30", "label": "VIX closed over 30", "category": "vix_regime", "test": lambda r: r["vix"] is not None and r["vix"] >= 30, "requires": ["vix_daily"], "earliest": None},
    {"name": "dd_over_5", "label": "Prior close more than 5% below the 20-session high", "category": "drawdown", "test": lambda r: r["dd20"] is not None and r["dd20"] < -5, "requires": ["daily_ohlcv"], "earliest": date(1993, 3, 1)},
    {"name": "dd_2_5", "label": "Prior close 2 to 5% below the 20-session high", "category": "drawdown", "test": lambda r: r["dd20"] is not None and -5 <= r["dd20"] < -2, "requires": ["daily_ohlcv"], "earliest": date(1993, 3, 1)},
    {"name": "dd_within_2", "label": "Prior close within 2% of the 20-session high", "category": "drawdown", "test": lambda r: r["dd20"] is not None and r["dd20"] >= -2, "requires": ["daily_ohlcv"], "earliest": date(1993, 3, 1)},
    {"name": "cpi_day", "label": "CPI release morning", "category": "event", "test": lambda r: bool(r["is_cpi"]), "requires": ["release_dates"], "earliest": None},
    {"name": "nfp_day", "label": "Payrolls release morning", "category": "event", "test": lambda r: bool(r["is_nfp"]), "requires": ["release_dates"], "earliest": None},
    {"name": "fomc_day", "label": "FOMC decision day", "category": "event", "test": lambda r: bool(r["is_fomc"]), "requires": ["release_dates"], "earliest": None},
    {"name": "no_event", "label": "No scheduled release (CPI, payrolls, FOMC)", "category": "event", "test": lambda r: not (r["is_cpi"] or r["is_nfp"] or r["is_fomc"]), "requires": ["release_dates"], "earliest": None},
]

BY_NAME = {c["name"]: c for c in CONDITIONS}


class ChainError(ValueError):
    pass


def validate_chain(names):
    """A chain may not nest two conditions of one category; every name must exist."""
    seen = {}
    for n in names:
        if n not in BY_NAME:
            raise ChainError(f"unknown condition: {n}")
        cat = BY_NAME[n]["category"]
        if cat in seen:
            raise ChainError(f"{n} and {seen[cat]} are both in the '{cat}' category; the second only shrinks the sample")
        seen[cat] = n
    return [BY_NAME[n] for n in names]


def pool_start(conds, earliest_by_requirement):
    """The first date on which every condition in the chain can be evaluated, and which condition bound it."""
    start, bound = None, None
    for c in conds:
        e = c["earliest"]
        for req in c["requires"]:
            e2 = earliest_by_requirement.get(req)
            if e2 is not None and (e is None or e2 > e):
                e = e2
        if e is not None and (start is None or e > start):
            start, bound = e, c["name"]
    return start, bound


def public_registry():
    return [{"name": c["name"], "label": c["label"], "category": c["category"], "requires": c["requires"]} for c in CONDITIONS]
