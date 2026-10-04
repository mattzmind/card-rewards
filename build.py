"""Build Lucro into one self-contained index.html.

  python3 build.py            -> index.html   (the public app GitHub Pages serves)
  python3 build.py preview    -> preview.html (for testing on your computer; loads
                                 seed.local.js if you have one, no offline worker)

Source lives in src/:
  template.html  page layout + all styles
  cats.js        feature switches, icons, spending categories
  engine.js      catalog loading, wallet storage, ranking rules
  wallet.js      Wallet tab: drag to reorder, swipe actions, sort/group/filter
  views.js       every other screen (Pay, Updates, sheets, splash)
Card data: edit tools/build_catalog.py, run it, it writes catalog.json here.
"""
import json, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
mode = sys.argv[1] if len(sys.argv) > 1 else "site"

catalog = json.loads((ROOT / "catalog.json").read_text())
js = "\n".join((SRC / f).read_text() for f in ["cats.js", "engine.js", "wallet.js"])
js += "\nconst refreshAll=()=>render();\n" + (SRC / "views.js").read_text()
js = js.replace("/*__CATALOG__*/null", json.dumps(catalog, ensure_ascii=False, separators=(",", ":")))
tpl = (SRC / "template.html").read_text()
SW_MARK = 'if("serviceWorker"in navigator){'

if mode == "site":
    js = js.replace('const CATALOG_URL = null;', 'const CATALOG_URL = "catalog.json";', 1)
    js = js[:js.index(SW_MARK)] + 'if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});\n'
    tpl = tpl.replace("<title>Lucro</title>",
        '<title>Lucro</title>\n<link rel="manifest" href="manifest.json">\n'
        '<link rel="apple-touch-icon" href="apple-touch-icon.png">')
    out = ROOT / "index.html"
elif mode == "preview":
    seed = ROOT / "seed.local.js"
    js = (seed.read_text() + "\n" if seed.exists() else "") + js[:js.index(SW_MARK)]
    out = ROOT / "preview.html"
else:
    sys.exit("usage: python3 build.py [site|preview]")

out.write_text(tpl.replace("/*__SCRIPT__*/", js))
print(f"{mode} -> {out.name} ({out.stat().st_size:,} bytes)")
