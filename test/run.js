// npm test: run every *.test.js in this folder in sequence and print a summary
(async () => {
  const fs = require('fs'); const path = require('path'); let failed = 0;
  const which = process.argv[2];
  for (const f of fs.readdirSync(__dirname).filter((x) => x.endsWith('.test.js') && (!which || x.startsWith(which)))) {
    const t0 = Date.now(); let r;
    try { r = await require(path.join(__dirname, f))(); } catch (e) { r = { name: f, ok: false, lines: [String(e && e.stack || e)] }; }
    console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name} (${Math.round((Date.now() - t0) / 1000)} s)`); for (const l of r.lines) console.log('   ' + l); if (!r.ok) failed++;
  }
  process.exit(failed ? 1 : 0);
})();
