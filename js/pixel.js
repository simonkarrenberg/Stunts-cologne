/* ============================================================
   STUNTS KÖLLE 4D — Pixel art pipeline & procedural textures
   Low-res render target + posterize/dither pass, and small
   hand-drawn-looking canvas textures (nearest filtering).
   ============================================================ */
(function (root) {
  'use strict';

  // ---------- helpers ----------
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hex = (c) => '#' + new THREE.Color(c).getHexString();
  function shade(c, k) { const col = new THREE.Color(c); col.r = Math.min(1, col.r * k); col.g = Math.min(1, col.g * k); col.b = Math.min(1, col.b * k); return '#' + col.getHexString(); }

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  const allTex = [];
  let SMOOTH = true; // full-resolution mode: smooth filtered textures; pixel mode: nearest
  function applyFilter(t) { t.magFilter = SMOOTH ? THREE.LinearFilter : THREE.NearestFilter; t.minFilter = SMOOTH ? THREE.LinearMipMapLinearFilter : THREE.NearestMipMapLinearFilter; t.anisotropy = SMOOTH ? 8 : 1; t.needsUpdate = true; }
  function setSmooth(v) { SMOOTH = !!v; for (const t of allTex) applyFilter(t); }
  function toTex(c, repeat) {
    const t = new THREE.CanvasTexture(c);
    applyFilter(t);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
    allTex.push(t);
    return t;
  }
  // pixel-noise fill
  function noiseFill(x, w, h, base, variants, rnd, density) {
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w * h * (density || 0.35); i++) {
      x.fillStyle = variants[Math.floor(rnd() * variants.length)];
      x.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h), 1, 1);
    }
  }

  const cache = {};
  function cached(key, fn) { if (!cache[key]) cache[key] = fn(); return cache[key]; }

  // ---------- ground / road ----------
  const T = {};
  T.asphalt = (color, seed) => cached('asphalt' + color + seed, () => {
    const c = canvas(128, 128), x = c.getContext('2d'), r = mulberry(seed || 1);
    noiseFill(x, 128, 128, hex(color), [shade(color, 1.08), shade(color, 0.92), shade(color, 1.15), shade(color, 0.85)], r, 0.9);
    // cracks and patches
    for (let i = 0; i < 6; i++) { x.strokeStyle = shade(color, 0.7); x.lineWidth = 1; x.beginPath(); let px = r() * 128, py = r() * 128; x.moveTo(px, py); for (let k = 0; k < 8; k++) { px += (r() - 0.5) * 20; py += (r() - 0.5) * 20; x.lineTo(px, py); } x.stroke(); }
    for (let i = 0; i < 4; i++) { x.fillStyle = shade(color, 1.05); x.globalAlpha = 0.5; x.fillRect(r() * 100, r() * 100, 10 + r() * 30, 8 + r() * 20); x.globalAlpha = 1; }
    return toTex(c);
  });
  T.cobble = (color, seed) => cached('cobble' + color + seed, () => {
    const c = canvas(128, 128), x = c.getContext('2d'), r = mulberry(seed || 2);
    x.fillStyle = shade(color, 0.62); x.fillRect(0, 0, 128, 128);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      const ox = (j % 2) * 8; const px = (i * 16 + ox) % 128, py = j * 16; const k = 0.88 + r() * 0.22;
      const g = x.createLinearGradient(px, py, px + 14, py + 14); g.addColorStop(0, shade(color, k * 1.12)); g.addColorStop(1, shade(color, k * 0.82));
      x.fillStyle = g; x.beginPath(); x.roundRect ? x.roundRect(px + 1, py + 1, 13, 13, 4) : x.rect(px + 1, py + 1, 13, 13); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.10)'; x.fillRect(px + 3, py + 3, 6, 2);
    }
    return toTex(c);
  });
  T.grass = (color, seed) => cached('grass' + color + seed, () => {
    const c = canvas(128, 128), x = c.getContext('2d'), r = mulberry(seed || 3);
    noiseFill(x, 128, 128, hex(color), [shade(color, 1.12), shade(color, 0.88), shade(color, 1.22), shade(color, 0.78)], r, 0.8);
    for (let i = 0; i < 400; i++) { x.fillStyle = shade(color, 1.3); const px = Math.floor(r() * 128), py = Math.floor(r() * 128); x.fillRect(px, py, 1, 2 + Math.floor(r() * 3)); }
    for (let i = 0; i < 12; i++) { x.fillStyle = shade(color, 0.85); x.globalAlpha = 0.35; x.beginPath(); x.arc(r() * 128, r() * 128, 6 + r() * 12, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1; }
    return toTex(c);
  });
  T.water = (color) => cached('water' + color, () => {
    const c = canvas(256, 128), x = c.getContext('2d'), r = mulberry(7);
    const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, shade(color, 1.05)); g.addColorStop(1, shade(color, 0.9)); x.fillStyle = g; x.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 90; i++) { x.strokeStyle = shade(color, 1.35); x.globalAlpha = 0.5 + r() * 0.5; x.lineWidth = 1 + r(); x.beginPath(); const px = r() * 256, py = r() * 128; x.moveTo(px, py); x.quadraticCurveTo(px + 8 + r() * 10, py - 2 + r() * 4, px + 16 + r() * 24, py); x.stroke(); }
    x.globalAlpha = 1;
    for (let i = 0; i < 30; i++) { x.fillStyle = '#e8f4ff'; x.globalAlpha = 0.6; x.fillRect(r() * 250, r() * 128, 3 + r() * 5, 1); } x.globalAlpha = 1;
    return toTex(c);
  });
  T.wet = () => cached('wet', () => {
    // rain-soaked asphalt: dark with pale streaks and puddle highlights
    const c = canvas(128, 256), x = c.getContext('2d'), r = mulberry(23);
    x.fillStyle = '#d8dcea'; x.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 6000; i++) { x.fillStyle = r() < 0.5 ? '#c4c8d8' : '#ecf0fa'; x.fillRect(Math.floor(r() * 128), Math.floor(r() * 256), 1, 1); }
    for (let i = 0; i < 60; i++) { x.fillStyle = '#ffffff'; x.globalAlpha = 0.4 + r() * 0.6; const px = r() * 128, py = r() * 256; x.fillRect(px, py, 1 + r(), 8 + r() * 30); } x.globalAlpha = 1;
    for (let i = 0; i < 10; i++) { x.fillStyle = '#b0b8d0'; x.globalAlpha = 0.6; x.beginPath(); x.ellipse(r() * 128, r() * 256, 6 + r() * 14, 3 + r() * 6, 0, 0, Math.PI * 2); x.fill(); } x.globalAlpha = 1;
    return toTex(c);
  });
  T.rails = () => cached('rails', () => {
    const c = canvas(16, 16), x = c.getContext('2d');
    x.fillStyle = '#5a4a3a'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = '#7a6a55'; for (let i = 0; i < 16; i += 4) x.fillRect(0, i, 16, 2);
    x.fillStyle = '#999'; x.fillRect(3, 0, 1, 16); x.fillRect(12, 0, 1, 16);
    return toTex(c);
  });

  // ---------- facades ----------
  /** style: altstadt | gruenderzeit | modern | industrial | concrete | glass  */
  T.facade = (style, wall, seed, night) => {
    seed = (seed || 0) % 4; // a handful of variants per wall colour keeps the texture count low
    const key = `fac${style}${wall}${seed}${night}`;
    return cached(key, () => {
      const W = 256, H = 256, c = canvas(W, H), x = c.getContext('2d'), r = mulberry(seed || 11);
      const wallC = hex(wall);
      const wg = x.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, shade(wall, 1.04)); wg.addColorStop(1, shade(wall, 0.92)); x.fillStyle = wg; x.fillRect(0, 0, W, H);
      // plaster / stone texture
      for (let i = 0; i < 2600; i++) { x.fillStyle = r() < 0.5 ? shade(wall, 1.06) : shade(wall, 0.94); x.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 1); }
      if (style === 'industrial') { for (let y = 0; y < H; y += 8) { x.fillStyle = shade(wall, 0.72); x.fillRect(0, y + 7, W, 1); const ox = (y / 8) % 2 ? 12 : 0; for (let px = -24; px < W; px += 24) { x.fillStyle = shade(wall, 0.8 + r() * 0.3); x.globalAlpha = 0.5; x.fillRect(px + ox, y, 22, 7); } x.globalAlpha = 1; } }
      const bays = 4, floors = 4, bw = W / bays, fh = H / floors;
      for (let f = 0; f < floors; f++) {
        const y0 = H - (f + 1) * fh;
        if (style === 'gruenderzeit' || style === 'altstadt') { x.fillStyle = shade(wall, 0.78); x.fillRect(0, y0 + fh - 3, W, 3); x.fillStyle = shade(wall, 1.18); x.fillRect(0, y0 + fh - 6, W, 3); if (style === 'gruenderzeit') { x.fillStyle = shade(wall, 0.86); for (let px = 0; px < W; px += 16) x.fillRect(px, y0 + fh - 10, 8, 4); } }
        for (let b = 0; b < bays; b++) {
          const x0 = b * bw;
          const lit = night && r() < 0.45;
          const glassTop = lit ? '#fff0b8' : (style === 'modern' || style === 'glass' ? '#8fbce0' : '#3a4a60'), glassBot = lit ? '#ffc860' : (style === 'modern' || style === 'glass' ? '#4f7fb0' : '#1a2230');
          const gg = (wx, wy, ww, wh) => { const g = x.createLinearGradient(wx, wy, wx + ww * 0.3, wy + wh); g.addColorStop(0, glassTop); g.addColorStop(1, glassBot); return g; };
          if (style === 'modern' || style === 'glass') {
            x.fillStyle = gg(x0 + 2, y0 + 2, bw - 4, fh - 4); x.fillRect(x0 + 2, y0 + 2, bw - 4, fh - 4);
            x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(x0 + 6, y0 + 6, 10, 4);
            x.fillStyle = shade(wall, 0.6); x.fillRect(x0, y0, W, 2); x.fillRect(x0, y0, 2, fh);
            x.fillStyle = shade(wall, 0.85); x.fillRect(x0 + bw / 2 - 1, y0, 2, fh);
          } else if (style === 'industrial') {
            const wx = x0 + 10, wy = y0 + 8, ww = bw - 20, wh = fh - 20;
            x.fillStyle = shade(wall, 0.55); x.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
            x.fillStyle = gg(wx, wy, ww, wh); x.fillRect(wx, wy, ww, wh);
            x.fillStyle = shade(wall, 0.6); for (let k = 1; k < 3; k++) { x.fillRect(wx + k * ww / 3, wy, 2, wh); x.fillRect(wx, wy + k * wh / 3, ww, 2); }
            x.fillStyle = shade(wall, 0.7); x.fillRect(wx - 2, wy - 8, ww + 4, 4); x.beginPath(); x.arc(wx + ww / 2, wy - 6, ww / 2 + 2, Math.PI, 0); x.fill(); x.fillStyle = gg(wx, wy - 12, ww, 12); x.beginPath(); x.arc(wx + ww / 2, wy - 6, ww / 2 - 2, Math.PI, 0); x.fill();
          } else {
            const ww = bw - 28, wh = fh - 22, wx = x0 + 14, wy = y0 + 10;
            // frame, sill, glass, cross bar, shadow
            x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(wx - 3, wy + wh + 2, ww + 6, 3);
            x.fillStyle = style === 'altstadt' ? '#f6f2ea' : '#ece6d6'; x.fillRect(wx - 5, wy - 5, ww + 10, wh + 10);
            x.fillStyle = shade(wall, 0.7); x.fillRect(wx - 7, wy + wh + 3, ww + 14, 4);
            x.fillStyle = gg(wx, wy, ww, wh); x.fillRect(wx, wy, ww, wh);
            x.fillStyle = style === 'altstadt' ? '#f6f2ea' : '#ece6d6'; x.fillRect(wx + ww / 2 - 1, wy, 2, wh); x.fillRect(wx, wy + wh / 2 - 1, ww, 2);
            x.fillStyle = 'rgba(255,255,255,0.28)'; x.fillRect(wx + 3, wy + 3, ww / 2 - 6, wh / 3);
            if (lit) { x.fillStyle = 'rgba(255,220,140,0.6)'; x.fillRect(wx, wy, ww, wh); if (r() < 0.5) { x.fillStyle = '#c04040'; x.fillRect(wx + ww * 0.6, wy + 2, ww * 0.35, wh - 4); } }
            if (style === 'gruenderzeit') { x.fillStyle = shade(wall, 0.8); x.fillRect(wx - 9, wy - 12, ww + 18, 6); x.fillStyle = shade(wall, 1.15); x.fillRect(wx - 9, wy - 9, ww + 18, 3); x.fillStyle = shade(wall, 0.75); x.fillRect(wx - 11, wy - 5, 4, wh + 10); x.fillRect(wx + ww + 7, wy - 5, 4, wh + 10); }
            if (style === 'altstadt') { x.fillStyle = '#5a3a2a'; x.fillRect(wx - 12, wy - 2, 6, wh + 6); x.fillRect(wx + ww + 6, wy - 2, 6, wh + 6); x.fillStyle = '#7a5a3a'; x.fillRect(wx - 11, wy, 4, 3); x.fillRect(wx + ww + 7, wy, 4, 3); }
            if (style === 'altstadt' && f === 0 && b === 1) { x.fillStyle = '#5a2a1a'; x.fillRect(wx - 6, wy - 4, ww + 12, wh + 18); x.fillStyle = '#c9a34a'; x.fillRect(wx + ww - 6, wy + wh / 2, 3, 3); x.fillStyle = '#3a1a10'; x.fillRect(wx + ww / 2 - 1, wy - 2, 2, wh + 14); }
          }
        }
      }
      if (style === 'gruenderzeit' || style === 'concrete') { x.fillStyle = shade(wall, 0.7); x.fillRect(0, H - fh - 6, W, 6); }
      if (style === 'altstadt') { x.fillStyle = shade(wall, 0.8); x.fillRect(0, 0, W, 4); }
      return toTex(c);
    });
  };
  T.roof = (color, seed) => cached('roof' + color + seed, () => {
    const c = canvas(128, 128), x = c.getContext('2d'), r = mulberry(seed || 5);
    x.fillStyle = shade(color, 0.6); x.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 16) { for (let px = -16; px < 128; px += 16) { const ox = (y / 16) % 2 ? 8 : 0; const k = 0.82 + r() * 0.3; const g = x.createLinearGradient(0, y, 0, y + 14); g.addColorStop(0, shade(color, k * 1.15)); g.addColorStop(1, shade(color, k * 0.85)); x.fillStyle = g; x.beginPath(); x.roundRect ? x.roundRect(px + ox + 1, y, 14, 14, [0, 0, 6, 6]) : x.rect(px + ox + 1, y, 14, 14); x.fill(); } }
    return toTex(c);
  });
  T.brick = (color) => cached('brick' + color, () => {
    const c = canvas(128, 128), x = c.getContext('2d'), r = mulberry(9);
    x.fillStyle = shade(color, 0.6); x.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 16) { const ox = (y / 16) % 2 ? 16 : 0; for (let px = -32; px < 128; px += 32) { const k = 0.82 + r() * 0.32; x.fillStyle = shade(color, k); x.fillRect(px + ox + 1, y + 1, 29, 13); x.fillStyle = shade(color, k * 1.1); x.fillRect(px + ox + 1, y + 1, 29, 3); for (let i = 0; i < 12; i++) { x.fillStyle = shade(color, k * (0.9 + r() * 0.2)); x.fillRect(px + ox + 1 + r() * 28, y + 1 + r() * 12, 2, 2); } } }
    return toTex(c);
  });
  T.tracery = () => cached('tracery', () => {
    // gothic stonework for the Dom: grey stone with ribs, pointed windows and pinnacles
    const c = canvas(256, 384), x = c.getContext('2d'), r = mulberry(13);
    const g = x.createLinearGradient(0, 0, 0, 384); g.addColorStop(0, '#78767e'); g.addColorStop(1, '#5e5c64'); x.fillStyle = g; x.fillRect(0, 0, 256, 384);
    for (let i = 0; i < 9000; i++) { x.fillStyle = r() < 0.5 ? '#83818a' : '#55535b'; x.fillRect(Math.floor(r() * 256), Math.floor(r() * 384), 1, 1); }
    for (let y = 0; y < 384; y += 24) { x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, y, 256, 2); }
    for (let b = 0; b < 4; b++) {
      const x0 = b * 64;
      x.fillStyle = '#928f9a'; x.fillRect(x0, 0, 8, 384); x.fillStyle = '#3f3d45'; x.fillRect(x0 + 8, 0, 4, 384);
      const wx = x0 + 20, ww = 26, wy = 120, wh = 240;
      x.fillStyle = '#1c1b22'; x.fillRect(wx, wy, ww, wh); x.beginPath(); x.moveTo(wx, wy); x.quadraticCurveTo(wx + ww / 2, wy - 40, wx + ww, wy); x.lineTo(wx + ww / 2, wy - 2); x.fill();
      x.beginPath(); x.moveTo(wx, wy + 4); x.lineTo(wx + ww / 2, wy - 30); x.lineTo(wx + ww, wy + 4); x.closePath(); x.fill();
      x.fillStyle = '#a7a5b0'; x.fillRect(wx - 3, wy - 4, 3, wh + 6); x.fillRect(wx + ww, wy - 4, 3, wh + 6); x.fillRect(wx + ww / 2 - 1, wy - 10, 3, wh + 10);
      x.fillStyle = '#8a8892'; for (let k = 1; k < 6; k++) x.fillRect(wx, wy + k * wh / 6, ww, 2);
      x.fillStyle = '#b4b2bc'; x.fillRect(x0 + 14, 60, 36, 6); x.fillRect(x0 + 20, 40, 24, 6); x.fillRect(x0 + 27, 14, 10, 26); x.fillStyle = '#3f3d45'; x.fillRect(x0 + 14, 66, 36, 3);
    }
    return toTex(c);
  });
  T.romanesque = (color) => cached('roman' + color, () => {
    const c = canvas(256, 256), x = c.getContext('2d'), r = mulberry(17);
    x.fillStyle = hex(color); x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5000; i++) { x.fillStyle = r() < 0.5 ? shade(color, 1.08) : shade(color, 0.9); x.fillRect(Math.floor(r() * 256), Math.floor(r() * 256), 1, 1); }
    for (let y = 0; y < 256; y += 32) { x.fillStyle = shade(color, 0.72); x.fillRect(0, y + 30, 256, 2); const ox = (y / 32) % 2 ? 32 : 0; for (let px = -64; px < 256; px += 64) { x.fillStyle = shade(color, 0.72); x.fillRect(px + ox, y, 2, 30); x.fillStyle = shade(color, 0.92 + r() * 0.16); x.globalAlpha = 0.6; x.fillRect(px + ox + 2, y, 60, 30); x.globalAlpha = 1; } }
    for (let b = 0; b < 4; b++) { const x0 = b * 64; x.fillStyle = '#26252c'; x.fillRect(x0 + 20, 90, 24, 110); x.beginPath(); x.arc(x0 + 32, 90, 12, Math.PI, 0); x.fill(); x.fillStyle = shade(color, 1.25); x.fillRect(x0 + 16, 200, 32, 4); x.beginPath(); x.arc(x0 + 32, 90, 16, Math.PI, 0); x.lineWidth = 4; x.strokeStyle = shade(color, 1.2); x.stroke(); }
    return toTex(c);
  });
  T.steel = (color) => cached('steel' + color, () => {
    const c = canvas(64, 64), x = c.getContext('2d'), r = mulberry(29);
    const g = x.createLinearGradient(0, 0, 64, 64); g.addColorStop(0, shade(color, 1.1)); g.addColorStop(0.5, shade(color, 0.9)); g.addColorStop(1, shade(color, 1.05)); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    x.fillStyle = shade(color, 0.7); for (let i = 0; i < 64; i += 16) { x.fillRect(i, 0, 2, 64); x.fillRect(0, i, 64, 2); }
    for (let i = 0; i < 40; i++) { x.fillStyle = shade(color, 1.3); x.beginPath(); x.arc(4 + (i % 4) * 16 + (r() < 0.5 ? 0 : 8), 4 + Math.floor(i / 4) * 6, 1.2, 0, Math.PI * 2); x.fill(); }
    return toTex(c);
  });
  T.stripes = (a, b) => cached('stripes' + a + b, () => { const c = canvas(8, 8), x = c.getContext('2d'); x.fillStyle = hex(a); x.fillRect(0, 0, 8, 8); x.fillStyle = hex(b); x.fillRect(0, 0, 8, 4); return toTex(c); });

  // ---------- sky ----------
  T.sky = (theme) => cached('sky' + theme.sky + theme.night, () => {
    const W = 2048, H = 1024, c = canvas(W, H), x = c.getContext('2d'), r = mulberry(21);
    const top = new THREE.Color(theme.sky), hor = new THREE.Color(theme.fog);
    const grad = x.createLinearGradient(0, 0, 0, H / 2); grad.addColorStop(0, '#' + top.getHexString()); grad.addColorStop(0.55, '#' + top.clone().lerp(hor, 0.45).getHexString()); grad.addColorStop(1, '#' + hor.getHexString());
    x.fillStyle = grad; x.fillRect(0, 0, W, H / 2);
    x.fillStyle = '#' + hor.getHexString(); x.fillRect(0, H / 2, W, H / 2);
    if (theme.miami || theme.sunset) { const pg = x.createLinearGradient(0, H * 0.25, 0, H * 0.5); pg.addColorStop(0, 'rgba(255,120,180,0)'); pg.addColorStop(1, 'rgba(255,160,90,0.55)'); x.fillStyle = pg; x.fillRect(0, H * 0.25, W, H * 0.25); }
    if (theme.night) {
      for (let i = 0; i < 700; i++) { x.fillStyle = r() < 0.2 ? '#ffffff' : '#c8d0ff'; x.globalAlpha = 0.25 + r() * 0.5; const sz = r() < 0.08 ? 2 : 1; x.fillRect(r() * W, r() * H * 0.45, sz, sz); } x.globalAlpha = 1;
      const mg = x.createRadialGradient(1600, 150, 10, 1600, 150, 160); mg.addColorStop(0, 'rgba(255,250,220,0.9)'); mg.addColorStop(0.15, 'rgba(255,250,220,0.5)'); mg.addColorStop(1, 'rgba(255,250,220,0)'); x.fillStyle = mg; x.fillRect(1400, 0, 400, 400);
      x.fillStyle = '#f4f1d0'; x.beginPath(); x.arc(1600, 150, 34, 0, Math.PI * 2); x.fill(); x.fillStyle = '#d8d4b0'; x.beginPath(); x.arc(1612, 140, 8, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(1590, 162, 5, 0, Math.PI * 2); x.fill();
    } else {
      const sx = theme.sunset ? 1720 : 480, sy = theme.sunset ? 400 : 150;
      const sg = x.createRadialGradient(sx, sy, 6, sx, sy, 140); sg.addColorStop(0, 'rgba(255,250,230,1)'); sg.addColorStop(0.18, 'rgba(255,240,200,0.85)'); sg.addColorStop(0.4, 'rgba(255,220,160,0.22)'); sg.addColorStop(1, 'rgba(255,220,160,0)'); x.fillStyle = sg; x.fillRect(sx - 160, sy - 160, 320, 320);
      for (let i = 0; i < 22; i++) {
        const cx = r() * W, cy = 60 + r() * 300, cw = 120 + r() * 300, ch = 30 + r() * 50;
        const cc = theme.sunset ? 'rgba(255,225,205,' : 'rgba(255,255,255,';
        for (let k = 0; k < 9; k++) { const bx = cx + (r() - 0.5) * cw, by = cy + (r() - 0.5) * ch * 0.6, br = 25 + r() * ch; const cg = x.createRadialGradient(bx, by, 0, bx, by, br); cg.addColorStop(0, cc + '0.85)'); cg.addColorStop(0.7, cc + '0.35)'); cg.addColorStop(1, cc + '0)'); x.fillStyle = cg; x.fillRect(bx - br, by - br, br * 2, br * 2); }
        const sh = theme.sunset ? 'rgba(200,120,140,' : 'rgba(180,200,225,'; const cg2 = x.createRadialGradient(cx, cy + ch * 0.4, 0, cx, cy + ch * 0.4, cw * 0.5); cg2.addColorStop(0, sh + '0.35)'); cg2.addColorStop(1, sh + '0)'); x.fillStyle = cg2; x.fillRect(cx - cw, cy - ch, cw * 2, ch * 2);
      }
    }
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipMapLinearFilter; t.wrapS = THREE.RepeatWrapping;
    return t;
  });

  // ---------- post process: low-res + posterize + bayer dither ----------
  function PixelPost(renderer, scale) {
    this.renderer = renderer; this.scale = scale || 3;
    this.rt = new THREE.WebGLRenderTarget(320, 200, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: this.rt.texture }, res: { value: new THREE.Vector2(320, 200) }, levels: { value: 14.0 }, dither: { value: 1.0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform vec2 res; uniform float levels; uniform float dither; varying vec2 vUv;
        float bayer(vec2 p){
          int x = int(mod(p.x, 4.0)); int y = int(mod(p.y, 4.0));
          int i = x + y * 4;
          float m[16];
          m[0]=0.0; m[1]=8.0; m[2]=2.0; m[3]=10.0; m[4]=12.0; m[5]=4.0; m[6]=14.0; m[7]=6.0;
          m[8]=3.0; m[9]=11.0; m[10]=1.0; m[11]=9.0; m[12]=15.0; m[13]=7.0; m[14]=13.0; m[15]=5.0;
          for (int k = 0; k < 16; k++) { if (k == i) return m[k] / 16.0; }
          return 0.0;
        }
        void main(){
          vec2 px = floor(vUv * res);
          vec3 c = texture2D(tDiffuse, (px + 0.5) / res).rgb;
          float d = (bayer(px) - 0.5) * dither / levels;
          c = floor(c * levels + d + 0.5) / levels;
          gl_FragColor = vec4(c, 1.0);
        }`,
      depthTest: false, depthWrite: false
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.scene.add(this.quad);
    this.setSize(window.innerWidth, window.innerHeight);
  }
  PixelPost.prototype.setSize = function (w, h) {
    // "scale" device pixels per texel: on a 3x phone screen the buffer is computed from
    // physical pixels, otherwise a 390px-wide viewport would collapse to 130 texels.
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const rw = Math.max(160, Math.min(w, Math.floor(w * dpr / this.scale))), rh = Math.max(100, Math.min(h, Math.floor(h * dpr / this.scale)));
    this.rt.setSize(rw, rh);
    this.mat.uniforms.res.value.set(rw, rh);
  };
  PixelPost.prototype.setScale = function (s) { this.scale = s; this.setSize(window.innerWidth, window.innerHeight); };
  PixelPost.prototype.render = function (scene, camera) {
    const r = this.renderer;
    r.setRenderTarget(this.rt);
    if (Array.isArray(camera)) {
      // split screen: player 1 on top, player 2 below
      const rw = this.rt.width, rh = this.rt.height, hh = Math.floor(rh / 2);
      r.setScissorTest(true);
      r.setViewport(0, hh, rw, rh - hh); r.setScissor(0, hh, rw, rh - hh); r.render(scene, camera[0]);
      r.setViewport(0, 0, rw, hh); r.setScissor(0, 0, rw, hh); r.render(scene, camera[1]);
      r.setScissorTest(false); r.setViewport(0, 0, rw, rh);
    } else {
      r.render(scene, camera);
    }
    r.setRenderTarget(null);
    r.setViewport(0, 0, r.domElement.width, r.domElement.height);
    r.render(this.scene, this.cam);
  };
  PixelPost.prototype.size = function () { return { w: this.rt.width, h: this.rt.height }; };

  root.Pixel = { T, PixelPost, mulberry, shade, hex, setSmooth, get smooth() { return SMOOTH; } };
})(window);
