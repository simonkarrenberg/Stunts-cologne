// shared bits for the headless checks: a static server for the repo and a browser with software GL
const path = require('path'); const http = require('http'); const fs = require('fs');
const root = path.join(__dirname, '..');
function serve(port) {
  return http.createServer((req, res) => { const f = path.join(root, decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html' }); res.end(d); }); }).listen(port);
}
async function launch() {
  const { chromium } = require('playwright');
  const opts = { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage'] };
  if (process.env.CHROME) opts.executablePath = process.env.CHROME; // e.g. a system chromium
  return chromium.launch(opts);
}
async function waitFor(page, fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < (ms || 60000)) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(250); } return false; }
module.exports = { serve, launch, waitFor };
