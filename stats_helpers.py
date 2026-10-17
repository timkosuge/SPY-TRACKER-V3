import math


def wilson(k, n, z=1.96):
    """95% Wilson interval for a proportion, as percentages; None when n is 0."""
    if not n:
        return None
    p = k / n
    d = 1 + z * z / n
    c = p + z * z / (2 * n)
    r = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return (max(0.0, (c - r) / d) * 100, min(1.0, (c + r) / d) * 100)


def percentile(values, q):
    """Linear-interpolated percentile of a list; None when empty."""
    if not values:
        return None
    s = sorted(values)
    pos = (len(s) - 1) * q
    lo, hi = int(math.floor(pos)), int(math.ceil(pos))
    return s[lo] + (s[hi] - s[lo]) * (pos - lo)


def delta_theta(spot, strike, iv, years, call):
    """Black-Scholes delta and theta per year at a zero rate; None when the contract has no time or no volatility."""
    if years <= 0 or iv <= 0 or spot <= 0 or strike <= 0:
        return None
    d1 = (math.log(spot / strike) + 0.5 * iv * iv * years) / (iv * math.sqrt(years))
    pdf = math.exp(-d1 * d1 / 2) / math.sqrt(2 * math.pi)
    cdf = 0.5 * (1 + math.erf(d1 / math.sqrt(2)))
    return (cdf if call else cdf - 1), -spot * pdf * iv / (2 * math.sqrt(years))
