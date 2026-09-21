from datetime import date, timedelta


def easter(year):
    a = year % 19; b = year // 100; c = year % 100; d = b // 4; e = b % 4
    f = (b + 8) // 25; g = (b - f + 1) // 3; h = (19 * a + b - d - g + 15) % 30
    i = c // 4; k = c % 4; l = (32 + 2 * e + 2 * i - h - k) % 7; m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31; day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)


def nth_weekday(year, month, weekday, n):
    d = date(year, month, 1)
    d += timedelta(days=(weekday - d.weekday()) % 7)
    return d + timedelta(weeks=n - 1)


def last_weekday(year, month, weekday):
    d = date(year, month + 1, 1) - timedelta(days=1) if month < 12 else date(year, 12, 31)
    return d - timedelta(days=(d.weekday() - weekday) % 7)


def observed(d):
    if d.weekday() == 5:
        return d - timedelta(days=1)
    if d.weekday() == 6:
        return d + timedelta(days=1)
    return d


SPECIAL_CLOSURES = {
    date(2001, 9, 11), date(2001, 9, 12), date(2001, 9, 13), date(2001, 9, 14),
    date(2004, 6, 11), date(2007, 1, 2), date(2012, 10, 29), date(2012, 10, 30),
    date(2018, 12, 5), date(2025, 1, 9),
}


def nyse_holidays(year):
    """NYSE full-day closures for a year, from the exchange's standing rules."""
    hs = {
        date(year, 1, 2) if date(year, 1, 1).weekday() == 6 else date(year, 1, 1),
        nth_weekday(year, 1, 0, 3),
        nth_weekday(year, 2, 0, 3),
        easter(year) - timedelta(days=2),
        last_weekday(year, 5, 0),
        observed(date(year, 7, 4)),
        nth_weekday(year, 9, 0, 1),
        nth_weekday(year, 11, 3, 4),
        observed(date(year, 12, 25)),
    }
    if year >= 2022:
        hs.add(observed(date(year, 6, 19)))
    hs |= {d for d in SPECIAL_CLOSURES if d.year == year}
    return hs


def is_trading_day(d):
    return d.weekday() < 5 and d not in nyse_holidays(d.year)


def add_trading_days(start, n):
    """The n-th trading day after start (n may be 0, giving start if it is a trading day, else the next)."""
    d = start
    if n == 0:
        while not is_trading_day(d):
            d += timedelta(days=1)
        return d
    c = 0
    while c < n:
        d += timedelta(days=1)
        if is_trading_day(d):
            c += 1
    return d


def trading_days_between(a, b):
    """Trading days strictly after a up to and including b."""
    if b <= a:
        return 0
    d, c = a, 0
    while d < b:
        d += timedelta(days=1)
        if is_trading_day(d):
            c += 1
    return c
