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
// every string and template literal of a JS source, with its line (comments and regex literals are skipped), for the text checks
function jsStrings(src) {
  const out = [], n = src.length, stack = []; let i = 0, line = 1, prev = '', depth = 0;
  const unescape = (t) => t.replace(/\\u\{?([0-9a-fA-F]{4,5})\}?|\\x([0-9a-fA-F]{2})|\\(.)/g, (m, u, x, c) => u ? String.fromCodePoint(parseInt(u, 16)) : x ? String.fromCharCode(parseInt(x, 16)) : c === 'n' ? '\n' : c === '\n' ? '' : c);
  const regexBefore = (p) => p === '' || /^[(,=:[!&|?{};+\-*%<>~^]$/.test(p) || /^(return|typeof|case|in|of|delete|void|throw|new|else|do|yield|await)$/.test(p);
  const template = () => { // from just after a backtick or a closing brace of ${…}: read up to the next backtick or ${
    const at = line; let t = '';
    while (i < n) { const c = src[i];
      if (c === '\\') { t += src.slice(i, i + 2); if (src[i + 1] === '\n') line++; i += 2; continue; }
      if (c === '`') { i++; out.push({ line: at, text: unescape(t) }); prev = 'x'; return; }
      if (c === '$' && src[i + 1] === '{') { i += 2; out.push({ line: at, text: unescape(t) }); stack.push(depth); depth = 0; prev = '('; return; }
      if (c === '\n') line++; t += c; i++; }
  };
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); const end = e < 0 ? n : e + 2; line += (src.slice(i, end).match(/\n/g) || []).length; i = end; continue; }
    if (c === '"' || c === "'") { const at = line; let j = i + 1, t = ''; while (j < n && src[j] !== c) { if (src[j] === '\\') { t += src.slice(j, j + 2); if (src[j + 1] === '\n') line++; j += 2; continue; } if (src[j] === '\n') break; t += src[j++]; } out.push({ line: at, text: unescape(t) }); i = j + 1; prev = 'x'; continue; }
    if (c === '`') { i++; template(); continue; }
    if (c === '/' && regexBefore(prev)) { let j = i + 1, cls = false; while (j < n && src[j] !== '\n') { const d = src[j]; if (d === '\\') { j += 2; continue; } if (d === '[') cls = true; else if (d === ']') cls = false; else if (d === '/' && !cls) break; j++; } i = j + 1; while (i < n && /[a-z]/i.test(src[i])) i++; prev = 'x'; continue; }
    if (/[A-Za-z_$0-9]/.test(c)) { let j = i; while (j < n && /[A-Za-z_$0-9.]/.test(src[j])) j++; prev = src.slice(i, j); i = j; continue; }
    if (c === '{') depth++;
    if (c === '}') { if (depth === 0 && stack.length) { depth = stack.pop(); i++; template(); continue; } depth--; }
    prev = c; i++;
  }
  return out;
}
// the visible text and attribute values of an HTML page (tags stripped), plus the strings of its inline scripts
function htmlStrings(src) {
  const out = [], lineAt = (k) => src.slice(0, k).split('\n').length;
  src.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (m, body, k) => { const base = lineAt(k) - 1; for (const s of jsStrings(body)) out.push({ line: base + s.line, text: s.text }); return m; });
  const text = src.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => m.replace(/[^\n]/g, ' ')).replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  text.split('\n').forEach((l, k) => { const t = l.replace(/<[^>]*?(?:\s([a-z-]+)="([^"]*)")*[^>]*>/gi, ' ').trim(); const attrs = [...l.matchAll(/\s(?:title|alt|aria-label|content|placeholder|value|data-[a-z-]+)="([^"]*)"/gi)].map((a) => a[1]); for (const x of [t, ...attrs]) if (x) out.push({ line: k + 1, text: x.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"') }); });
  return out;
}
// all game texts of the repo: [{ file, line, text }] over js/*.js and index.html
function gameStrings() {
  const dir = path.join(root, 'js'), out = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js')).sort()) for (const s of jsStrings(fs.readFileSync(path.join(dir, f), 'utf8'))) out.push({ file: 'js/' + f, ...s });
  for (const s of htmlStrings(fs.readFileSync(path.join(root, 'index.html'), 'utf8'))) out.push({ file: 'index.html', ...s });
  return out;
}
module.exports = { serve, launch, waitFor, jsStrings, htmlStrings, gameStrings };
