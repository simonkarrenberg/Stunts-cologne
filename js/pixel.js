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
  function toTex(c, repeat) {
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestMipMapLinearFilter;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
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
    const c = canvas(32, 32), x = c.getContext('2d'), r = mulberry(seed || 1);
    noiseFill(x, 32, 32, hex(color), [shade(color, 1.12), shade(color, 0.88), shade(color, 1.2)], r, 0.5);
    return toTex(c);
  });
  T.cobble = (color, seed) => cached('cobble' + color + seed, () => {
    const c = canvas(32, 32), x = c.getContext('2d'), r = mulberry(seed || 2);
    x.fillStyle = shade(color, 0.72); x.fillRect(0, 0, 32, 32);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      const ox = (j % 2) * 2;
      const k = 0.9 + r() * 0.2;
      x.fillStyle = shade(color, k); x.fillRect((i * 4 + ox) % 32, j * 4, 3, 3);
      x.fillStyle = shade(color, k * 1.08); x.fillRect((i * 4 + ox) % 32, j * 4, 2, 1);
    }
    return toTex(c);
  });
  T.grass = (color, seed) => cached('grass' + color + seed, () => {
    const c = canvas(32, 32), x = c.getContext('2d'), r = mulberry(seed || 3);
    noiseFill(x, 32, 32, hex(color), [shade(color, 1.18), shade(color, 0.82), shade(color, 1.3), shade(color, 0.7)], r, 0.45);
    for (let i = 0; i < 18; i++) { x.fillStyle = shade(color, 1.35); const px = Math.floor(r() * 32), py = Math.floor(r() * 32); x.fillRect(px, py, 1, 2); }
    return toTex(c);
  });
  T.water = (color) => cached('water' + color, () => {
    const c = canvas(64, 32), x = c.getContext('2d'), r = mulberry(7);
    noiseFill(x, 64, 32, hex(color), [shade(color, 1.1), shade(color, 0.9)], r, 0.3);
    for (let i = 0; i < 26; i++) { x.fillStyle = shade(color, 1.45); const px = Math.floor(r() * 60), py = Math.floor(r() * 32); x.fillRect(px, py, 3 + Math.floor(r() * 4), 1); }
    for (let i = 0; i < 10; i++) { x.fillStyle = '#e8f4ff'; const px = Math.floor(r() * 60), py = Math.floor(r() * 32); x.fillRect(px, py, 2, 1); }
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
    const key = `fac${style}${wall}${seed}${night}`;
    return cached(key, () => {
      const W = 64, H = 64, c = canvas(W, H), x = c.getContext('2d'), r = mulberry(seed || 11);
      const wallC = hex(wall);
      x.fillStyle = wallC; x.fillRect(0, 0, W, H);
      // subtle texture
      for (let i = 0; i < 260; i++) { x.fillStyle = r() < 0.5 ? shade(wall, 1.06) : shade(wall, 0.94); x.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 1); }
      const bays = 4, floors = 4, bw = W / bays, fh = H / floors;
      for (let f = 0; f < floors; f++) {
        const y0 = H - (f + 1) * fh;
        if (style === 'gruenderzeit' || style === 'altstadt') { x.fillStyle = shade(wall, 0.8); x.fillRect(0, y0 + fh - 1, W, 1); x.fillStyle = shade(wall, 1.15); x.fillRect(0, y0 + fh - 2, W, 1); }
        for (let b = 0; b < bays; b++) {
          const x0 = b * bw;
          const lit = night && r() < 0.45;
          const glass = lit ? (r() < 0.5 ? '#ffe08a' : '#ffc860') : (style === 'modern' || style === 'glass' ? '#6f9fc8' : '#2a3140');
          if (style === 'modern' || style === 'glass') {
            x.fillStyle = glass; x.fillRect(x0 + 1, y0 + 1, bw - 2, fh - 2);
            x.fillStyle = lit ? '#fff2b0' : '#9fc8ea'; x.fillRect(x0 + 2, y0 + 2, 3, 2);
            x.fillStyle = shade(wall, 0.7); x.fillRect(x0, y0, W, 1); x.fillRect(x0, y0, 1, fh);
          } else if (style === 'industrial') {
            x.fillStyle = glass; x.fillRect(x0 + 3, y0 + 2, bw - 6, fh - 5);
            x.fillStyle = shade(wall, 0.75); x.fillRect(x0 + 3 + Math.floor((bw - 6) / 2), y0 + 2, 1, fh - 5); x.fillRect(x0 + 3, y0 + 2 + Math.floor((fh - 5) / 2), bw - 6, 1);
          } else {
            // window with frame; arched for gründerzeit
            const ww = bw - 8, wh = fh - 6, wx = x0 + 4, wy = y0 + 3;
            x.fillStyle = style === 'altstadt' ? '#f4f1ea' : '#e8e2d2'; x.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);
            x.fillStyle = glass; x.fillRect(wx, wy, ww, wh);
            if (style === 'gruenderzeit') { x.fillStyle = '#e8e2d2'; x.fillRect(wx, wy - 2, ww, 1); x.fillRect(wx + 1, wy - 3, ww - 2, 1); }
            x.fillStyle = lit ? '#fff6c8' : '#5f7a95'; x.fillRect(wx, wy, 1, wh); x.fillRect(wx, wy, ww, 1);
            if (style === 'altstadt' && f === 0) { x.fillStyle = '#6b3a2a'; x.fillRect(wx - 1, wy + 2, ww + 2, wh - 1); x.fillStyle = '#c9a34a'; x.fillRect(wx + ww - 2, wy + 6, 1, 1); }
          }
        }
      }
      // ground floor shop band for gruenderzeit / concrete
      if (style === 'gruenderzeit' || style === 'concrete') { x.fillStyle = shade(wall, 0.72); x.fillRect(0, H - fh - 2, W, 2); }
      // brick base
      if (style === 'industrial') { for (let y = 0; y < H; y += 3) { x.fillStyle = shade(wall, 0.85); x.fillRect(0, y, W, 1); } }
      return toTex(c);
    });
  };
  T.roof = (color, seed) => cached('roof' + color + seed, () => {
    const c = canvas(32, 32), x = c.getContext('2d'), r = mulberry(seed || 5);
    x.fillStyle = hex(color); x.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 32; y += 4) { for (let px = 0; px < 32; px += 4) { const ox = (y / 4) % 2 ? 2 : 0; x.fillStyle = shade(color, 0.8 + r() * 0.35); x.fillRect((px + ox) % 32, y, 3, 3); } x.fillStyle = shade(color, 0.6); x.fillRect(0, y + 3, 32, 1); }
    return toTex(c);
  });
  T.brick = (color) => cached('brick' + color, () => {
    const c = canvas(32, 32), x = c.getContext('2d'), r = mulberry(9);
    x.fillStyle = shade(color, 0.65); x.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 32; y += 4) { const ox = (y / 4) % 2 ? 4 : 0; for (let px = -8; px < 32; px += 8) { x.fillStyle = shade(color, 0.85 + r() * 0.3); x.fillRect(px + ox, y, 7, 3); } }
    return toTex(c);
  });
  T.tracery = () => cached('tracery', () => {
    // gothic stonework for the Dom: dark grey with lighter ribs and pointed arches
    const c = canvas(64, 96), x = c.getContext('2d'), r = mulberry(13);
    x.fillStyle = '#6e6c72'; x.fillRect(0, 0, 64, 96);
    for (let i = 0; i < 900; i++) { x.fillStyle = r() < 0.5 ? '#7a7880' : '#5e5c64'; x.fillRect(Math.floor(r() * 64), Math.floor(r() * 96), 1, 1); }
    for (let b = 0; b < 4; b++) {
      const x0 = b * 16;
      x.fillStyle = '#8c8a94'; x.fillRect(x0, 0, 2, 96); x.fillStyle = '#4a484f'; x.fillRect(x0 + 2, 0, 1, 96); // rib + shadow
      // pointed window
      x.fillStyle = '#23222a'; x.fillRect(x0 + 5, 30, 6, 60);
      x.fillRect(x0 + 6, 27, 4, 3); x.fillRect(x0 + 7, 24, 2, 3);
      x.fillStyle = '#9a98a4'; x.fillRect(x0 + 4, 30, 1, 60); x.fillRect(x0 + 11, 30, 1, 60);
      x.fillStyle = '#7a7884'; x.fillRect(x0 + 8, 30, 1, 60); // mullion
      x.fillStyle = '#a4a2ae'; x.fillRect(x0 + 3, 10, 10, 2); x.fillRect(x0 + 5, 6, 6, 2); x.fillRect(x0 + 7, 3, 2, 3); // pinnacle stonework
      x.fillStyle = '#4a484f'; x.fillRect(x0 + 3, 12, 10, 1);
    }
    return toTex(c);
  });
  T.romanesque = (color) => cached('roman' + color, () => {
    const c = canvas(64, 64), x = c.getContext('2d'), r = mulberry(17);
    x.fillStyle = hex(color); x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 400; i++) { x.fillStyle = r() < 0.5 ? shade(color, 1.08) : shade(color, 0.9); x.fillRect(Math.floor(r() * 64), Math.floor(r() * 64), 1, 1); }
    for (let y = 0; y < 64; y += 8) { x.fillStyle = shade(color, 0.78); x.fillRect(0, y + 7, 64, 1); }
    for (let b = 0; b < 4; b++) { const x0 = b * 16; x.fillStyle = '#2a2a30'; x.fillRect(x0 + 5, 20, 6, 30); x.fillRect(x0 + 6, 18, 4, 2); x.fillStyle = shade(color, 1.2); x.fillRect(x0 + 4, 18, 8, 1); }
    return toTex(c);
  });
  T.steel = (color) => cached('steel' + color, () => {
    const c = canvas(16, 16), x = c.getContext('2d');
    x.fillStyle = hex(color); x.fillRect(0, 0, 16, 16);
    x.fillStyle = shade(color, 0.75); for (let i = 0; i < 16; i += 4) { x.fillRect(i, 0, 1, 16); x.fillRect(0, i, 16, 1); }
    x.fillStyle = shade(color, 1.25); x.fillRect(2, 2, 1, 1); x.fillRect(6, 6, 1, 1); x.fillRect(10, 10, 1, 1); x.fillRect(14, 14, 1, 1);
    return toTex(c);
  });
  T.stripes = (a, b) => cached('stripes' + a + b, () => { const c = canvas(8, 8), x = c.getContext('2d'); x.fillStyle = hex(a); x.fillRect(0, 0, 8, 8); x.fillStyle = hex(b); x.fillRect(0, 0, 8, 4); return toTex(c); });

  // ---------- sky ----------
  T.sky = (theme) => cached('sky' + theme.sky + theme.night, () => {
    const W = 512, H = 256, c = canvas(W, H), x = c.getContext('2d'), r = mulberry(21);
    const top = new THREE.Color(theme.sky), hor = new THREE.Color(theme.fog);
    const steps = 14;
    for (let i = 0; i < steps; i++) {
      const u = i / (steps - 1);
      const col = top.clone().lerp(hor, Math.pow(u, 1.4));
      x.fillStyle = '#' + col.getHexString();
      x.fillRect(0, Math.floor(i * (H / 2) / steps), W, Math.ceil(H / 2 / steps) + 1);
    }
    x.fillStyle = '#' + hor.getHexString(); x.fillRect(0, H / 2, W, H / 2);
    if (theme.night) {
      for (let i = 0; i < 260; i++) { x.fillStyle = r() < 0.2 ? '#ffffff' : '#c8d0ff'; x.fillRect(Math.floor(r() * W), Math.floor(r() * H * 0.45), 1, 1); }
      // moon
      x.fillStyle = '#f4f1d0'; x.fillRect(400, 40, 14, 14); x.fillRect(398, 42, 18, 10); x.fillRect(402, 38, 10, 18);
      x.fillStyle = '#d8d4b0'; x.fillRect(404, 46, 3, 3); x.fillRect(409, 50, 2, 2);
    } else {
      // sun
      const sx = theme.sunset ? 430 : 120, sy = theme.sunset ? 100 : 36;
      x.fillStyle = theme.sunset ? '#ffd27a' : '#fff6c8'; x.fillRect(sx - 8, sy - 8, 16, 16); x.fillRect(sx - 10, sy - 6, 20, 12); x.fillRect(sx - 6, sy - 10, 12, 20);
      // clouds
      for (let i = 0; i < 12; i++) {
        const cx = Math.floor(r() * W), cy = 20 + Math.floor(r() * 80), cw = 20 + Math.floor(r() * 50);
        const cc = theme.sunset ? '#ffe9d0' : '#ffffff';
        x.fillStyle = cc; x.fillRect(cx, cy, cw, 6); x.fillRect(cx + 6, cy - 4, cw - 14, 4); x.fillRect(cx + 12, cy - 7, cw - 26, 3);
        x.fillStyle = theme.sunset ? '#f4c9a8' : '#dfe9f5'; x.fillRect(cx, cy + 5, cw, 2);
      }
    }
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.wrapS = THREE.RepeatWrapping;
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
    const rw = Math.max(160, Math.floor(w / this.scale)), rh = Math.max(100, Math.floor(h / this.scale));
    this.rt.setSize(rw, rh);
    this.mat.uniforms.res.value.set(rw, rh);
  };
  PixelPost.prototype.setScale = function (s) { this.scale = s; this.setSize(window.innerWidth, window.innerHeight); };
  PixelPost.prototype.render = function (scene, camera) {
    this.renderer.setRenderTarget(this.rt);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.cam);
  };

  root.Pixel = { T, PixelPost, mulberry, shade, hex };
})(window);
