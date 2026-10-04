// Copy the shared card catalog (../catalog.json, built by tools/build_catalog.py) into the app bundle.
const fs = require('fs'), path = require('path');
const from = path.join(__dirname, '..', '..', 'catalog.json');
const to = path.join(__dirname, '..', 'assets', 'catalog.json');
fs.copyFileSync(from, to);
console.log('catalog', JSON.parse(fs.readFileSync(to, 'utf8')).version, '->', path.relative(process.cwd(), to));
