import re
import unittest


def masked_html():
    with open("index.html", encoding="utf-8") as f:
        s = f.read()
    for pat in (r"<script\b.*?</script>", r"<style\b.*?</style>", r"<!--.*?-->"):
        s = re.sub(pat, lambda m: re.sub(r"[^\n]", " ", m.group(0)), s, flags=re.S | re.I)
    return s


class Markup(unittest.TestCase):
    def test_div_tags_balance(self):
        s = masked_html()
        depth, bad = 0, 0
        for t in re.findall(r"</?div\b", s, flags=re.I):
            depth += 1 if t.lower() == "<div" else -1
            if depth < 0:
                bad += 1
                depth = 0
        self.assertEqual((bad, depth), (0, 0))

    def test_every_tab_panel_is_inside_the_content_wrapper(self):
        s = masked_html()
        lines = s.split("\n")
        first = next(i for i, l in enumerate(lines) if 'class="content"' in l)
        depth, close = 0, None
        for k in range(first, len(lines)):
            for t in re.findall(r"</?div\b", lines[k]):
                depth += 1 if t == "<div" else -1
            if depth == 0 and close is None:
                close = k
        outside = [k + 1 for k, l in enumerate(lines) if k > close and re.search(r'class="tab-panel', l)]
        self.assertEqual(outside, [])

    def test_shared_helpers_are_loaded_before_every_dashboard(self):
        with open("index.html", encoding="utf-8") as f:
            s = f.read()
        self.assertLess(s.index('src="shared.js"'), s.index('src="market_clock.js"'))
        self.assertLess(s.index('src="market_clock.js"'), s.index('src="dashboard1.js"'))
        self.assertNotIn('src="macro.js"', s)


if __name__ == "__main__":
    unittest.main()
