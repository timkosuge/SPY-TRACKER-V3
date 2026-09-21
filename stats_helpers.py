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
