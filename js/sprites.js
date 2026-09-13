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
  // ================= procedural pixel art: shaded portraits and car side views =================
  function Raster(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  Raster.prototype.set = function (x, y, c) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return; const i = (y * this.w + x) * 4; this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = c.length > 3 ? c[3] : 255; };
  Raster.prototype.get = function (x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return [0, 0, 0, 0]; const i = ((y | 0) * this.w + (x | 0)) * 4; return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]]; };
  Raster.prototype.rect = function (x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); };
  Raster.prototype.ellipse = function (cx, cy, rx, ry, c, fn) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) this.set(x, y, fn ? fn(x, y, dx, dy) : c); } };
  Raster.prototype.line = function (x0, y0, x1, y1, c, t) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; if (t > 1) this.rect(Math.round(x - t / 2), Math.round(y - t / 2), t, t, c); else this.set(Math.round(x), Math.round(y), c); } };
  Raster.prototype.outline = function (c) { const src = new Uint8ClampedArray(this.d); const a = (x, y) => (x < 0 || y < 0 || x >= this.w || y >= this.h) ? 0 : src[(y * this.w + x) * 4 + 3]; for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { if (a(x, y)) continue; if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) this.set(x, y, c); } };
  Raster.prototype.blit = function (src) { for (let i = 0; i < src.d.length; i += 4) { const a = src.d[i + 3]; if (!a) continue; if (a === 255) { this.d[i] = src.d[i]; this.d[i + 1] = src.d[i + 1]; this.d[i + 2] = src.d[i + 2]; this.d[i + 3] = 255; } else { const k = a / 255; this.d[i] = this.d[i] * (1 - k) + src.d[i] * k; this.d[i + 1] = this.d[i + 1] * (1 - k) + src.d[i + 1] * k; this.d[i + 2] = this.d[i + 2] * (1 - k) + src.d[i + 2] * k; this.d[i + 3] = 255; } } };
  Raster.prototype.toCanvas = function (canvas) { canvas.width = this.w; canvas.height = this.h; const x = canvas.getContext('2d'); x.putImageData(new ImageData(this.d, this.w, this.h), 0, 0); return canvas; };
  const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
  const shade = (c, k) => [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k)];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const dither = (x, y) => (x + y) % 2 === 0;
  /** three-tone sphere shading with a dithered edge, light from the upper left */
  function sphereShader(base, cx, cy) { const L = shade(base, 1.18), D = shade(base, 0.72), M = base; return (x, y, dx, dy) => { const lx = dx + 0.35, ly = dy + 0.4; const r = Math.sqrt(lx * lx + ly * ly); if (r < 0.55) return L; if (r < 0.7) return dither(x, y) ? L : M; if (r < 1.15) return M; if (r < 1.3) return dither(x, y) ? M : D; return D; }; }

  const LOOKS = {
    tuennes: { skin: 0xf1c27d, hair: 0x6a5a4a, hat: 'cap', hatC: 0x777777, jacket: 0x2a4a8a, shirt: 0xffffff, scarf: 0xc1121f, blush: true, mouth: 'grin', brow: 'up', moustache: 0x5a3a20, heavy: true, koelsch: true },
    schael: { skin: 0xf1c27d, hair: 0x1a1a1a, hairStyle: 'part', jacket: 0x5a3a2a, shirt: 0xf4f4f4, tie: 0xc1121f, mouth: 'smirk', brow: 'skew', squint: true },
    heinzel: { skin: 0xffdbac, hair: 0xf4f4f4, hat: 'gnome', hatC: 0xc1121f, jacket: 0x2d6a4f, shirt: 0xf4e8c8, beard: 0xf4f4f4, mouth: 'smile', brow: 'up', wrench: true, small: true },
    langer: { skin: 0xe0ac69, hair: 0x2a2a2a, hat: 'fedora', hatC: 0x0a0a0a, jacket: 0x14141a, shirt: 0xf4f4f4, tie: 0x8a1a1a, shades: true, cigar: true, mouth: 'flat', brow: 'flat', tall: true, moustache: 0x2a2a2a },
    anna: { skin: 0xffdbac, hair: 0xd9a24a, hairStyle: 'long', hat: 'tricorn', hatC: 0xc1121f, jacket: 0xc1121f, shirt: 0xffffff, lips: true, blush: true, mouth: 'smile', brow: 'up', lashes: true },
    tom: { skin: 0xe8c8a0, hair: 0x9a9a9a, hairStyle: 'slick', jacket: 0x444444, shirt: 0xf4f4f4, tie: 0x1c3f95, glasses: true, mouth: 'flat', brow: 'flat', lapelPin: true },
    willi: { skin: 0xe0ac69, hair: 0x3a2a1a, hat: 'cap', hatC: 0x2a2a30, jacket: 0xf2e6b1, shirt: 0x8a5a2a, mouth: 'smile', brow: 'up', moustache: 0x3a2a1a, stubble: true },
    koebes: { skin: 0xe0ac69, hair: 0x4a4a4a, hairStyle: 'bald', jacket: 0x1c3f95, shirt: 0xf4f4f4, apron: 0x1c3f95, mouth: 'frown', brow: 'down', moustache: 0x4a4a4a, koelsch: true, kranz: true },
    // Tango: thin androgynous 80s rocker, long black hair, kohl eyes, leather jacket over a band shirt
    tango: { skin: 0xf6e0c8, hair: 0x14121a, hairStyle: 'long', jacket: 0x151318, shirt: 0x3a1a3a, lashes: true, lips: true, lipC: 0x9a4a6a, mouth: 'smirk', brow: 'skew', small: true, earring: true, bandShirt: true },
    // Täsch: muscular 80s rocker, long curly blond hair, headband, denim cut-off vest
    taesch: { skin: 0xe6b98a, hair: 0xe8c860, hairStyle: 'curly', jacket: 0x3a5a8a, shirt: 0x1a1a1a, headband: 0xc1121f, mouth: 'grin', brow: 'down', stubble: true, broad: true, vest: true, chain: true }
  };
  const INK = [20, 18, 28];
  function portrait(id, canvas) {
    const o = LOOKS[id] || LOOKS.tuennes; const W = 80, H = 100;
    const bg = new Raster(W, H); const fig = new Raster(W, H);
    // backdrop: night over the Ringe, neon strip, distant windows
    const top = rgb(0x1a1040), bot = rgb(0x4a2060), neon = rgb(id === 'langer' ? 0xff2d95 : id === 'anna' ? 0xff5fa2 : 0x00e5ff);
    for (let y = 0; y < H; y++) { const c = mix(top, bot, y / H); for (let x = 0; x < W; x++) bg.set(x, y, c); }
    for (let i = 0; i < 40; i++) { const sx = (i * 37 + 11) % W, sy = (i * 53 + 7) % 50; bg.set(sx, sy, [220, 220, 255]); }
    const sky = rgb(0x0d0a1e); for (let x = 0; x < W; x += 6) { const h = 14 + ((x * 7) % 19); bg.rect(x, H - h - 22, 6, h + 22, sky); for (let y = H - h - 18; y < H - 22; y += 5) for (let wx = x + 1; wx < x + 6; wx += 3) if ((wx * 7 + y) % 5 < 3) bg.rect(wx, y, 1, 2, [255, 224, 138]); }
    bg.rect(0, H - 22, W, 2, neon); bg.rect(0, H - 20, W, 20, rgb(0x2a1a3a));
    // figure geometry
    const cy = o.tall ? 40 : o.small ? 50 : 44, ry = o.tall ? 21 : 19, rx = o.heavy ? 18 : 16, cx = 40;
    const skin = rgb(o.skin), jacket = rgb(o.jacket), shirt = rgb(o.shirt);
    // shoulders / coat
    const shTop = cy + ry + 6, shW = o.broad ? 40 : o.heavy ? 36 : o.small ? 27 : o.tall ? 38 : 32;
    if (o.vest) for (let y = shTop; y < H; y++) { const t = Math.min(1, (y - shTop) / 10); const half = Math.round(shW * (0.45 + 0.55 * t)); for (let x = cx - half; x <= cx + half; x++) fig.set(x, y, x < cx - half + 5 ? shade(skin, 0.72) : x > cx + half - 5 ? shade(skin, 1.1) : (dither(x, y) && x < cx ? shade(skin, 0.88) : skin)); } // bare arms first
    for (let y = shTop; y < H; y++) { const t = Math.min(1, (y - shTop) / 10); const half = Math.round(shW * (0.45 + 0.55 * t) * (o.vest ? 0.7 : 1)); for (let x = cx - half; x <= cx + half; x++) { let c = jacket; if (x < cx - half + 4) c = shade(jacket, 0.72); else if (x < cx - half + 10 && dither(x, y)) c = shade(jacket, 0.85); else if (x > cx + half - 5) c = shade(jacket, 1.15); fig.set(x, y, c); } }
    // shirt V, tie or scarf, apron
    for (let y = shTop; y < shTop + 16; y++) { const half = Math.max(1, Math.round(7 - (y - shTop) * 0.45)); fig.rect(cx - half, y, half * 2, 1, shirt); }
    if (o.tie) { const tie = rgb(o.tie); fig.rect(cx - 1, shTop + 4, 3, 22, tie); fig.rect(cx - 2, shTop + 10, 5, 12, tie); fig.rect(cx - 1, shTop + 4, 1, 22, shade(tie, 1.3)); }
    if (o.scarf) { const sc = rgb(o.scarf); for (let y = shTop - 4; y < shTop + 8; y++) fig.rect(cx - 14, y, 28, 1, ((y - shTop) & 2) ? sc : [244, 244, 244]); fig.rect(cx + 6, shTop + 8, 7, 14, sc); fig.rect(cx + 6, shTop + 12, 7, 2, [244, 244, 244]); }
    if (o.apron) { const ap = rgb(o.apron); fig.rect(cx - 12, shTop + 14, 24, 30, shade(ap, 0.8)); fig.rect(cx - 12, shTop + 14, 24, 1, shade(ap, 1.2)); }
    if (o.lapelPin) fig.rect(cx - 12, shTop + 8, 2, 2, rgb(0xffd400));
    if (o.bandShirt) { fig.rect(cx - 5, shTop + 6, 10, 6, [240, 240, 240]); fig.rect(cx - 4, shTop + 7, 8, 1, [20, 20, 30]); fig.rect(cx - 4, shTop + 9, 8, 1, [20, 20, 30]); fig.rect(cx - 3, shTop + 11, 6, 1, [200, 30, 60]); } // band logo on the shirt
    if (o.chain) for (let k = -6; k <= 6; k++) fig.set(cx + k, shTop + 9 + Math.round(Math.abs(k) * -0.35 + 2), rgb(0xffd400)); // gold chain
    // lapels
    fig.line(cx - 8, shTop, cx - 13, shTop + 18, shade(jacket, 1.2), 1); fig.line(cx + 8, shTop, cx + 13, shTop + 18, shade(jacket, 1.2), 1);
    // neck
    fig.rect(cx - 6, cy + ry - 4, 12, 12, shade(skin, 0.8));
    // ears, head
    fig.ellipse(cx - rx, cy + 2, 3, 4, shade(skin, 0.85)); fig.ellipse(cx + rx, cy + 2, 3, 4, shade(skin, 1.05));
    fig.ellipse(cx, cy, rx, ry, null, sphereShader(skin, cx, cy));
    if (o.heavy) fig.ellipse(cx, cy + ry - 6, rx - 2, 6, null, (x, y, dx, dy) => dither(x, y) ? shade(skin, 0.9) : shade(skin, 0.78)); // double chin
    // stubble / beard
    if (o.stubble) for (let y = cy + 4; y < cy + ry - 2; y++) for (let x = cx - rx + 4; x < cx + rx - 4; x++) if ((x * 3 + y * 5) % 7 === 0) fig.set(x, y, shade(skin, 0.7));
    if (o.beard) { const b = rgb(o.beard); fig.ellipse(cx, cy + ry + 2, rx - 1, 14, null, (x, y, dx, dy) => (dy < -0.5 && Math.abs(dx) < 0.6) ? null : (dither(x, y) || dy > 0.2 ? b : shade(b, 0.82))); }
    // eyes
    const ey = cy - 2; const eyeW = [248, 248, 244], iris = rgb(id === 'anna' ? 0x4a8a5a : 0x3a5a8a);
    for (const sx of [-1, 1]) {
      const ex = cx + sx * 7;
      if (o.shades) { fig.rect(ex - 5, ey - 3, 10, 6, [18, 18, 24]); fig.rect(ex - 4, ey - 2, 2, 1, [90, 90, 110]); continue; }
      if (o.squint && sx === 1) { fig.rect(ex - 4, ey, 8, 1, INK); fig.rect(ex - 3, ey - 1, 6, 1, shade(skin, 0.75)); continue; }
      fig.ellipse(ex, ey, 4, 2.6, eyeW); fig.rect(ex - 1 + (o.squint ? 2 : 0), ey - 1, 3, 3, iris); fig.rect(ex + (o.squint ? 2 : 0), ey, 1, 1, INK); fig.rect(ex - 1 + (o.squint ? 2 : 0), ey - 1, 1, 1, [255, 255, 255]);
      fig.line(ex - 4, ey - 1, ex + 4, ey - 1, shade(skin, 0.7), 1); // lid
      if (o.lashes) { fig.set(ex + sx * 5, ey - 3, INK); fig.set(ex + sx * 4, ey - 4, INK); }
    }
    if (o.shades) fig.rect(cx - 2, ey - 1, 4, 1, [18, 18, 24]);
    // brows
    const hairC = rgb(o.hair); for (const sx of [-1, 1]) { const ex = cx + sx * 7; const lift = o.brow === 'up' ? -2 : o.brow === 'down' ? 1 : 0; const skew = o.brow === 'skew' ? sx : 0; fig.line(ex - 4, ey - 6 + lift * 0.3 + skew, ex + 4, ey - 6 + lift - skew, hairC, 2); }
    // nose, mouth, blush
    fig.line(cx + 1, ey + 2, cx + 1, ey + 8, shade(skin, 0.7), 1); fig.rect(cx - 1, ey + 8, 4, 1, shade(skin, 0.7)); fig.set(cx + 3, ey + 7, shade(skin, 1.2));
    const my = ey + 14; const lip = o.lips ? rgb(o.lipC || 0xc1121f) : [120, 50, 50];
    if (o.mouth === 'grin') { fig.rect(cx - 7, my - 1, 14, 4, [70, 30, 30]); fig.rect(cx - 6, my, 12, 2, [250, 250, 250]); fig.set(cx - 7, my - 2, lip); fig.set(cx + 6, my - 2, lip); }
    else if (o.mouth === 'smile') { fig.line(cx - 6, my - 1, cx - 3, my + 1, lip, o.lips ? 2 : 1); fig.line(cx - 3, my + 1, cx + 3, my + 1, lip, o.lips ? 2 : 1); fig.line(cx + 3, my + 1, cx + 6, my - 1, lip, o.lips ? 2 : 1); }
    else if (o.mouth === 'smirk') { fig.line(cx - 5, my + 1, cx + 5, my - 1, lip, 1); fig.set(cx + 6, my - 2, lip); }
    else if (o.mouth === 'frown') { fig.line(cx - 5, my + 1, cx, my - 1, lip, 1); fig.line(cx, my - 1, cx + 5, my + 1, lip, 1); }
    else fig.rect(cx - 5, my, 10, 1, lip);
    if (o.moustache) { const m = rgb(o.moustache); fig.rect(cx - 8, my - 4, 16, 3, m); fig.rect(cx - 9, my - 3, 2, 2, m); fig.rect(cx + 7, my - 3, 2, 2, m); }
    if (o.blush) for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) fig.set(cx + sx * 12 + (k % 3) - 1, ey + 6 + Math.floor(k / 3), dither(k, k) ? [240, 140, 140] : [230, 120, 120]);
    if (o.cigar) { fig.rect(cx + 4, my, 14, 3, rgb(0x6a3a1a)); fig.rect(cx + 15, my, 3, 3, rgb(0xff6a00)); fig.rect(cx + 18, my - 3, 1, 3, [200, 200, 210, 140]); fig.rect(cx + 19, my - 6, 1, 3, [200, 200, 210, 90]); }
    if (o.glasses) for (const sx of [-1, 1]) { const ex = cx + sx * 7; fig.line(ex - 5, ey - 3, ex + 5, ey - 3, INK, 1); fig.line(ex - 5, ey + 3, ex + 5, ey + 3, INK, 1); fig.line(ex - 5, ey - 3, ex - 5, ey + 3, INK, 1); fig.line(ex + 5, ey - 3, ex + 5, ey + 3, INK, 1); }
    // hair
    const hs = o.hairStyle || 'short';
    if (hs !== 'bald' && o.hat !== 'gnome') {
      const longish = hs === 'long' || hs === 'curly';
      fig.ellipse(cx, cy - 6, rx + 1, ry - 4, null, (x, y, dx, dy) => (dy > (hs === 'slick' ? -0.35 : -0.15) && !(longish && Math.abs(dx) > 0.78)) ? null : (dither(x, y) && dx > 0.2 ? shade(hairC, 1.25) : hairC));
      if (hs === 'part') { fig.line(cx - 9, cy - ry + 2, cx + 3, cy - ry - 1, shade(hairC, 1.6), 1); fig.ellipse(cx + 8, cy - ry + 3, 8, 5, hairC); }
      if (hs === 'long') { fig.rect(cx - rx - 3, cy - 6, 6, 30, hairC); fig.rect(cx + rx - 3, cy - 6, 6, 30, hairC); fig.rect(cx - rx - 2, cy - 4, 2, 26, shade(hairC, 1.25)); }
      if (hs === 'curly') { // big wavy mane down to the shoulders, dithered curls
        for (let y = cy - 8; y < cy + 30; y++) { const w = 7 + Math.round(2.5 * Math.sin(y * 0.55)) + (y > cy + 14 ? 2 : 0); for (let k = 0; k < w; k++) { const curl = (Math.floor((k * 7 + y * 3) / 4) % 3 === 0); fig.set(cx - rx - k + 2, y, curl ? shade(hairC, 1.3) : (k % 2 ? hairC : shade(hairC, 0.85))); fig.set(cx + rx + k - 2, y, curl ? shade(hairC, 1.3) : (k % 2 ? hairC : shade(hairC, 0.85))); } }
        for (let x = cx - rx - 2; x <= cx + rx + 2; x += 3) fig.rect(x, cy - ry - 3 + ((x * 5) % 3), 2, 3, shade(hairC, 1.2)); // curls on top
      }
    } else if (hs === 'bald') { fig.ellipse(cx, cy - 4, rx + 1, ry - 2, null, (x, y, dx, dy) => (Math.abs(dx) > 0.86 && dy > -0.45 && dy < 0.35) ? (dither(x, y) ? shade(hairC, 1.2) : hairC) : null); }
    // hats
    const hatC = rgb(o.hatC || 0x333333);
    if (o.hat === 'cap') { fig.ellipse(cx, cy - ry + 6, rx + 2, 10, null, (x, y, dx, dy) => dy > 0.1 ? null : (dx < -0.3 ? shade(hatC, 0.8) : dx > 0.4 ? shade(hatC, 1.15) : hatC)); fig.rect(cx - rx - 3, cy - ry + 5, rx * 2 + 8, 3, shade(hatC, 0.6)); fig.rect(cx - 2, cy - ry - 3, 4, 2, shade(hatC, 0.8)); }
    if (o.hat === 'fedora') { const b = cy - ry + 4; fig.rect(cx - rx - 6, b, rx * 2 + 12, 3, shade(hatC, 1.1)); fig.rect(cx - rx - 6, b + 2, rx * 2 + 12, 2, shade(hatC, 0.6)); fig.rect(cx - rx + 2, b - 16, rx * 2 - 4, 17, hatC); fig.rect(cx - rx + 2, b - 16, 3, 17, shade(hatC, 1.35)); fig.rect(cx - rx + 2, b - 4, rx * 2 - 4, 3, rgb(0x8a1a1a)); fig.rect(cx - 4, b - 17, 10, 2, shade(hatC, 0.8)); }
    if (o.hat === 'gnome') { const b = cy - ry + 5; for (let y = b - 30; y <= b; y++) { const t = (y - (b - 30)) / 30; const half = Math.round(2 + (rx + 2) * t); fig.rect(cx - half + Math.round((1 - t) * 4), y, half * 2, 1, t > 0.85 ? shade(hatC, 0.7) : dither(0, y) && t < 0.4 ? shade(hatC, 1.2) : hatC); } fig.rect(cx - rx - 2, b - 2, rx * 2 + 4, 3, shade(hatC, 0.6)); }
    if (o.hat === 'tricorn') { const b = cy - ry + 5; fig.rect(cx - rx - 4, b - 6, rx * 2 + 8, 8, hatC); fig.rect(cx - rx - 4, b - 7, 4, 3, shade(hatC, 1.2)); fig.rect(cx + rx, b - 7, 4, 3, shade(hatC, 1.2)); fig.rect(cx - rx + 3, b - 12, rx * 2 - 6, 7, shade(hatC, 0.9)); fig.rect(cx - rx - 4, b, rx * 2 + 8, 2, rgb(0xffd400)); fig.ellipse(cx, b - 14, 3, 3, [250, 250, 250]); }
    if (o.headband) { const hb = rgb(o.headband); fig.rect(cx - rx - 1, cy - ry + 7, rx * 2 + 2, 3, hb); fig.rect(cx + rx - 1, cy - ry + 9, 5, 2, hb); fig.rect(cx + rx + 3, cy - ry + 11, 2, 6, shade(hb, 0.85)); }
    if (o.earring) { fig.rect(cx + rx + 1, cy + 6, 2, 2, rgb(0xffd400)); fig.set(cx + rx + 2, cy + 8, rgb(0xffd400)); }
    // props at the shoulder
    if (o.koelsch) { fig.rect(cx + 22, H - 22, 7, 16, rgb(0xffc300)); fig.rect(cx + 22, H - 24, 7, 3, [250, 250, 250]); fig.rect(cx + 22, H - 22, 1, 16, [255, 240, 160]); fig.rect(cx + 21, H - 6, 9, 1, INK); }
    if (o.wrench) { fig.rect(cx + 20, H - 26, 3, 22, [170, 170, 180]); fig.rect(cx + 18, H - 30, 7, 5, [170, 170, 180]); fig.rect(cx + 20, H - 29, 3, 2, [60, 60, 70]); }
    if (o.kranz) { fig.rect(cx - 34, H - 12, 16, 2, rgb(0x8a5a2a)); for (let k = 0; k < 4; k++) { fig.rect(cx - 33 + k * 4, H - 22, 3, 10, rgb(0xffc300)); fig.rect(cx - 33 + k * 4, H - 23, 3, 2, [250, 250, 250]); } }
    fig.outline(INK);
    bg.blit(fig);
    // drop shadow of the head onto the shoulders
    for (let x = cx - rx + 2; x < cx + rx - 2; x++) if (dither(x, shTop)) { const c = bg.get(x, shTop + 1); bg.set(x, shTop + 1, shade(c, 0.7)); }
    return bg.toCanvas(canvas);
  }

  function carSide(car, canvas) {
    const S = (root.Cars && root.Cars.SPECS && root.Cars.SPECS[car.shape]) || null;
    const W = 128, H = 44; const r = new Raster(W, H); const fig = new Raster(W, H);
    const spec = S || { L: 4.4, W: 1.72, wr: 0.32, floor: 0.27, body: [[-2.2, 0.8, 0.85], [-1.95, 0.86, 0.96], [-0.5, 0.87, 1], [0.9, 0.83, 1], [1.8, 0.74, 0.97], [2.2, 0.69, 0.84]], cabin: [[0.45, 0.82, 0.9], [-0.05, 1.28, 0.9], [-0.95, 1.31, 0.9], [-1.65, 1.06, 0.88], [-2.1, 0.84, 0.85]], ax: [1.4, -1.45], lights: 'round4' };
    const ppm = 23, gy = 37; const tail = spec.body[0][0], nose = spec.body[spec.body.length - 1][0]; const x0 = Math.round(W / 2 - (nose + tail) / 2 * ppm);
    const X = (z) => Math.round(x0 + z * ppm), Y = (m) => Math.round(gy - m * ppm);
    const interp = (st, z, k) => { if (z <= st[0][0]) return st[0][k]; if (z >= st[st.length - 1][0]) return st[st.length - 1][k]; for (let i = 0; i < st.length - 1; i++) { const a = st[i], b = st[i + 1]; if (z >= a[0] && z <= b[0]) { const t = (z - a[0]) / (b[0] - a[0] || 1); return a[k] + (b[k] - a[k]) * t; } } return st[0][k]; };
    const cab = spec.cabin.slice().reverse(); // ascending z
    const floorAt = (z) => spec.floor + Math.max(0, Math.abs(z) - (spec.L / 2 - 0.55)) * 0.5;
    const bc = new THREE.Color(car.color); if (bc.r + bc.g + bc.b < 0.3) bc.setHex(0x2a2a34);
    const base = [bc.r * 255, bc.g * 255, bc.b * 255]; const glassC = rgb(0x6fa8d8), glassD = rgb(0x2a4a70), chrome = [225, 228, 235], dark = [22, 22, 28];
    // body columns
    for (let x = X(tail); x <= X(nose); x++) {
      const z = (x - x0) / ppm; const top = interp(spec.body, z, 1), fl = floorAt(z); const yT = Y(top), yB = Y(fl);
      for (let y = yT; y <= yB; y++) { const t = (y - yT) / Math.max(1, yB - yT); let c = base; if (y === yT) c = shade(base, 1.45); else if (t < 0.18) c = shade(base, 1.2); else if (t < 0.3) c = dither(x, y) ? shade(base, 1.2) : base; else if (t > 0.86) c = shade(base, 0.62); else if (t > 0.7) c = dither(x, y) ? base : shade(base, 0.8); fig.set(x, y, c); }
      // greenhouse
      if (z >= cab[0][0] && z <= cab[cab.length - 1][0]) { const ct = interp(cab, z, 1); const yC = Y(ct); for (let y = yC; y < yT; y++) { const t = (y - yC) / Math.max(1, yT - yC); const diag = ((x - yC) + y * 2) % 23 < 5; fig.set(x, y, y === yC ? shade(base, 1.1) : y === yC + 1 ? base : diag ? shade(glassC, 1.25) : t < 0.5 ? glassC : mix(glassC, glassD, (t - 0.5) * 2)); } }
    }
    // pillars: A (cowl -> roof front), B (mid), C (roof rear -> rear window base)
    const P = (i) => [X(cab[i][0]), Y(cab[i][1])];
    const cowl = P(cab.length - 1), rf = P(cab.length - 2), rr = P(1), rwb = P(0);
    fig.line(cowl[0] - 1, cowl[1], rf[0], rf[1] + 1, base, 2); fig.line(rr[0], rr[1] + 1, rwb[0] + 1, rwb[1], base, 2);
    const bx = Math.round((rf[0] + rr[0]) / 2) - 3; fig.line(bx, rf[1] + 1, bx, cowl[1], shade(base, 0.7), 2);
    // belt line, sill, door seams, handle, mirror, stripe
    const beltY = Y(interp(spec.body, 0, 1));
    fig.rect(X(tail) + 2, beltY + 1, X(nose) - X(tail) - 4, 1, chrome);
    const doorZ = cab[cab.length - 1][0] - 0.05, door2 = doorZ - (spec.L > 4.6 ? 1.05 : 1.35);
    for (const dz of [doorZ, door2]) fig.rect(X(dz), beltY + 2, 1, Y(spec.floor) - beltY - 3, shade(base, 0.55));
    fig.rect(X(doorZ) - 6, beltY + 4, 4, 1, chrome);
    fig.rect(cowl[0] + 1, beltY - 4, 3, 3, base); fig.rect(cowl[0] + 1, beltY - 1, 1, 2, dark);
    if (car.stripe != null && car.stripe !== 0xffffff) { const st = rgb(car.stripe); fig.rect(X(tail) + 3, beltY + 7, X(nose) - X(tail) - 6, 2, st); }
    // wheel wells and wheels
    const wr = spec.wr * ppm; const wy = gy - wr;
    for (const az of spec.ax) { const wx = X(az); fig.ellipse(wx, wy, wr + 2, wr + 2, [0, 0, 0, 0], (x, y) => { if (y > wy + wr) return null; fig.set(x, y, [0, 0, 0, 0]); return null; }); }
    // re-fill wells transparent: clear pixels
    for (const az of spec.ax) { const wx = X(az); for (let y = Math.floor(wy - wr - 2); y <= wy + 1; y++) for (let x = Math.floor(wx - wr - 2); x <= wx + wr + 2; x++) { const dx = x - wx, dy = y - wy; if (dx * dx + dy * dy <= (wr + 2) * (wr + 2)) { const i = (y * W + x) * 4; if (x >= 0 && x < W && y >= 0 && y < H) fig.d[i + 3] = 0; } } }
    fig.outline(dark);
    for (const az of spec.ax) { const wx = X(az); fig.ellipse(wx, wy, wr, wr, null, (x, y, dx, dy) => { const rr2 = dx * dx + dy * dy; if (rr2 > 0.62) return (dx - dy) < -0.4 ? [50, 50, 58] : [24, 24, 30]; if (rr2 > 0.5) return [110, 110, 120]; if (rr2 > 0.1) { const a = Math.atan2(dy, dx); return Math.abs(Math.sin(a * 2.5)) > 0.85 ? [150, 150, 160] : [200, 202, 210]; } return [120, 120, 130]; }); fig.set(wx - 2, wy - 2, [245, 245, 250]); }
    // front: bumper, grille, lights; rear: bumper, tail light, plate, exhaust
    const nx = X(nose), tx = X(tail), by = Y(floorAt(nose) + 0.18);
    fig.rect(nx - 3, by, 5, 2, chrome); fig.rect(tx - 1, by, 5, 2, chrome); fig.rect(nx - 4, by + 2, 5, 1, shade(chrome, 0.6)); fig.rect(tx - 2, by + 2, 5, 1, shade(chrome, 0.6));
    const ly = Y(interp(spec.body, nose, 1) - 0.14);
    if (spec.lights === 'round4') { fig.rect(nx - 1, ly - 1, 3, 3, [255, 246, 200]); fig.rect(nx - 5, ly, 3, 2, [255, 246, 200]); }
    else if (spec.lights === 'vertical') { fig.rect(nx - 2, ly - 2, 3, 6, [255, 246, 200]); fig.rect(nx - 2, ly + 4, 3, 2, rgb(0xd88a10)); }
    else if (spec.lights === 'popup') { fig.rect(nx - 6, ly - 2, 6, 2, shade(base, 0.8)); fig.rect(nx - 5, ly - 1, 4, 1, [255, 246, 200]); }
    else fig.rect(nx - 3, ly - 1, 4, 3, [255, 246, 200]);
    fig.rect(nx - 1, ly + 1, 2, 1, [255, 255, 240]); fig.rect(nx - 4, by - 2, 3, 1, rgb(0xd88a10));
    fig.rect(tx - 1, ly, 3, 3, rgb(0xd01818)); fig.rect(tx, ly, 1, 1, [255, 90, 80]); fig.rect(tx + 2, by - 3, 5, 3, [244, 244, 244]); fig.rect(tx + 3, by - 2, 3, 1, [40, 40, 50]);
    fig.rect(tx + 2, gy - 3, 4, 2, [140, 140, 150]);
    // antenna
    fig.line(cowl[0] + 4, beltY - 2, cowl[0] + 6, beltY - 12, [90, 90, 100], 1);
    // ground shadow, then composite
    r.ellipse(W / 2, gy + 3, (nose - tail) / 2 * ppm + 6, 3, [0, 0, 0, 120]);
    r.blit(fig);
    return r.toCanvas(canvas);
  }

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

  // ---------------- pixel icons for the arcade menu ----------------
  // 16x16 char maps: . transparent, letters from ICON_PAL
  const ICON_PAL = { k: [20, 18, 28], w: [250, 250, 250], r: [214, 40, 40], R: [140, 20, 20], y: [255, 210, 63], Y: [200, 150, 20], o: [255, 122, 0], g: [58, 223, 58], G: [40, 140, 40], b: [79, 214, 255], B: [30, 100, 200], p: [255, 63, 160], s: [150, 150, 165], S: [90, 90, 105], t: [224, 172, 105], T: [160, 110, 60], n: [120, 80, 40], c: [255, 220, 120] };
  const ICONS = {
    flag: ['................', '.kk.............', '.kwkwkwkwkk.....', '.kkwkwkwkwk.....', '.kwkwkwkwkk.....', '.kkwkwkwkwk.....', '.kwkwkwkwkk.....', '.kkwkwkwkwk.....', '.kwkwkwkwkk.....', '.kk.............', '.kk.............', '.kk.............', '.kk.............', '.kk.............', '.kk.............', '................'],
    brick: ['................', 'kkkkkkkkkkkkkkkk', 'krrrkrrrrrkrrrrk', 'krrrkrrrrrkrrrrk', 'kkkkkkkkkkkkkkkk', 'krrrrrkrrrrrkrrk', 'krrrrrkrrrrrkrrk', 'kkkkkkkkkkkkkkkk', 'krrrkrrrrrkrrrrk', 'krrrkrrrrrkrrrrk', 'kkkkkkkkkkkkkkkk', 'krrrrrkrrrrrkrrk', 'krrrrrkrrrrrkrrk', 'kkkkkkkkkkkkkkkk', '................', '................'],
    trophy: ['................', '..kkkkkkkkkkkk..', '.kyyyyyyyyyyyyk.', 'kykyyyyyyyyyykyk', 'kykyyyyyyyyyykyk', '.kkyyyyyyyyyykk.', '...kyyyyyyyyk...', '...kyyyyyyyyk...', '....kyyyyyyk....', '.....kyyyyk.....', '......kyyk......', '......kyyk......', '....kkkYYkkk....', '...kYYYYYYYYk...', '...kkkkkkkkkk...', '................'],
    beer: ['................', '....kkkkkkk.....', '...kwwwwwwwk....', '..kwwwwwwwwwk...', '..kwwccwwwwwk...', '..kyyyyyyyykkk..', '..kyyyyyyyykwwk.', '..kyyyyyyyykwwk.', '..kyyyyyyyykwwk.', '..kyyyyyyyykwwk.', '..kyyyyyyyykkk..', '..kyyyyyyyyk....', '..kYYYYYYYYk....', '..kkkkkkkkkk....', '................', '................'],
    people: ['................', '...kkk....kkk...', '..kttk...kttk...', '..kttk...kttk...', '...kk.....kk....', '..kbbk...kppk...', '.kbbbbk.kppppk..', '.kbbbbk.kppppk..', '.kbbbbk.kppppk..', '..kbbk...kppk...', '..kSSk...kSSk...', '..kSSk...kSSk...', '..kkkk...kkkk...', '................', '................', '................'],
    speaker: ['................', '.......kk.......', '......kwk...k...', '.kkkkkwwk..k.k..', '.kssswwwk.k..k..', '.kssswwwk.k.k.k.', '.kssswwwk.k.k.k.', '.kssswwwk.k.k.k.', '.kssswwwk.k..k..', '.kkkkkwwk..k.k..', '......kwk...k...', '.......kk.......', '................', '................', '................', '................'],
    phone: ['................', '.....kkkkkk.....', '....kSSSSSSk....', '....kSkkkkSk....', '....kSkbbkSk....', '....kSkbbkSk....', '....kSkbbkSk....', '....kSkbbkSk....', '....kSkbbkSk....', '....kSkkkkSk....', '....kSSSSSSk....', '....kSSkkSSk....', '....kSSSSSSk....', '.....kkkkkk.....', '................', '................'],
    note: ['................', '.......kkkkkk...', '.......kyyyyyk..', '.......kykkkkk..', '.......kyk......', '.......kyk......', '.......kyk......', '.......kyk......', '.......kyk......', '....kkkkyk......', '...kppppyk......', '..kpppppyk......', '..kpppppk.......', '...kpppk........', '....kkk.........', '................'],
    coin: ['................', '.....kkkkkk.....', '...kkyyyyyykk...', '..kyyyyyyyyyyk..', '.kyyyYYkkYYyyyk.', '.kyyyYkyykYyyyk.', 'kyyyYYkyyykYyyyk', 'kyyyYkyyyykYyyyk', 'kyyyYkyyyykYyyyk', 'kyyyYYkyyykYyyyk', '.kyyyYkyykYyyyk.', '.kyyyYYkkYYyyyk.', '..kyyyyyyyyyyk..', '...kkyyyyyykk...', '.....kkkkkk.....', '................'],
    share: ['................', '..........kkk...', '.........kbbbk..', '.........kbbbk..', '........kkbbbk..', '.......k..kkk...', '......k.........', '..kkkk..........', '.kbbbbk.........', '.kbbbbk.........', '.kbbbbk.........', '..kkkk..k.......', '.........k......', '..........kkk...', '.........kbbbk..', '..........kkk...'],
    replay: ['................', '................', '..kkkkkkkkkkkk..', '.kssssssssssssk.', '.kskkkkkkkkkksk.', '.kskwwkkkkkwksk.', '.kskwwwkkkwwksk.', '.kskwwwwkwwwksk.', '.kskwwwkkkwwksk.', '.kskwwkkkkkwksk.', '.kskkkkkkkkkksk.', '.kssssssssssssk.', '..kkkkkkkkkkkk..', '................', '................', '................']
  };
  const JOYSTICK = [
    '..............................', '..............................', '..............kkkk............', '.............krrrrk...........', '............krrrrrrk..........', '............krRrrrrk..........', '............krrrrrrk..........', '.............krrrrk...........', '..............kkkk............', '...............ss.............', '...............ss.............', '...............ss.............', '...............ss.............', '...............ss.............', '...............ss.............', '...............ss.............',
    '............kkkkkkkk..........', '..........kkSSSSSSSSkk........', '........kkSSSSSSSSSSSSkk......', '.......kSSSSSSSSSSSSSSSSk.....', '.kkkk..kSSSSSSSSSSSSSSSSk.kkkk', 'kyyyyk.kSSSSSSSSSSSSSSSSkkbbbbk', 'kyyyykkkkkkkkkkkkkkkkkkkkkbbbbk', 'kYYYYkkkkkkkkkkkkkkkkkkkkkBBBBk', '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkk', '..............................', '..............................', '..............................', '..............................', '..............................'
  ];
  function drawMap(map, canvas, scale) {
    const h = map.length, w = map[0].length; scale = scale || 1; canvas.width = w * scale; canvas.height = h * scale;
    const x = canvas.getContext('2d'); x.clearRect(0, 0, canvas.width, canvas.height);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const ch = map[j][i]; if (ch === '.' || !ICON_PAL[ch]) continue; const c = ICON_PAL[ch]; x.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; x.fillRect(i * scale, j * scale, scale, scale); }
    return canvas;
  }
  function icon(name, canvas, scale) { return drawMap(ICONS[name] || ICONS.flag, canvas, scale || 1); }
  function joystick(canvas, scale) { return drawMap(JOYSTICK, canvas, scale || 2); }
  // a 24x24 chunky bevelled frame tile for CSS border-image (8px slices)
  function frameTile(color) {
    const c = document.createElement('canvas'); c.width = 24; c.height = 24; const x = c.getContext('2d');
    const col = color || [106, 63, 160]; const lite = col.map((v) => Math.min(255, v + 70)), dark = col.map((v) => Math.max(0, v - 50));
    const f = (rgb) => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    x.fillStyle = '#000'; x.fillRect(0, 0, 24, 24);
    x.fillStyle = f(col); x.fillRect(2, 2, 20, 20);
    x.fillStyle = f(lite); x.fillRect(2, 2, 20, 2); x.fillRect(2, 2, 2, 20);
    x.fillStyle = f(dark); x.fillRect(2, 20, 20, 2); x.fillRect(20, 2, 2, 20);
    x.fillStyle = '#000'; x.fillRect(8, 8, 8, 8); // the middle is not used, keep it neutral
    x.fillStyle = '#ffd23f'; x.fillRect(4, 4, 2, 2); x.fillRect(18, 4, 2, 2); x.fillRect(4, 18, 2, 2); x.fillRect(18, 18, 2, 2); // rivets
    return c.toDataURL();
  }
  root.Sprites = { portrait, carSide, logo, skyline, thumb, outline, dashboard, PORTRAITS, icon, joystick, frameTile, ICONS };
})(window);
