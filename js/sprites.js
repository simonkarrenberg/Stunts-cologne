/* ============================================================
   STUNTS KÖLLE 4D — Procedural pixel-art sprites for the UI:
   driver portraits, car side views, logo, skyline banner,
   track thumbnails, track outlines, cockpit dashboard.
   ============================================================ */
(function (root) {
  'use strict';
  const PAL = { k: '#14121c', s: '#f1c27d', S: '#d9a066', w: '#f4f4f4', r: '#c1121f', b: '#2a4a8a', g: '#7a7a86', G: '#4a4a56', y: '#ffd400', m: '#8a3a3a', e: '#1a1a2a', c: '#3a2a22', C: '#2a2a3a', o: '#ff7a00', p: '#e8a0a0', n: '#2d6a4f', h: '#3a2a1a', t: '#e8e8e8', l: '#ffe8a0', d: '#101018' };

  function draw(ctx, rows, scale, ox, oy, pal) {
    pal = pal || PAL;
    rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch === '.' || !pal[ch]) continue; ctx.fillStyle = pal[ch]; ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale); } });
  }

  // ---------------- driver portraits (16 x 20) ----------------
  const PORTRAITS = {
    tuennes: [
      '................',
      '....gggggggg....',
      '...gggggggggg...',
      '..gggggggggggg..',
      '..GGGGGGGGGGGG..',
      '...ssssssssss...',
      '..ssssssssssss..',
      '..sseksssseks...',
      '..ssssssssssss..',
      '..spsssssssspss.',
      '..ssssmmmmssss..',
      '...sssmwwmsss...',
      '....ssssssss....',
      '.....ssssss.....',
      '..rrrrrssrrrrr..',
      '.bwbwbwbwbwbwbw.',
      '.bwbwbwbwbwbwbw.',
      '.bwbwbwbwbwbwbw.',
      '..bwbwbwbwbwbw..',
      '................'],
    schael: [
      '................',
      '....kkkkkkkk....',
      '...kkkkkkkkkk...',
      '..kkkkkkkkkkkk..',
      '..kksssssssskk..',
      '..ssssssssssss..',
      '..sekssssssssss.',
      '..ssssssssseks..',
      '..ssssssssssss..',
      '..sSSssssssSSs..',
      '..ssssmmmmssss..',
      '..sssssmmsssss..',
      '...ssssssssss...',
      '....ssssssss....',
      '..ccccssssscccc.',
      '.cccccwwwwccccc.',
      '.ccccccwrwcccccc',
      '.cccccwrrwccccc.',
      '.cccccwrrwccccc.',
      '................'],
    heinzel: [
      '.......rr.......',
      '......rrrr......',
      '.....rrrrrr.....',
      '....rrrrrrrr....',
      '...rrrrrrrrrr...',
      '..rrrrrrrrrrrr..',
      '..ssssssssssss..',
      '..ssekssssekss..',
      '..ssssssssssss..',
      '..sSsssmmsssSs..',
      '.wwwwwwwwwwwwww.',
      '.wwwwwwwwwwwwww.',
      '..wwwwwwwwwwww..',
      '...wwwwwwwwww...',
      '....wwwwwwww....',
      '..nnnnnwwnnnnn..',
      '.nnnnnnnnnnnnyn.',
      '.nnnnnnnnnnnnyn.',
      '.nnnnnnnnnnnnnn.',
      '................'],
    langer: [
      '..kkkkkkkkkkkk..',
      '..kkkkkkkkkkkk..',
      '.kkkkkkkkkkkkkk.',
      'kkkkkkkkkkkkkkkk',
      '..ssssssssssss..',
      '..kkkkkssskkkkk.',
      '..kkkkkssskkkkk.',
      '..ssssssssssss..',
      '..sSssssssssSs..',
      '..ssssmmmmssss..',
      '..sssssmmswwwo..',
      '...ssssssssss...',
      '....ssssssss....',
      '..CCCCssssCCCC..',
      '.CCCCCCwwCCCCCC.',
      '.CCCCCCCwCCCCCC.',
      '.CCCCCCCCCCCCCC.',
      '.CCCCCCCCCCCCCC.',
      '.CCCCCCCCCCCCCC.',
      '................'],
    anna: [
      '................',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '..hhrrrrrrrrhh..',
      '..hhrrrrrrrrhh..',
      '..hsssssssssshh.',
      '..hsekssssekshh.',
      '..hssssssssss.h.',
      '..hsspssssppsh..',
      '..hsssmmmmsssh..',
      '..hssssmmssssh..',
      '...hssssssssh...',
      '....ssssssss....',
      '.....ssssss.....',
      '..rrrrrwwrrrrr..',
      '.rrrrrrrrrrrrrr.',
      '.rrrrrwwwwrrrrr.',
      '.rrrrrrrrrrrrrr.',
      '..rrrrrrrrrrrr..',
      '................'],
    tom: [
      '................',
      '....gggggggg....',
      '...gggggggggg...',
      '..ggsssssssggg..',
      '..ssssssssssss..',
      '..ssssssssssss..',
      '..ssekssssekss..',
      '..ssssssssssss..',
      '..sSssssssssSs..',
      '..ssssmmmmssss..',
      '..sssssssSssss..',
      '...ssssssssss...',
      '....ssssssss....',
      '.....ssssss.....',
      '..CCCCwwwwCCCC..',
      '.CCCCCwyywCCCCC.',
      '.CCCCCwyywCCCCC.',
      '.CCCCCCyyCCCCCC.',
      '.CCCCCCCCCCCCCC.',
      '................'],
    willi: [
      '................',
      '....yyyyyyyy....',
      '...yyyyyyyyyy...',
      '..yyyyyyyyyyyy..',
      '..kkkkkkkkkkkk..',
      '..ssssssssssss..',
      '..ssekssssekss..',
      '..ssssssssssss..',
      '..sSssssssssSs..',
      '..sssmmmmmmsss..',
      '..ssssmmmmssss..',
      '...ssssssssss...',
      '....ssssssss....',
      '.....ssssss.....',
      '..ttttssssstttt.',
      '.tttttttttttttt.',
      '.ttttyyyyyyyttt.',
      '.tttttttttttttt.',
      '.tttttttttttttt.',
      '................'],
    koebes: [
      '................',
      '....gggggggg....',
      '...gggggggggg...',
      '..ggssssssssgg..',
      '..ssssssssssss..',
      '..ssekssssekss..',
      '..ssssssssssss..',
      '..sSssssssssSs..',
      '..ssmmmmmmmmss..',
      '..ssssmmmmssss..',
      '...ssssssssss...',
      '....ssssssss....',
      '.....ssssss.....',
      '..bbbbbssssbbbb.',
      '.bbbbbbwwbbbbbb.',
      '.bbbbbbwwbbbbyb.',
      '.bbbbbbbbbbbbyb.',
      '.bbbbbbbbbbbbbb.',
      '.bbbbbbbbbbbbbb.',
      '................']
  };
  function portrait(id, canvas, scale) {
    scale = scale || 5; const rows = PORTRAITS[id] || PORTRAITS.tuennes;
    canvas.width = 16 * scale; canvas.height = 20 * scale;
    const x = canvas.getContext('2d'); x.imageSmoothingEnabled = false;
    // backdrop: night city gradient with a tiny skyline
    const g = x.createLinearGradient(0, 0, 0, canvas.height); g.addColorStop(0, '#1a1040'); g.addColorStop(1, '#4a2060');
    x.fillStyle = g; x.fillRect(0, 0, canvas.width, canvas.height);
    x.fillStyle = '#0d0a1e'; for (let i = 0; i < 16; i += 2) x.fillRect(i * scale, canvas.height - (3 + ((i * 7) % 5)) * scale, 2 * scale, 6 * scale);
    x.fillStyle = '#ffe08a'; for (let i = 0; i < 16; i += 3) x.fillRect((i + 0.5) * scale, canvas.height - (2 + ((i * 3) % 4)) * scale, scale * 0.5, scale * 0.5);
    draw(x, rows, scale, 0, 0);
    return canvas;
  }

  // ---------------- car side views (32 x 11) ----------------
  const CAR_SHAPES = {
    hatch: [
      '................................',
      '...........bbbbbbbbbb...........',
      '.........bbwwwwbwwwwwbbb........',
      '.......bbbwwwwwbwwwwwbbbb.......',
      '.....bbbbbbbbbbbbbbbbbbbbbb.....',
      '...lbbbbbbbbbbbbbbbbbbbbbbbbr...',
      '...bbbbbbbbbbbbbbbbbbbbbbbbbb...',
      '...bbbkkkkkbbbbbbbbbbkkkkkbbb...',
      '.....kkkkkkk........kkkkkkk.....',
      '......kkkkk..........kkkkk......',
      '................................'],
    coupe: [
      '................................',
      '.............bbbbbbbbbbb........',
      '..........bbbwwwwwbwwwwwbb......',
      '........bbbbwwwwwwbwwwwwwbbb....',
      '......bbbbbbbbbbbbbbbbbbbbbbbb..',
      '..lbbbbbbbbbbbbbbbbbbbbbbbbbbbr.',
      '..bsssssssssssssssssssssssssssb.',
      '..bbbkkkkkbbbbbbbbbbbbbkkkkkbbb.',
      '.....kkkkkkk..........kkkkkkk...',
      '......kkkkk............kkkkk....',
      '................................'],
    sport: [
      '................................',
      '................................',
      '...........bbbbbbbbbbbbb........',
      '........bbbbwwwwwwbwwwwwbbb.....',
      '......bbbbbbbbbbbbbbbbbbbbbbb...',
      '..lbbbbbbbbbbbbbbbbbbbbbbbbbbbr.',
      '..bbbbsssssssssssssssssssssbbbb.',
      '..bbbkkkkkbbbbbbbbbbbbbkkkkkbbb.',
      '.....kkkkkkk..........kkkkkkk...',
      '......kkkkk............kkkkk....',
      '................................']
  };
  function carSide(car, canvas, scale) {
    scale = scale || 5; const rows = CAR_SHAPES[car.shape === 'coupe2' ? 'coupe' : car.shape] || CAR_SHAPES.coupe;
    canvas.width = 32 * scale; canvas.height = 11 * scale;
    const x = canvas.getContext('2d'); x.imageSmoothingEnabled = false;
    const bc = new THREE.Color(car.color); if (bc.r + bc.g + bc.b < 0.35) bc.setHex(0x2e2e38); // keep black cars visible
    const body = '#' + bc.getHexString();
    const dark = '#' + bc.clone().multiplyScalar(0.7).getHexString();
    const pal = Object.assign({}, PAL, { b: body, s: '#' + new THREE.Color(car.stripe || 0xffffff).getHexString(), w: '#7fb8e8', l: '#fff6c8', r: '#ff2020', k: '#14121c' });
    draw(x, rows, scale, 0, 0, pal);
    // shading line under the windows, ground shadow
    x.fillStyle = dark; x.fillRect(4 * scale, 6.6 * scale, 24 * scale, scale * 0.5);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(3 * scale, 10 * scale, 26 * scale, scale);
    return canvas;
  }

  // ---------------- logo ----------------
  function logo(canvas, w, h) {
    canvas.width = w; canvas.height = h;
    const x = canvas.getContext('2d');
    x.clearRect(0, 0, w, h);
    const big = Math.round(h * 0.46);
    x.font = `bold ${big}px "Press Start 2P", Impact, "Arial Black", sans-serif`;
    x.textBaseline = 'top';
    x.setTransform(1, 0, -0.18, 1, 0, 0); // italic skew
    const text1 = 'KÖLLE', text2 = '4D';
    const w1 = x.measureText(text1).width;
    const drawChrome = (txt, px, c1, c2, c3) => {
      // shadow / outline
      x.fillStyle = '#000'; for (let i = 6; i > 0; i--) x.fillText(txt, px + i, 14 + i);
      x.fillStyle = '#1a1a2a'; x.fillText(txt, px - 2, 14); x.fillText(txt, px + 2, 14); x.fillText(txt, px, 12); x.fillText(txt, px, 16);
      const g = x.createLinearGradient(0, 14, 0, 14 + big); g.addColorStop(0, c1); g.addColorStop(0.48, c2); g.addColorStop(0.52, c3); g.addColorStop(1, c1);
      x.fillStyle = g; x.fillText(txt, px, 14);
      // scanline shine
      x.fillStyle = 'rgba(255,255,255,.18)'; for (let yy = 14; yy < 14 + big; yy += 6) x.fillRect(px - 10, yy, x.measureText(txt).width + 20, 2);
    };
    drawChrome(text1, 24, '#ff9a9a', '#ff2a2a', '#8a0a0a');
    drawChrome(text2, 24 + w1 + big * 0.35, '#bfe4ff', '#3aa0ff', '#0a3a8a');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.font = `bold ${Math.round(h * 0.16)}px "Press Start 2P", Impact, sans-serif`;
    x.fillStyle = '#000'; x.fillText('CHICAGO AM RHEIN', 28, 24 + big + 12);
    x.fillStyle = '#ffd400'; x.fillText('CHICAGO AM RHEIN', 26, 22 + big + 12);
    return canvas;
  }

  // ---------------- skyline banner (low-res, scaled up) ----------------
  function skyline(canvas, w, h) {
    const W = 384, H = 48; const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const stops = ['#120a30', '#2a1050', '#6a2060', '#c04060', '#ff7a3a', '#ffc060'];
    for (let y = 0; y < 34; y++) { const u = y / 34; const i = Math.min(stops.length - 2, Math.floor(u * (stops.length - 1))); const a = new THREE.Color(stops[i]), b = new THREE.Color(stops[i + 1]); a.lerp(b, u * (stops.length - 1) - i); x.fillStyle = '#' + a.getHexString(); x.fillRect(0, y, W, 1); }
    // sun
    x.fillStyle = '#ffe8a0'; x.fillRect(250, 20, 12, 12); x.fillRect(248, 22, 16, 8); x.fillRect(252, 18, 8, 16);
    x.fillStyle = '#ff9a5a'; x.fillRect(248, 30, 16, 1); x.fillRect(246, 33, 20, 1);
    // river
    x.fillStyle = '#1a1030'; x.fillRect(0, 34, W, 14);
    for (let i = 0; i < 60; i++) { x.fillStyle = i % 2 ? '#ff7a3a' : '#c04060'; x.fillRect(Math.floor(Math.random() * W), 36 + Math.floor(Math.random() * 11), 3 + Math.floor(Math.random() * 6), 1); }
    const sil = '#0a0818';
    const rect = (px, py, pw, ph) => { x.fillStyle = sil; x.fillRect(px, py, pw, ph); };
    // city blocks
    for (let i = 0; i < 40; i++) { const bw = 6 + (i * 7) % 12, bh = 6 + (i * 13) % 12; rect(i * 10 - 4, 34 - bh, bw, bh); x.fillStyle = '#ffd08a'; for (let k = 0; k < 3; k++) if ((i + k) % 3) x.fillRect(i * 10 - 2 + k * 2, 34 - bh + 2 + (k % 2) * 3, 1, 1); }
    // Dom
    const dx = 160; rect(dx, 18, 30, 16); rect(dx + 2, 10, 6, 10); rect(dx + 22, 10, 6, 10);
    for (let k = 0; k < 8; k++) { rect(dx + 2 + Math.floor(k / 2.7), 10 - k, 6 - Math.floor(k / 1.4), 1); rect(dx + 22 + Math.floor(k / 2.7), 10 - k, 6 - Math.floor(k / 1.4), 1); }
    rect(dx + 13, 16, 3, 6); rect(dx + 14, 12, 1, 4);
    // Colonius
    rect(300, 6, 2, 28); rect(297, 12, 8, 3); rect(300, 2, 1, 4);
    // Hohenzollernbrücke arches
    for (const ax of [60, 100, 140]) { for (let i = -18; i <= 18; i++) { const hgt = Math.round(Math.sqrt(Math.max(0, 1 - (i / 18) * (i / 18))) * 9); rect(ax + i, 34 - hgt, 1, 1); if (i % 4 === 0) rect(ax + i, 34 - hgt, 1, hgt); } }
    rect(40, 33, 120, 1);
    // KölnTriangle + cranes (Rheinauhafen)
    rect(220, 14, 8, 20); rect(330, 20, 3, 14); rect(333, 18, 10, 3); rect(350, 22, 3, 12); rect(353, 20, 10, 3);
    canvas.width = w; canvas.height = h;
    const o = canvas.getContext('2d'); o.imageSmoothingEnabled = false; o.drawImage(c, 0, 0, w, h);
    return canvas;
  }

  // ---------------- track thumbnail ----------------
  function thumb(track, canvas, w, h) {
    const W = 96, H = 36; const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const th = track.theme;
    const top = new THREE.Color(th.sky), hor = new THREE.Color(th.fog);
    for (let y = 0; y < H; y++) { const col = top.clone().lerp(hor, Math.pow(y / H, 1.3)); x.fillStyle = '#' + col.getHexString(); x.fillRect(0, y, W, 1); }
    x.fillStyle = th.night ? '#050410' : '#1a1a2a';
    const ground = 28; x.fillRect(0, ground, W, H - ground);
    const sil = th.night ? '#0a0818' : '#2a2a3a';
    const rect = (px, py, pw, ph, col) => { x.fillStyle = col || sil; x.fillRect(px, py, pw, ph); };
    const id = track.id;
    if (id === 'dom' || id === 'zoch') { rect(20, 12, 20, 16); rect(22, 4, 4, 8); rect(34, 4, 4, 8); rect(23, 1, 2, 3); rect(35, 1, 2, 3); if (id === 'dom') for (let i = -14; i <= 14; i++) { const hg = Math.round(Math.sqrt(Math.max(0, 1 - (i / 14) * (i / 14))) * 8); rect(66 + i, 28 - hg, 1, 1, '#2f6b4f'); } }
    if (id === 'zoch') { const cols = ['#ff5fa2', '#ffd400', '#00a0ff', '#7fff00', '#ff2d2d']; for (let i = 0; i < 12; i++) { rect(4 + i * 8, 20 + (i % 2) * 2, 3, 8, cols[i % 5]); rect(4 + i * 8, 18 + (i % 2) * 2, 3, 3, '#f1c27d'); } for (let i = 0; i < 30; i++) rect(Math.floor(Math.random() * W), Math.floor(Math.random() * 18), 1, 1, cols[i % 5]); }
    if (id === 'rheinauhafen') { for (const kx of [10, 40, 70]) { rect(kx, 8, 6, 20); rect(kx, 8, 18, 6); rect(kx + 15, 14, 2, 14); } rect(0, 28, W, 8, '#3f6f9f'); }
    if (id === 'zoo') { rect(10, 10, 2, 18); rect(10, 10, 16, 2); rect(24, 12, 1, 8); rect(60, 6, 2, 22); rect(58, 6, 14, 2); x.strokeStyle = sil; x.lineWidth = 2; x.beginPath(); x.arc(44, 18, 8, 0, Math.PI * 2); x.stroke(); }
    if (id === 'ehrenfeld') { rect(0, 16, W, 12, '#6a3a2a'); for (let ax = 6; ax < W; ax += 16) { x.fillStyle = '#1a1010'; x.beginPath(); x.arc(ax + 6, 28, 5, Math.PI, 0); x.fill(); } rect(70, 2, 2, 14); rect(67, 6, 8, 2); const cols = ['#ff2d95', '#00e5ff', '#7fff00', '#ffd400']; for (let i = 0; i < 8; i++) rect(2 + i * 12, 20, 6, 2, cols[i % 4]); }
    if (id === 'kalk') { for (let i = 0; i < 8; i++) { const bw = 8 + (i * 5) % 6, bh = 12 + (i * 7) % 12; rect(i * 12, 28 - bh, bw, bh); for (let k = 0; k < 4; k++) rect(i * 12 + 1 + (k % 2) * 3, 28 - bh + 2 + Math.floor(k / 2) * 4, 1, 1, '#ffe08a'); } const neon = ['#ff2d95', '#00e5ff', '#ffd400', '#c04dff']; for (let i = 0; i < 6; i++) rect(4 + i * 15, 14 + (i % 3) * 4, 9, 2, neon[i % 4]); for (let i = 0; i < 30; i++) rect(Math.floor(Math.random() * W), 29 + Math.floor(Math.random() * 6), 2, 1, neon[i % 4]); }
    // road
    rect(0, 31, W, 5, th.night ? '#2c2e3a' : '#4c4c52'); rect(0, 33, W, 1, '#ffd400');
    canvas.width = w; canvas.height = h;
    const o = canvas.getContext('2d'); o.imageSmoothingEnabled = false; o.drawImage(c, 0, 0, w, h);
    return canvas;
  }

  // ---------------- track outline ----------------
  function outline(samples, canvas, w, h, color, marks) {
    canvas.width = w; canvas.height = h;
    const x = canvas.getContext('2d'); x.clearRect(0, 0, w, h);
    let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
    for (const s of samples) { minx = Math.min(minx, s.p.x); maxx = Math.max(maxx, s.p.x); minz = Math.min(minz, s.p.z); maxz = Math.max(maxz, s.p.z); }
    const pad = 6, sc = Math.min((w - pad * 2) / (maxx - minx + 1), (h - pad * 2) / (maxz - minz + 1));
    const ox = pad + (w - pad * 2 - (maxx - minx) * sc) / 2, oz = pad + (h - pad * 2 - (maxz - minz) * sc) / 2;
    const px = (s) => w - (ox + (s.p.x - minx) * sc), pz = (s) => h - (oz + (s.p.z - minz) * sc);
    x.lineWidth = 3; x.strokeStyle = '#000'; x.beginPath(); samples.forEach((s, i) => i ? x.lineTo(px(s), pz(s)) : x.moveTo(px(s), pz(s))); x.closePath(); x.stroke();
    x.lineWidth = 1.5; x.strokeStyle = color || '#f4f4f4'; x.stroke();
    if (marks) for (const m of marks) { x.fillStyle = m.color; x.beginPath(); x.arc(px(m), pz(m), m.r || 2.5, 0, Math.PI * 2); x.fill(); }
    // start marker
    x.fillStyle = '#ff2a2a'; x.fillRect(px(samples[0]) - 2, pz(samples[0]) - 2, 4, 4);
    return { px, pz };
  }

  // ---------------- cockpit dashboard ----------------
  function dashboard(canvas, st) {
    // st: { steer, speed, rpm, turbo, damage, night }
    const W = canvas.width, H = canvas.height, x = canvas.getContext('2d');
    x.clearRect(0, 0, W, H);
    const S = Math.max(2, Math.round(W / 320)); // pixel size
    const R = (px, py, pw, ph, col) => { x.fillStyle = col; x.fillRect(Math.round(px / S) * S, Math.round(py / S) * S, Math.round(pw / S) * S, Math.round(ph / S) * S); };
    // dashboard body
    R(0, H * 0.55, W, H * 0.45, '#1a1820'); R(0, H * 0.55, W, S * 2, '#3a3844');
    R(W * 0.1, H * 0.62, W * 0.8, H * 0.3, '#22202a');
    // A-pillars
    R(0, 0, S * 8, H * 0.6, '#14121c'); R(W - S * 8, 0, S * 8, H * 0.6, '#14121c');
    // mirror
    R(W * 0.4, S * 2, W * 0.2, S * 14, '#0d0c14'); R(W * 0.41, S * 3, W * 0.18, S * 12, '#2a2a4a');
    // gauges
    const gx = W * 0.5, gy = H * 0.78, gr = H * 0.16;
    x.fillStyle = '#0a0a10'; x.beginPath(); x.arc(gx - gr * 2.6, gy, gr, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(gx + gr * 2.6, gy, gr, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#7fff00'; x.lineWidth = S; x.beginPath(); x.arc(gx - gr * 2.6, gy, gr * 0.85, Math.PI * 0.75, Math.PI * 2.25); x.stroke();
    x.strokeStyle = '#ff3355'; x.beginPath(); x.arc(gx + gr * 2.6, gy, gr * 0.85, Math.PI * 0.75, Math.PI * 2.25); x.stroke();
    const needle = (cx, cy, v) => { const a = Math.PI * 0.75 + v * Math.PI * 1.5; x.strokeStyle = '#ff2a2a'; x.lineWidth = S; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * gr * 0.8, cy + Math.sin(a) * gr * 0.8); x.stroke(); };
    needle(gx - gr * 2.6, gy, Math.min(1, st.speed / 280)); needle(gx + gr * 2.6, gy, Math.min(1, st.rpm));
    // digital speed + turbo/damage bars in the centre
    R(gx - S * 30, gy - S * 12, S * 60, S * 22, '#050508');
    x.font = `${S * 8}px "Press Start 2P", monospace`; x.fillStyle = '#7fff00'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(String(Math.round(st.speed)).padStart(3, '0'), gx, gy - S * 4);
    for (let i = 0; i < 10; i++) { R(gx - S * 26 + i * S * 5.4, gy + S * 3, S * 4, S * 3, i / 10 < st.turbo ? '#3adf3a' : '#1a2a1a'); R(gx - S * 26 + i * S * 5.4, gy + S * 7, S * 4, S * 2, i / 10 < st.damage ? (i > 6 ? '#ff2a2a' : '#ffd400') : '#2a1a1a'); }
    // steering wheel
    const wx = W * 0.5, wy = H * 1.02, wr = H * 0.42;
    x.save(); x.translate(wx, wy); x.rotate(st.steer * 0.9);
    x.strokeStyle = '#111014'; x.lineWidth = S * 5; x.beginPath(); x.arc(0, 0, wr, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
    x.strokeStyle = '#2a2830'; x.lineWidth = S * 3; x.beginPath(); x.arc(0, 0, wr, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
    x.lineWidth = S * 4; x.strokeStyle = '#111014'; x.beginPath(); x.moveTo(-wr * 0.95, 0); x.lineTo(0, -wr * 0.15); x.lineTo(wr * 0.95, 0); x.stroke();
    x.fillStyle = '#c1121f'; x.beginPath(); x.arc(0, -wr * 0.1, S * 5, 0, Math.PI * 2); x.fill();
    // hands
    x.fillStyle = '#f1c27d'; x.beginPath(); x.arc(-wr * 0.72, -wr * 0.68, S * 6, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(wr * 0.72, -wr * 0.68, S * 6, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#2a2a3a'; x.fillRect(-wr * 0.85, -wr * 0.62, S * 12, S * 30); x.fillRect(wr * 0.85 - S * 12, -wr * 0.62, S * 12, S * 30);
    x.restore();
    return canvas;
  }

  root.Sprites = { portrait, carSide, logo, skyline, thumb, outline, dashboard, PORTRAITS };
})(window);
