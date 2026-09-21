import json
import re
import subprocess
import unittest

RESOLVER = r"""
import('./functions/ytlive.js').then(async m => {
  const live = '<link rel="canonical" href="https://www.youtube.com/watch?v=QB5BNdBFujE">x "isLiveNow":true y';
  const ended = '<link rel="canonical" href="https://www.youtube.com/watch?v=QB5BNdBFujE">x "isLiveNow":false';
  const home = '<link rel="canonical" href="https://www.youtube.com/channel/UCIALMKvObZNtJ6AmdCLP7Lg">';
  const r = await m.onRequestGet({ request: new Request('https://x/ytlive?channel=UCanyoneelse0000000000000') });
  process.stdout.write(JSON.stringify({ live: m.liveVideoId(live), ended: m.liveVideoId(ended), home: m.liveVideoId(home), refused: r.status }));
});
"""

CLIENT = r"""
const fs = require('fs');
global.document = { readyState: 'complete', querySelectorAll: () => [] };
const src = fs.readFileSync('shared.js', 'utf8').replace(/\r\n/g, '\n');
const i = src.indexOf('const _liveIds');
const out = {};
(async () => {
  global.fetch = async () => ({ ok: true, json: async () => ({ videoId: 'QB5BNdBFujE' }) });
  eval(src.slice(i).replace('const _liveIds', 'var _liveIds').replace('function liveEmbedSrc', 'global.liveEmbedSrc = function'));
  out.resolved = await liveEmbedSrc('UCIALMKvObZNtJ6AmdCLP7Lg', 'autoplay=1&mute=1&controls=1');
  global.fetch = async () => { throw new Error('offline'); };
  eval(src.slice(i).replace('const _liveIds', 'var _liveIds').replace('function liveEmbedSrc', 'global.liveEmbedSrc = function'));
  out.fallback = await liveEmbedSrc('UC4-aIBtpNAPqEcMhAyFN6iQ', 'autoplay=1&mute=1');
  process.stdout.write(JSON.stringify(out));
})();
"""


def node(code):
    return json.loads(subprocess.run(["node", "--input-type=module" if "import(" in code else "-", "-e", code] if False else ["node", "-e", code],
                                     capture_output=True, text=True, encoding="utf-8", check=True).stdout)


class Resolver(unittest.TestCase):
    def test_only_a_live_canonical_video_is_returned(self):
        out = node(RESOLVER)
        self.assertEqual(out["live"], "QB5BNdBFujE")
        self.assertIsNone(out["ended"])
        self.assertIsNone(out["home"])

    def test_channels_outside_the_list_are_refused(self):
        self.assertEqual(node(RESOLVER)["refused"], 404)


class Client(unittest.TestCase):
    def test_the_embed_uses_the_video_id_with_one_query_string(self):
        out = node(CLIENT)
        self.assertEqual(out["resolved"], "https://www.youtube.com/embed/QB5BNdBFujE?autoplay=1&mute=1&controls=1")
        self.assertEqual(out["fallback"], "https://www.youtube.com/embed/live_stream?channel=UC4-aIBtpNAPqEcMhAyFN6iQ&autoplay=1&mute=1")
        for url in out.values():
            self.assertEqual(url.count("?"), 1, url)


class Markup(unittest.TestCase):
    def test_the_hub_stream_starts_on_open_muted_with_controls(self):
        with open("index.html", encoding="utf-8") as f:
            h = f.read()
        m = re.search(r'<iframe\s+id="hubBloombergFrame".*?></iframe>', h, re.S)
        self.assertIsNotNone(m)
        frame = m.group(0)
        self.assertIn('data-live-channel="UCIALMKvObZNtJ6AmdCLP7Lg"', frame)
        for p in ("autoplay=1", "mute=1", "controls=1", "playsinline=1"):
            self.assertIn(p, frame)
        self.assertIn('allow="autoplay', frame)
        self.assertNotIn('loading="lazy"', frame)

    def test_the_camera_iframe_carries_one_query_string_for_either_kind_of_source(self):
        js = r"""
const fs = require('fs');
const src = fs.readFileSync('dashboard1.js', 'utf8').replace(/\r\n/g, '\n');
const line = src.split('\n').find(l => l.trim().startsWith('<iframe') && l.includes('cfg.channelId'));
const out = {};
for (const [k, cfg] of [['channel', { channelId: 'UC4-aIBtpNAPqEcMhAyFN6iQ' }], ['video', { ytId: 'dfVK7ld38Ys' }]]) {
  const html = eval('`' + line + '`');
  out[k] = html;
}
process.stdout.write(JSON.stringify(out));
"""
        out = json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True, encoding="utf-8", check=True).stdout)
        for kind, html in out.items():
            src = re.search(r'src="([^"]*)"', html).group(1)
            self.assertLessEqual(src.count("?"), 1, f"{kind}: {src}")
        self.assertIn('data-live-channel="UC4-aIBtpNAPqEcMhAyFN6iQ"', out["channel"])
        self.assertIn("embed/dfVK7ld38Ys?autoplay=1", out["video"])


if __name__ == "__main__":
    unittest.main()
