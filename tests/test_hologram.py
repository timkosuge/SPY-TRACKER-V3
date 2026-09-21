import json
import re
import subprocess
import unittest

TOGGLE = r"""
const fs = require('fs');
const store = {};
global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
const mk = () => { const c = new Set(); return { classList: { toggle: (n, on) => on ? c.add(n) : c.delete(n), contains: n => c.has(n) }, textContent: '' }; };
const els = { hubBloombergStage: mk(), holoToggle: mk() };
global.document = { readyState: 'complete', getElementById: id => els[id], querySelectorAll: () => [] };
global.fetch = async () => ({ ok: false });
const src = fs.readFileSync('shared.js', 'utf8').replace(/\r\n/g, '\n');
const i = src.indexOf('function setHologram');
eval(src.slice(i).replace('function setHologram', 'global.setHologram = function').replace('function toggleHologram', 'global.toggleHologram = function'));
const out = { start: els.hubBloombergStage.classList.contains('on'), label0: els.holoToggle.textContent };
toggleHologram();
out.afterOn = { stage: els.hubBloombergStage.classList.contains('on'), btn: els.holoToggle.classList.contains('on'), label: els.holoToggle.textContent, stored: store.spy_hologram };
toggleHologram();
out.afterOff = { stage: els.hubBloombergStage.classList.contains('on'), label: els.holoToggle.textContent, stored: store.spy_hologram };
store.spy_hologram = '1';
const els2 = { hubBloombergStage: mk(), holoToggle: mk() };
global.document.getElementById = id => els2[id];
eval(src.slice(i).replace('function setHologram', 'global.setHologram = function').replace('function toggleHologram', 'global.toggleHologram = function'));
out.restored = els2.hubBloombergStage.classList.contains('on');
process.stdout.write(JSON.stringify(out));
"""


class Toggle(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.out = json.loads(subprocess.run(["node", "-e", TOGGLE], capture_output=True, text=True, encoding="utf-8", check=True).stdout)

    def test_it_starts_off(self):
        self.assertFalse(self.out["start"])
        self.assertEqual(self.out["label0"], "HOLOGRAM: OFF")

    def test_each_press_flips_it_and_is_remembered(self):
        self.assertEqual(self.out["afterOn"], {"stage": True, "btn": True, "label": "HOLOGRAM: ON", "stored": "1"})
        self.assertEqual(self.out["afterOff"], {"stage": False, "label": "HOLOGRAM: OFF", "stored": "0"})

    def test_the_choice_survives_a_reload(self):
        self.assertTrue(self.out["restored"])


class Scope(unittest.TestCase):
    def setUp(self):
        with open("index.html", encoding="utf-8") as f:
            self.h = f.read()

    def test_the_blend_applies_only_inside_the_isolated_stage_when_on(self):
        blends = re.findall(r"[^{}]*\{[^}]*mix-blend-mode[^}]*\}", self.h)
        self.assertEqual(len(blends), 1)
        self.assertIn(".holo-stage.on iframe", blends[0])
        self.assertIn("screen", blends[0])
        self.assertRegex(self.h, r"\.holo-stage\{[^}]*isolation:isolate")

    def test_the_stream_sits_inside_the_stage(self):
        m = re.search(r'<div class="holo-stage" id="hubBloombergStage">\s*<iframe\s+id="hubBloombergFrame"', self.h)
        self.assertIsNotNone(m)


if __name__ == "__main__":
    unittest.main()
