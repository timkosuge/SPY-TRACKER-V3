import json
import subprocess
import unittest

HARNESS = r"""
const fs=require('fs');
const store={};
global.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}};
Object.defineProperty(global.localStorage,'length',{get:()=>Object.keys(store).length});
global.window={};
global.etToday=()=>'2026-09-21';
const src=fs.readFileSync('dashboard2.js','utf8');
const i=src.indexOf('function aiDayKey()'), j=src.indexOf('window.aiCacheClear = aiCacheClear;');
eval(src.slice(i,j));
let written=0, stampText='';
const stamp={set textContent(v){stampText=v;}};
const el={innerHTML:'', classList:{remove(){},add(){}}, parentElement:{querySelector:()=>stamp}};
const out={};
el.innerHTML='<p>first</p>'; aiCacheWrite('summary', el);
out.servedSameDay = aiServe('summary', {innerHTML:'', classList:{remove(){}}, parentElement:{querySelector:()=>stamp}}, false);
out.stamp = stampText;
out.forcedSkipsCache = aiServe('summary', el, true);
out.afterForceServe = aiServe('summary', el, false);
el.innerHTML='<p>second</p>'; aiCacheWrite('summary', el);
store['spy_ai_summary']=JSON.stringify({day:'2026-09-20',at:Date.now(),html:'<p>yesterday</p>'});
out.staleDay = aiServe('summary', el, false);
out.keys = Object.keys(store);
process.stdout.write(JSON.stringify(out));
"""


class AiDayCache(unittest.TestCase):
    def setUp(self):
        self.out = json.loads(subprocess.run(["node", "-e", HARNESS], capture_output=True, text=True, encoding="utf-8", check=True).stdout)

    def test_a_second_visit_on_the_same_day_is_served_from_cache(self):
        self.assertTrue(self.out["servedSameDay"])
        self.assertIn("Written", self.out["stamp"])
        self.assertIn("CT", self.out["stamp"])

    def test_refresh_clears_the_entry_and_forces_a_write(self):
        self.assertFalse(self.out["forcedSkipsCache"])
        self.assertFalse(self.out["afterForceServe"])

    def test_yesterdays_entry_is_not_served(self):
        self.assertFalse(self.out["staleDay"])

    def test_entries_are_namespaced(self):
        self.assertEqual(self.out["keys"], ["spy_ai_summary"])


if __name__ == "__main__":
    unittest.main()
