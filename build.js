/* Build Lucro into one self-contained index.html (Node version of build.py, same output).

  node build.js            -> index.html   (the public app GitHub Pages serves)
  node build.js preview    -> preview.html (for testing on your computer; loads
                              seed.local.js if you have one, no offline worker)
*/
const fs = require("fs"), path = require("path");

const ROOT = __dirname, SRC = path.join(ROOT, "src");
const mode = process.argv[2] || "site";
const lf = s => s.split("\r\n").join("\n");
const read = f => lf(fs.readFileSync(f, "utf8"));

const catalog = JSON.parse(read(path.join(ROOT, "catalog.json")));
let js = ["cats.js", "engine.js", "wallet.js"].map(f => read(path.join(SRC, f))).join("\n");
js += "\nconst refreshAll=()=>render();\n" + read(path.join(SRC, "views.js"));
js = js.replace("/*__CATALOG__*/null", () => JSON.stringify(catalog));
let tpl = read(path.join(SRC, "template.html"));
const SW_MARK = 'if("serviceWorker"in navigator){';

let out;
if (mode === "site") {
  js = js.replace('const CATALOG_URL = null;', 'const CATALOG_URL = "catalog.json";');
  js = js.slice(0, js.indexOf(SW_MARK)) + 'if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});\n';
  tpl = tpl.replace("<title>Lucro</title>",
    '<title>Lucro</title>\n<link rel="manifest" href="manifest.json">\n' +
    '<link rel="apple-touch-icon" href="apple-touch-icon.png">');
  out = path.join(ROOT, "index.html");
} else if (mode === "preview") {
  const seed = path.join(ROOT, "seed.local.js");
  js = (fs.existsSync(seed) ? read(seed) + "\n" : "") + js.slice(0, js.indexOf(SW_MARK));
  out = path.join(ROOT, "preview.html");
} else {
  console.error("usage: node build.js [site|preview]");
  process.exit(1);
}

fs.writeFileSync(out, tpl.replace("/*__SCRIPT__*/", () => js));
console.log(`${mode} -> ${path.basename(out)} (${fs.statSync(out).size.toLocaleString()} bytes)`);
