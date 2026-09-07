/* ============================================================
   KÖLLE 4D — CHICAGO AM RHEIN
   Game: 8-car race, turbo & damage, cameras, HUD, cockpit,
   menu with driver/car/track cards, results, Klüngel-Baukasten
   track editor, records, music, mobile input.
   ============================================================ */
(function () {
  'use strict';
  const TB = window.TrackBuilder, W = window.World, D = window.GameData, SP = window.Sprites;
  const $ = (s) => document.querySelector(s);
  const ROAD_W = W.ROAD_W;
  const G = 9.81;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtTime = (t) => { if (t == null || !isFinite(t)) return '--:--.--'; const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s.toFixed(2).padStart(5, '0')}`; };
  const TRACKS = D.TRACKS.slice().sort((a, b) => (a.order || 9) - (b.order || 9));
  const PLAYABLE = D.DRIVERS.filter((d) => d.diff);
  const tuenn = D.TUENN;

  // ---------------- state ----------------
  const sel = { track: 0, car: 0, driver: 0 };
  let renderer, scene, camera, track, trackDef, theme, road, scenery, confetti, sunLight, hemi, carLight, post, pixelScale = 3;
  let racers = [], player = null, raceTime = 0, countdown = 0, phase = 'menu'; // menu | countdown | race | finished | editor
  let camMode = 0, camPos = new THREE.Vector3(), camUp = new THREE.Vector3(0, 1, 0), camLook = new THREE.Vector3();
  let lastT = 0, msgTimer = 0, tvCam = null, tvTimer = 0, shake = 0, lastPos = null;
  let radioTimer = 12, eventTimer = 30, blitzers = [], knoellchen = 0, koelsch = 0, flashTimer = 0;
  const input = { gas: 0, brake: 0, steer: 0, turbo: 0 };
  const keys = {};
  let customTracks = [];

  // ---------------- audio ----------------
  const audio = { ctx: null, muted: false, engine: null, gain: null, filter: null };
  function audioInit() {
    if (audio.ctx) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      o1.type = 'sawtooth'; o2.type = 'square';
      const g = ctx.createGain(); g.gain.value = 0;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(ctx.destination);
      o1.start(); o2.start();
      audio.ctx = ctx; audio.engine = [o1, o2]; audio.gain = g; audio.filter = f;
    } catch (e) { /* no audio */ }
  }
  function audioEngine(v, gas, turbo) {
    if (!audio.ctx) return;
    const rpm = 40 + v * 4.2 + gas * 12 + (turbo ? 40 : 0);
    audio.engine[0].frequency.setTargetAtTime(rpm, audio.ctx.currentTime, 0.05);
    audio.engine[1].frequency.setTargetAtTime(rpm * 0.5, audio.ctx.currentTime, 0.05);
    audio.filter.frequency.setTargetAtTime(300 + v * 20, audio.ctx.currentTime, 0.1);
    const target = (audio.muted || phase === 'menu' || phase === 'editor') ? 0 : 0.05 + gas * 0.04 + Math.min(0.06, v * 0.001);
    audio.gain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.1);
  }
  function beep(freq, dur, type, vol) {
    if (!audio.ctx || audio.muted) return;
    const o = audio.ctx.createOscillator(), g = audio.ctx.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    g.gain.value = vol || 0.15; g.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + dur);
    o.connect(g); g.connect(audio.ctx.destination); o.start(); o.stop(audio.ctx.currentTime + dur);
  }
  function crashSound() {
    if (!audio.ctx || audio.muted) return;
    const ctx = audio.ctx, len = ctx.sampleRate * 0.5, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf; const g = ctx.createGain(); g.gain.value = 0.3;
    src.connect(g); g.connect(ctx.destination); src.start();
  }
  function fanfare(win) { const notes = win ? [523, 659, 784, 1047] : [392, 349, 311, 262]; notes.forEach((f, i) => setTimeout(() => beep(f, 0.35, 'triangle', 0.2), i * 180)); }

  // ---------------- music ----------------
  const music = { el: null, title: '', muted: false, chip: null, wanted: false };
  function idb(cb) { try { const r = indexedDB.open('stuntskoelle', 1); r.onupgradeneeded = () => r.result.createObjectStore('files'); r.onsuccess = () => cb(r.result); r.onerror = () => cb(null); } catch (e) { cb(null); } }
  function musicStore(file) { idb((db) => { if (!db) return; db.transaction('files', 'readwrite').objectStore('files').put(file, 'song'); }); }
  function musicLoadStored(cb) { idb((db) => { if (!db) return cb(null); const rq = db.transaction('files', 'readonly').objectStore('files').get('song'); rq.onsuccess = () => cb(rq.result || null); rq.onerror = () => cb(null); }); }
  function musicUse(fileOrUrl, title) {
    if (music.el) { music.el.pause(); music.el = null; }
    const el = new Audio(); el.loop = true; el.volume = 0.7; el.preload = 'auto';
    el.src = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    music.el = el; music.title = title;
    el.addEventListener('canplaythrough', () => { if (music.wanted) musicPlay(); }, { once: true });
    el.addEventListener('error', () => { music.el = null; music.title = ''; updateMusicUI(); if (music.wanted) chipStart(); });
    el.load(); updateMusicUI();
  }
  function musicPlay() { music.wanted = true; if (music.muted) return; if (music.el) { const p = music.el.play(); if (p && p.catch) p.catch(() => {}); chipStop(); } else chipStart(); }
  function musicStop() { music.wanted = false; if (music.el) music.el.pause(); chipStop(); }
  function updateMusicUI() { const t = music.el ? '♪ ' + music.title : '♪ Chiptune (eigenen Song laden)'; $('#musicTitle').textContent = t; }
  function chipStart() {
    if (!audio.ctx || music.chip || music.muted) return;
    const ctx = audio.ctx, g = ctx.createGain(); g.gain.value = 0.05; g.connect(ctx.destination);
    const bass = ctx.createOscillator(); bass.type = 'square'; const lead = ctx.createOscillator(); lead.type = 'triangle';
    const lg = ctx.createGain(); lg.gain.value = 0.6; lead.connect(lg); lg.connect(g); bass.connect(g); bass.start(); lead.start();
    const chords = [[0, 4, 7], [5, 9, 12], [7, 11, 14], [9, 12, 16]]; const root = 110; let step = 0;
    const tick = () => { const c = chords[Math.floor(step / 8) % 4]; const n = c[step % 3]; const oct = step % 2 ? 2 : 1;
      bass.frequency.setValueAtTime(root * Math.pow(2, c[0] / 12) * (step % 4 < 2 ? 1 : 0.5), ctx.currentTime);
      lead.frequency.setValueAtTime(root * 2 * Math.pow(2, n / 12) * oct, ctx.currentTime); step++; };
    music.chip = { timer: setInterval(tick, 150), stop: () => { bass.stop(); lead.stop(); g.disconnect(); } };
  }
  function chipStop() { if (music.chip) { clearInterval(music.chip.timer); music.chip.stop(); music.chip = null; } }
  function musicInit() {
    musicLoadStored((file) => { if (file) musicUse(file, file.name.replace(/\.[^.]+$/, '')); else musicUse('music/lamborghina.mp3', 'LamboGina'); });
    const inp = $('#musicFile');
    inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; if (!f) return; musicStore(f); musicUse(f, f.name.replace(/\.[^.]+$/, '')); music.wanted = true; musicPlay(); });
    $('#musicBtn').onclick = () => inp.click();
  }
  function toggleMute() {
    audio.muted = !audio.muted; music.muted = audio.muted;
    $('#muteBtn').textContent = audio.muted ? '🔇' : '🔊';
    if (audio.muted) { if (music.el) music.el.pause(); chipStop(); } else if (music.wanted) musicPlay();
  }

  // ---------------- messages ----------------
  function say(who, text, ms) {
    $('#msgWho').textContent = `${who.emoji || '🏁'} ${who.name}`;
    $('#msgText').textContent = text;
    $('#msg').classList.add('show');
    msgTimer = (ms || 3500) / 1000;
  }

  // ---------------- racers ----------------
  function makeRacer(carDef, mesh, driver, isAI) {
    return {
      car: carDef, mesh, driver, isAI, name: isAI ? driver.name : 'DU',
      s: 0, lat: 0, v: 0, air: false, y: 0, vy: 0, lap: 1, safeS: 0, crashed: 0,
      finished: false, finishTime: null, laps: [], lapStart: 0, prevRoadVy: 0, wasInLoop: false,
      steerVis: 0, aiTimer: 0, aiSlow: 1, jumpStartS: 0, bestLap: null, wobblePhase: Math.random() * 10, laneBias: 0,
      turbo: 0.5, turboOn: false, damage: 0, skill: driver.skill, wobble: driver.wobble
    };
  }
  function respawn(r) { r.s = ((r.safeS - 18) % track.length + track.length) % track.length; r.lat = 0; r.v = 0; r.air = false; r.vy = 0; r.crashed = 0; r.prevRoadVy = 0; }
  function crash(r, kind) {
    if (r.crashed > 0) return;
    r.crashed = 2.2; r.v = 0; r.air = false; r.turboOn = false;
    r.damage = Math.min(1, r.damage + 0.25);
    if (!r.isAI) {
      crashSound(); shake = 1;
      const quotes = kind === 'water' ? tuenn.water : kind === 'loop' ? tuenn.loopFall : tuenn.crash;
      if (r.damage >= 1) { say(tuenn, pick(tuenn.damage), 3000); r.damage = 0; r.crashed = 3.5; }
      else say(tuenn, pick(quotes), 3000);
    }
  }

  function updateRacer(r, dt, ctl) {
    const car = r.car;
    if (r.crashed > 0) { r.crashed -= dt; if (r.crashed <= 0) respawn(r); return; }
    const f = TB.frameAt(track, r.s);
    const roadY = f.p.y;
    // turbo
    const nitroK = 0.6 + car.nitro * 0.12;
    if (ctl.turbo && r.turbo > 0.02 && r.v > 5 && !r.air) { r.turboOn = true; r.turbo = Math.max(0, r.turbo - dt * 0.22); if (!r.isAI && !r.turboWasOn) say(tuenn, pick(tuenn.turbo), 1500); }
    else { r.turboOn = false; if (r.v > 15) r.turbo = Math.min(1, r.turbo + dt * (0.035 + (Math.abs(r.slide || 0) > 1 ? 0.06 : 0)) * nitroK); }
    r.turboWasOn = r.turboOn;
    const topMul = (1 - r.damage * 0.2) * (r.turboOn ? 1.18 : 1);
    if (!r.air) {
      const slope = f.T.y;
      let a = ctl.gas * car.accel * (r.turboOn ? 1.9 : 1) - ctl.brake * (r.v > 0.5 ? car.brake : -car.accel * 0.4) - G * slope * 0.9;
      a -= r.v * Math.abs(r.v) * 0.004 + (ctl.gas > 0 ? 0 : 0.8) * Math.sign(r.v);
      r.v += a * dt;
      r.v = clamp(r.v, -8, car.top * topMul * (1.0 + (slope < 0 ? 0.15 : 0)));
      const bankAssist = Math.min(1, Math.abs(f.roll) / (25 * Math.PI / 180)) * 0.6;
      const gripAcc = 24 * car.grip * (1 + bankAssist);
      const need = f.curv * r.v * Math.abs(r.v);
      const centrifugal = Math.sign(need) * Math.max(0, Math.abs(need) - gripAcc) * 0.28;
      r.slide = centrifugal;
      const steerV = ctl.steer * car.steer * (2.5 + 0.16 * Math.abs(r.v));
      r.lat += (steerV + centrifugal) * dt;
      if (Math.abs(r.lat) > ROAD_W + 1.6) {
        if (r.isAI) { r.lat = clamp(r.lat, -ROAD_W, ROAD_W); r.v *= 0.6; }
        else { crash(r, 'off'); return; }
      }
      if (f.kind === 'loop') { r.wasInLoop = true; if (f.N.y < 0.2 && r.v < 21) { crash(r, 'loop'); return; } }
      else if (r.wasInLoop) { r.wasInLoop = false; if (!r.isAI) say(tuenn, pick(tuenn.loopOk), 2500); }
      r.s += r.v * dt;
      const f2 = TB.frameAt(track, r.s);
      if (f2.kind === 'gap' && f.kind !== 'gap') {
        const a0 = f.rampAngle; r.air = true; r.y = f.p.y + 0.1; r.vy = r.v * Math.sin(a0) + 0.5; r.v = Math.max(r.v * Math.cos(a0), 4); r.jumpStartS = r.s;
      } else if (f2.kind === 'gap') { r.air = true; r.y = roadY; r.vy = 0; }
      else {
        const roadVy = r.v * f2.T.y;
        if (r.prevRoadVy - roadVy > G * dt * 1.3 && r.v > 25 && f2.kind !== 'loop') { r.air = true; r.y = f2.p.y; r.vy = r.prevRoadVy; }
        r.prevRoadVy = roadVy;
      }
      if (!r.air && Math.abs(r.lat) < ROAD_W && ['straight', 'bridge', 'tunnel', 'curve', 'hill', 'dip'].includes(f.kind) && f.N.y > 0.9) r.safeS = r.s;
    } else {
      r.s += r.v * dt;
      r.lat += ctl.steer * car.steer * 1.5 * dt;
      r.y += r.vy * dt; r.vy -= G * dt;
      const f2 = TB.frameAt(track, r.s);
      const ry = f2.p.y;
      if (f2.kind === 'gap') { if (r.y < W.WATER_Y + 0.4) { crash(r, 'water'); return; } }
      else if (r.y <= ry + 0.12) {
        r.air = false; r.y = ry; r.prevRoadVy = r.v * f2.T.y;
        if (Math.abs(r.lat) > ROAD_W + 1.6) { if (r.isAI) r.lat = clamp(r.lat, -ROAD_W, ROAD_W); else { crash(r, 'off'); return; } }
        if (r.vy < -22) { r.v *= 0.55; r.damage = Math.min(1, r.damage + 0.08); } else if (r.vy < -14) r.v *= 0.8;
        if (!r.isAI && r.s - r.jumpStartS > 20 && r.jumpStartS > 0) { say(tuenn, pick(tuenn.jumpOk), 2500); r.jumpStartS = 0; }
        r.vy = 0;
      }
      if (r.y - ry > 60) { crash(r, 'off'); return; }
    }
    if (r.s >= track.length) {
      r.s -= track.length; r.safeS = Math.max(0, r.safeS - track.length);
      const lapTime = raceTime - r.lapStart; r.lapStart = raceTime; r.laps.push(lapTime);
      if (r.bestLap == null || lapTime < r.bestLap) r.bestLap = lapTime;
      r.lap++;
      if (r.lap > trackDef.laps) { r.finished = true; r.finishTime = raceTime; r.lap = trackDef.laps; }
      else if (!r.isAI) say(tuenn, tuenn.lap[Math.min(tuenn.lap.length - 1, r.lap - 2 + (r.lap === trackDef.laps ? 1 : 0))], 2500);
    }
    r.steerVis += (ctl.steer - r.steerVis) * Math.min(1, dt * 10);
  }

  function aiControl(r, dt) {
    r.aiTimer -= dt;
    if (r.aiTimer <= 0) { r.aiTimer = 4 + Math.random() * 8; r.aiSlow = Math.random() < r.wobble * 0.6 ? 0.55 + Math.random() * 0.3 : 1; r.laneBias = (Math.random() - 0.5) * 6; }
    const i = Math.floor(((r.s % track.length) + track.length) % track.length / track.ds) % track.samples.length;
    const target = Math.min(r.car.top * r.skill * 1.05, track.safe[i] * (0.9 + r.skill * 0.2)) * (r.aiSlow < 1 ? r.aiSlow : 1);
    let gas = r.v < target ? 1 : 0, brake = r.v > target + 3 ? 0.8 : 0;
    let wantLat = Math.sin(raceTime * 0.7 + r.wobblePhase) * r.wobble * 2 + r.laneBias * 0.5;
    // avoid the car ahead
    for (const o of racers) {
      if (o === r || o.crashed > 0) continue;
      let ds = o.s - r.s; const L = track.length; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
      if (ds > 0 && ds < 16 && Math.abs(o.lat - r.lat) < 3) { wantLat = r.lat + (r.lat > o.lat ? 3 : -3); if (ds < 7 && o.v < r.v) gas = 0.3; }
    }
    wantLat = clamp(wantLat, -ROAD_W + 1.5, ROAD_W - 1.5);
    let steer = clamp((wantLat - r.lat) * 0.35, -1, 1);
    const f = TB.frameAt(track, r.s);
    const need = f.curv * r.v * r.v, gripAcc = 24 * r.car.grip;
    const slide = Math.sign(need) * Math.max(0, Math.abs(need) - gripAcc) * 0.28;
    steer -= clamp(slide / (2.5 + 0.16 * r.v), -1, 1);
    const turbo = r.turbo > 0.6 && f.kind === 'straight' && r.skill > 0.88 && Math.random() < 0.02 ? 1 : (r.turboOn && r.turbo > 0.05 ? 1 : 0);
    return { gas, brake, steer: clamp(steer, -1, 1), turbo };
  }

  function collide(a, b) {
    if (a.crashed > 0 || b.crashed > 0 || a.air !== b.air) return;
    let ds = a.s - b.s; const L = track.length;
    if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
    const dl = a.lat - b.lat;
    if (Math.abs(ds) < 4.6 && Math.abs(dl) < 2.3) {
      const push = (dl >= 0 ? 1 : -1) * 4;
      a.lat += push * 0.05; b.lat -= push * 0.05;
      if (Math.abs(ds) < 2.5) { a.lat += push * 0.08; b.lat -= push * 0.08; }
      else if (ds > 0) { const vb = b.v; b.v = Math.min(b.v, a.v * 0.95); a.v = Math.max(a.v, vb * 0.9); }
      else { const va = a.v; a.v = Math.min(a.v, b.v * 0.95); b.v = Math.max(b.v, va * 0.9); }
      for (const r of [a, b]) if (!r.isAI) { r.damage = Math.min(1, r.damage + 0.01); }
      if (!a.isAI || !b.isAI) beep(90, 0.08, 'sawtooth', 0.08);
    }
  }

  // ---------------- placing meshes ----------------
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
  function placeRacer(r, dt) {
    const f = TB.frameAt(track, r.s);
    const T = new THREE.Vector3(f.T.x, f.T.y, f.T.z), N = new THREE.Vector3(f.N.x, f.N.y, f.N.z), B = new THREE.Vector3(f.B.x, f.B.y, f.B.z);
    const pos = new THREE.Vector3(f.p.x, f.p.y, f.p.z).addScaledVector(B, r.lat).addScaledVector(N, 0.1);
    if (r.air) pos.y = r.y + 0.1;
    const yaw = -r.steerVis * 0.18 * Math.sign(r.v || 1);
    let fwd = T.clone().applyAxisAngle(N, yaw);
    let up = N.clone();
    if (r.air) { const pitch = clamp(Math.atan2(r.vy, Math.max(5, r.v)), -0.6, 0.6); fwd = new THREE.Vector3(T.x, 0, T.z).normalize().applyAxisAngle(B, -pitch); up = new THREE.Vector3(0, 1, 0).applyAxisAngle(B, -pitch); }
    const right = new THREE.Vector3().crossVectors(up, fwd).normalize();
    _m.makeBasis(right, up, fwd); _q.setFromRotationMatrix(_m);
    r.mesh.position.copy(pos);
    r.mesh.quaternion.slerp(_q, Math.min(1, dt * 14));
    if (r.crashed > 0) { r.mesh.rotation.z += dt * 6; r.mesh.position.y += Math.sin(r.crashed * 9) * 0.5 + 0.5; }
    r.frame = { pos, T, N, B, fwd, up };
  }

  // ---------------- camera ----------------
  function updateCamera(dt) {
    if (window.STUNTS_FREECAM) { const fc = window.STUNTS_FREECAM; camera.position.set(fc.pos[0], fc.pos[1], fc.pos[2]); camera.up.set(0, 1, 0); camera.lookAt(fc.look[0], fc.look[1], fc.look[2]); return; }
    const fr = player && player.frame; if (!fr) return;
    let target, look, up; const N = fr.N, T = fr.T;
    if (camMode === 0 || camMode === 2) {
      const dist = camMode === 0 ? 11 : 20, h = camMode === 0 ? 4.2 : 8;
      target = fr.pos.clone().addScaledVector(T, -dist).addScaledVector(N, h);
      look = fr.pos.clone().addScaledVector(T, 6).addScaledVector(N, 1); up = N;
    } else if (camMode === 1) {
      target = fr.pos.clone().addScaledVector(T, -0.2).addScaledVector(N, 1.45);
      look = fr.pos.clone().addScaledVector(T, 30).addScaledVector(N, 1.0); up = N;
    } else {
      tvTimer -= dt;
      if (!tvCam || tvTimer <= 0 || tvCam.distanceTo(fr.pos) > 140) { const f = TB.frameAt(track, player.s + 60); const side = Math.random() < 0.5 ? -1 : 1; tvCam = new THREE.Vector3(f.p.x + f.B.x * side * 22, f.p.y + 12 + Math.random() * 10, f.p.z + f.B.z * side * 22); tvTimer = 5; }
      target = tvCam; look = fr.pos.clone(); up = new THREE.Vector3(0, 1, 0);
    }
    const k = camMode === 3 ? 1 : Math.min(1, dt * (camMode === 1 ? 30 : 6));
    camPos.lerp(target, k); camLook.lerp(look, Math.min(1, dt * 12)); camUp.lerp(up, Math.min(1, dt * 5)).normalize();
    if (shake > 0) { shake -= dt * 2; camPos.x += (Math.random() - 0.5) * shake; camPos.y += (Math.random() - 0.5) * shake; }
    camera.position.copy(camPos); camera.up.copy(camUp); camera.lookAt(camLook);
    if (carLight) carLight.position.copy(fr.pos).addScaledVector(fr.up, 3).addScaledVector(fr.fwd, 6);
    // hide own car in cockpit view
    if (player.mesh) player.mesh.visible = camMode !== 1;
  }

  // ---------------- minimap ----------------
  let miniPath, miniScale, miniOff;
  function buildMinimap() {
    const c = $('#minimap'); const S = track.samples;
    let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
    for (const s of S) { minx = Math.min(minx, s.p.x); maxx = Math.max(maxx, s.p.x); minz = Math.min(minz, s.p.z); maxz = Math.max(maxz, s.p.z); }
    const pad = 12, w = c.width - pad * 2, h = c.height - pad * 2;
    miniScale = Math.min(w / (maxx - minx + 1), h / (maxz - minz + 1));
    miniOff = { x: pad + (w - (maxx - minx) * miniScale) / 2 - minx * miniScale, z: pad + (h - (maxz - minz) * miniScale) / 2 - minz * miniScale };
    miniPath = new Path2D();
    S.forEach((s, i) => { const px = c.width - (s.p.x * miniScale + miniOff.x), pz = c.height - (s.p.z * miniScale + miniOff.z); if (i === 0) miniPath.moveTo(px, pz); else miniPath.lineTo(px, pz); });
    miniPath.closePath();
  }
  function drawMinimap() {
    const c = $('#minimap'); const x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    x.lineWidth = 5; x.strokeStyle = '#000'; x.stroke(miniPath);
    x.lineWidth = 2; x.strokeStyle = 'rgba(255,255,255,0.9)'; x.stroke(miniPath);
    const dot = (r, col, rad) => { const f = TB.frameAt(track, r.s); x.beginPath(); x.arc(c.width - (f.p.x * miniScale + miniOff.x), c.height - (f.p.z * miniScale + miniOff.z), rad, 0, Math.PI * 2); x.fillStyle = col; x.fill(); x.strokeStyle = '#000'; x.lineWidth = 1; x.stroke(); };
    for (const r of racers) if (r.isAI) dot(r, '#ffd400', 2.5);
    dot(player, '#ff2a2a', 4);
  }

  // ---------------- HUD ----------------
  function progress(r) { return (r.finished ? 1e6 - r.finishTime : 0) + r.lap * track.length + r.s; }
  function standings() { return racers.slice().sort((a, b) => progress(b) - progress(a)); }
  function updateHUD() {
    $('#speed').textContent = String(Math.round(Math.abs(player.v) * 3.6)).padStart(3, '0');
    $('#hudRunde').textContent = `${player.lap} / ${trackDef.laps}`;
    $('#hudZeit').textContent = fmtTime(raceTime);
    $('#hudBeste').textContent = fmtTime(player.bestLap);
    const pos = standings().indexOf(player) + 1;
    $('#hudPos').textContent = `${pos} / ${racers.length}`;
    $('#hudKn').textContent = knoellchen ? `${knoellchen} × 60 €` : '–';
    if (lastPos !== null && lastPos !== pos && phase === 'race' && raceTime > 3 && msgTimer <= 0) {
      const byTuenn = Math.random() < 0.5; const other = pick(racers.filter((r) => r.isAI)).driver;
      if (pos < lastPos) say(byTuenn ? tuenn : other, byTuenn ? pick(tuenn.overtake) : pick(other.lines.overtaken), 2200);
      else say(byTuenn ? tuenn : other, byTuenn ? pick(tuenn.overtaken) : pick(other.lines.overtake), 2200);
    }
    lastPos = pos;
    const tb = $('#turboBar').children, db = $('#dmgBar').children;
    for (let i = 0; i < tb.length; i++) tb[i].className = (i / tb.length) < player.turbo ? 'on' : '';
    for (let i = 0; i < db.length; i++) db[i].className = (i / db.length) < player.damage ? (i >= 7 ? 'red' : 'on') : '';
    $('#wrongway').hidden = !(player.v < -3);
    $('#cockpit').hidden = camMode !== 1;
    if (camMode === 1) SP.dashboard($('#cockpit'), { steer: player.steerVis, speed: Math.abs(player.v) * 3.6, rpm: Math.min(1, (Math.abs(player.v) % 22) / 22 + 0.15), turbo: player.turbo, damage: player.damage });
  }

  // ---------------- scene build ----------------
  function activeTrackDef() { return sel.track < TRACKS.length ? TRACKS[sel.track] : customTracks[sel.track - TRACKS.length]; }
  function buildScene(def) {
    trackDef = def || activeTrackDef();
    theme = trackDef.theme;
    track = TB.buildTrack(trackDef);
    if (scene) scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.sky);
    scene.fog = new THREE.Fog(theme.fog, theme.night ? 90 : 220, theme.night ? 520 : 1300);
    hemi = new THREE.HemisphereLight(theme.night ? 0x8090c0 : theme.sky, theme.ground, theme.night ? 0.7 : 0.75); scene.add(hemi);
    sunLight = new THREE.DirectionalLight(theme.sun, theme.night ? 0.45 : 0.9); sunLight.position.set(120, 200, 80); scene.add(sunLight);
    if (theme.night) { carLight = new THREE.PointLight(0xfff2cc, 2.0, 90); scene.add(carLight); } else carLight = null;
    road = W.buildRoad(track, theme); scene.add(road);
    scenery = W.buildScenery(track, theme); scene.add(scenery.group);
    confetti = theme.confetti ? W.buildConfetti() : null; if (confetti) scene.add(confetti);
    // field of 8: you + seven of the others
    const me = PLAYABLE[sel.driver]; const carDef = D.CARS[sel.car];
    const diffMul = me.aiMul || 1;
    racers = [];
    player = makeRacer(carDef, W.buildCar(carDef, theme.night), me, false); scene.add(player.mesh); racers.push(player);
    const others = D.DRIVERS.filter((d) => d !== me).slice(0, 7);
    others.forEach((d, i) => {
      const base = D.CARS.find((c) => c.id === d.car) || D.CARS[1];
      const cdef = Object.assign({}, base, { color: d.color, plate: 'K-' + d.name.slice(0, 2).toUpperCase() + ' ' + (i + 1) });
      const r = makeRacer(cdef, W.buildCar(cdef, theme.night), d, true);
      r.skill = clamp(d.skill * diffMul, 0.7, 1.08);
      scene.add(r.mesh); racers.push(r);
    });
    // starting grid: 2 columns, player at the back like in Stunts
    racers.forEach((r, i) => { const row = Math.floor(i / 2); r.s = 6 + (racers.length / 2 - row) * 7; r.lat = (i % 2 ? 1 : -1) * 2.8; r.safeS = r.s; });
    player.s = 6; player.lat = -2.8;
    camPos.set(0, 5, -15); camUp.set(0, 1, 0); camLook.set(0, 0, 10);
    buildMinimap(); lastPos = null;
    blitzers = scenery.props.filter((p) => p.userData.type === 'blitzer').map((p) => ({ s: p.userData.at * track.length, flash: p.userData.flash, cool: 0 }));
    knoellchen = 0; koelsch = 0; radioTimer = 12; eventTimer = 30;
    const idx = TRACKS.indexOf(trackDef);
    $('#hudTrack').textContent = `${idx >= 0 ? idx + 1 + '. ' : ''}${trackDef.name.toUpperCase()} (${(trackDef.tag || 'BAUKASTEN')})`;
  }
  function bestKey() { return `stuntskoelle.best.${trackDef.id}`; }
  function getBest(def) { try { const v = localStorage.getItem(`stuntskoelle.best.${(def || trackDef).id}`); return v ? parseFloat(v) : null; } catch (e) { return null; } }
  function setBest(t) { try { localStorage.setItem(bestKey(), String(t)); } catch (e) { /* ignore */ } }
  function getRecords(def) { try { return JSON.parse(localStorage.getItem(`stuntskoelle.rec.${def.id}`) || '[]'); } catch (e) { return []; } }
  function addRecord(def, entry) { const list = getRecords(def); list.push(entry); list.sort((a, b) => a.time - b.time); try { localStorage.setItem(`stuntskoelle.rec.${def.id}`, JSON.stringify(list.slice(0, 5))); } catch (e) { /* ignore */ } }

  // ---------------- race flow ----------------
  let cdShown = -1;
  function startRace(def) {
    audioInit();
    buildScene(def);
    raceTime = 0; countdown = 4.2; phase = 'countdown';
    musicPlay();
    $('#menu').hidden = true; $('#hud').hidden = false; $('#results').hidden = true; $('#editor').hidden = true; $('#touch').hidden = !isTouch;
    document.body.classList.add('racing');
    say(tuenn, pick(tuenn.intro), 3800);
    setTimeout(() => { if (phase !== 'menu') { const d = pick(racers.filter((r) => r.isAI)).driver; say(d, pick(d.lines.start), 2500); } }, 3900);
    cdShown = -1;
  }
  function finishRace() {
    phase = 'finished';
    // project finishing times for cars still out on the track
    for (const r of racers) if (!r.finished) { const remaining = (trackDef.laps + 1) * track.length - (r.lap * track.length + r.s); r.finishTime = raceTime + remaining / Math.max(25, Math.abs(r.v) + 20); r.projected = true; }
    const order = racers.slice().sort((a, b) => a.finishTime - b.finishTime);
    const place = order.indexOf(player) + 1;
    const won = place === 1;
    const best = getBest(); const record = best == null || player.finishTime < best;
    if (record) setBest(player.finishTime);
    addRecord(trackDef, { name: PLAYABLE[sel.driver].name + ' (DU)', car: D.CARS[sel.car].name, time: player.finishTime, date: Date.now() });
    fanfare(won);
    setTimeout(() => {
      $('#resTitle').textContent = won ? 'JEWONNE! KÖLLE ALAAF!' : place === 2 ? 'ZWEITER. FAST, JUNG.' : `PLATZ ${place}. ET HÄTZ SCHLECHT, ÄVVER ET KÜTT!`;
      const tb = $('#resTable'); tb.innerHTML = '';
      order.forEach((r, i) => { const tr = document.createElement('tr'); if (r === player) tr.className = 'me'; tr.innerHTML = `<td>${i + 1}.</td><td>${r.name}</td><td>${r.car.name}</td><td>${fmtTime(r.finishTime)}${r.projected ? '*' : ''}</td>`; tb.appendChild(tr); });
      $('#resBest').textContent = fmtTime(player.bestLap);
      $('#resStats').innerHTML = `KNÖLLCHEN: <b>${knoellchen}</b> (${knoellchen * 60} €, Klüngel Tom regelt dat) · KÖLSCH UNTERWEGS: <b>${koelsch}</b> · SCHADEN: <b>${Math.round(player.damage * 100)} %</b> · ${knoellchen > 2 ? 'Führerschein: uff Deckel.' : knoellchen ? 'Führerschein: noch da.' : 'Kein Blitzer erwischt. Verdächtig.'}`;
      $('#resRecord').hidden = !record;
      $('#resTuenn').textContent = record ? pick(tuenn.record) : won ? pick(tuenn.win) : pick(tuenn.lose);
      const rd = order[won ? 1 : 0].driver;
      $('#resRival').textContent = `${rd.name}: „${pick(won ? rd.lines.lose : rd.lines.win)}“`;
      $('#results').hidden = false;
    }, 1200);
  }
  function toMenu() {
    phase = 'menu';
    $('#menu').hidden = false; $('#hud').hidden = true; $('#results').hidden = true; $('#editor').hidden = true; $('#touch').hidden = true; $('#records').hidden = true;
    document.body.classList.remove('racing');
    $('#msg').classList.remove('show');
    audioEngine(0, 0); musicStop();
    if (player && player.mesh) player.mesh.visible = true;
    renderMenu();
  }

  // ---------------- main loop ----------------
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
    renderer.info.reset();
    if (!scene) return;
    if (phase === 'countdown') {
      countdown -= dt;
      const idx = 3 - Math.ceil(countdown - 0.2); const cd = $('#countdown');
      if (countdown <= 0.2) { cd.textContent = tuenn.countdown[3]; if (cdShown !== 3) { beep(880, 0.5, 'square', 0.2); cdShown = 3; } }
      else if (idx >= 0 && idx < 3) { cd.textContent = tuenn.countdown[idx]; if (cdShown !== idx) { beep(440, 0.15); cdShown = idx; } }
      cd.hidden = false;
      if (countdown <= 0) { phase = 'race'; setTimeout(() => { cd.hidden = true; }, 700); }
      for (const r of racers) placeRacer(r, dt);
      updateHUD();
    } else if (phase === 'race' || phase === 'finished') {
      if (phase === 'race') raceTime += dt;
      const ctl = player.finished ? { gas: 0, brake: 0.5, steer: 0, turbo: 0 } : window.STUNTS_AUTOPILOT ? aiControl(player, dt) : input;
      updateRacer(player, dt, ctl);
      for (const r of racers) if (r.isAI) updateRacer(r, dt, r.finished ? { gas: 0, brake: 0.3, steer: 0, turbo: 0 } : aiControl(r, dt));
      for (let i = 0; i < racers.length; i++) for (let j = i + 1; j < racers.length; j++) collide(racers[i], racers[j]);
      for (const r of racers) placeRacer(r, dt);
      if (phase === 'race') {
        radioTimer -= dt; eventTimer -= dt;
        if (radioTimer <= 0 && msgTimer <= 0) { radioTimer = 18 + Math.random() * 14; say({ name: 'Radio Kölle', emoji: '📻' }, pick(tuenn.radio).replace('RADIO KÖLLE: ', ''), 3500); }
        if (eventTimer <= 0 && msgTimer <= 0) { eventTimer = 35 + Math.random() * 25; const ev = pick(tuenn.events); say(tuenn, ev, 3000); if (ev.includes('Kölsch')) { koelsch++; player.turbo = Math.min(1, player.turbo + 0.35); } }
        for (const b of blitzers) {
          b.cool -= dt; if (b.flash) b.flash.material.opacity = Math.max(0, b.flash.material.opacity - dt * 3);
          let ds = player.s - b.s; if (ds > track.length / 2) ds -= track.length;
          if (ds > 0 && ds < 4 && b.cool <= 0) { b.cool = 8; if (Math.abs(player.v) * 3.6 > 120 && !player.air) { knoellchen++; if (b.flash) b.flash.material.opacity = 1; flashTimer = 0.25; beep(1400, 0.12, 'square', 0.12); say({ name: 'Blitzer Kölle', emoji: '📸' }, pick(tuenn.blitzer), 2600); } }
        }
        if (flashTimer > 0) { flashTimer -= dt; $('#flash').style.opacity = String(Math.max(0, flashTimer * 3)); }
      }
      if (player.finished && phase === 'race') finishRace();
      if (phase === 'race') updateHUD();
      drawMinimap();
      audioEngine(Math.abs(player.v), ctl.gas, player.turboOn);
    } else if (phase === 'menu' || phase === 'editor') {
      // idle drive-by behind the menu
      if (player) { player.s = (player.s + dt * 30) % track.length; placeRacer(player, dt); racers.forEach((r, i) => { if (r.isAI) { r.s = (player.s + 8 + i * 7) % track.length; placeRacer(r, dt); } }); }
    }
    if (scenery) W.animate(t, dt, camPos);
    if (confetti && player && player.frame) confetti.userData.update(dt, player.frame.pos);
    if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) $('#msg').classList.remove('show'); }
    updateCamera(dt);
    if (post) post.render(scene, camera); else renderer.render(scene, camera);
  }

  // ---------------- input ----------------
  const isTouch = ('ontouchstart' in window) && matchMedia('(pointer: coarse)').matches;
  const isMobile = isTouch || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const touch = { left: false, right: false, gas: false, brake: false, turbo: false };
  function readKeys() {
    const left = keys.ArrowLeft || keys.KeyA, right = keys.ArrowRight || keys.KeyD;
    input.steer = (left ? -1 : 0) + (right ? 1 : 0);
    input.gas = (keys.ArrowUp || keys.KeyW) ? 1 : 0;
    input.brake = (keys.ArrowDown || keys.KeyS || keys.Space) ? 1 : 0;
    input.turbo = (keys.ShiftLeft || keys.ShiftRight || keys.KeyN || keys.KeyX) ? 1 : 0;
    if (touch.left) input.steer -= 1; if (touch.right) input.steer += 1; if (touch.gas) input.gas = 1; if (touch.brake) input.brake = 1; if (touch.turbo) input.turbo = 1;
    input.steer = clamp(input.steer, -1, 1);
  }
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys[e.code] = true; readKeys();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) && phase !== 'menu' && phase !== 'editor') e.preventDefault();
    if (phase === 'menu') {
      if (e.code === 'Enter') startRace();
      if (e.code === 'KeyP') cyclePixel();
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { sel.car = (sel.car + (e.code === 'ArrowRight' ? 1 : -1) + D.CARS.length) % D.CARS.length; renderMenu(); }
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') { const n = TRACKS.length + customTracks.length; sel.track = (sel.track + (e.code === 'ArrowDown' ? 1 : -1) + n) % n; onTrackChange(); }
      if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3' || e.code === 'Digit4') { sel.driver = parseInt(e.code.slice(-1)) - 1; renderMenu(); }
      return;
    }
    if (phase === 'editor') { if (e.code === 'Escape') toMenu(); if (e.code === 'Delete' || e.code === 'Backspace') edUndo(); if (e.code === 'KeyS') edSave(); if (e.code === 'KeyL') edLoad(); return; }
    if (e.code === 'KeyC') { camMode = (camMode + 1) % 4; tvCam = null; }
    if (e.code === 'KeyP') cyclePixel();
    if (e.code === 'KeyM') toggleMute();
    if (e.code === 'KeyR' && phase === 'race' && player.crashed <= 0) { crash(player, 'off'); player.crashed = 0.6; }
    if (e.code === 'Escape') toMenu();
    if (e.code === 'Enter' && phase === 'finished') startRace();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; readKeys(); });
  for (const [id, key] of [['tLeft', 'left'], ['tRight', 'right'], ['tGas', 'gas'], ['tBrake', 'brake'], ['tNitro', 'turbo']]) {
    const el = document.getElementById(id);
    const on = (e) => { e.preventDefault(); touch[key] = true; readKeys(); };
    const off = (e) => { e.preventDefault(); touch[key] = false; readKeys(); };
    el.addEventListener('touchstart', on, { passive: false }); el.addEventListener('touchend', off); el.addEventListener('touchcancel', off);
    el.addEventListener('mousedown', on); el.addEventListener('mouseup', off); el.addEventListener('mouseleave', off);
  }

  // ---------------- menu ----------------
  const outlineCache = {};
  function trackOutline(def, canvas, w, h) {
    if (!outlineCache[def.id + def.segments.length]) outlineCache[def.id + def.segments.length] = TB.buildTrack(def);
    const tr = outlineCache[def.id + def.segments.length];
    SP.outline(tr.samples, canvas, w, h, '#f4f4f4');
    return tr;
  }
  function renderMenu() {
    // drivers
    const dl = $('#driverCards'); dl.innerHTML = '';
    PLAYABLE.forEach((d, i) => {
      const card = document.createElement('div'); card.className = 'card driver' + (sel.driver === i ? ' active' : '');
      card.innerHTML = `<span class="p1">${sel.driver === i ? 'P1' : ''}</span><canvas></canvas><b>${d.name.toUpperCase()}</b><small>${d.quote}</small><i class="diff d${d.diffN}">${d.diff}</i>`;
      SP.portrait(d.id, card.querySelector('canvas'), 5);
      card.onclick = () => { sel.driver = i; renderMenu(); };
      dl.appendChild(card);
    });
    // cars
    const cl = $('#carCards'); cl.innerHTML = '';
    D.CARS.forEach((c, i) => {
      const card = document.createElement('div'); card.className = 'card car' + (sel.car === i ? ' active' : '');
      const stat = (label, v) => `<div class="stat"><span>${label}</span><i>${[1, 2, 3, 4, 5].map((k) => `<b class="${k <= v ? (k >= 5 ? 'hi' : 'on') : ''}"></b>`).join('')}</i></div>`;
      card.innerHTML = `<span class="p1">${sel.car === i ? 'P1' : ''}</span><canvas></canvas><b>${c.name.toUpperCase()}</b>${stat('TEMPO', c.stats[0])}${stat('BESCHL.', c.stats[1])}${stat('HANDLING', c.stats[2])}${stat('NITRO', c.stats[3])}`;
      SP.carSide(c, card.querySelector('canvas'), 4);
      card.onclick = () => { sel.car = i; renderMenu(); };
      cl.appendChild(card);
    });
    // tracks
    const tl = $('#trackList'); tl.innerHTML = '';
    const all = TRACKS.concat(customTracks);
    all.forEach((t, i) => {
      const row = document.createElement('div'); row.className = 'trackRow' + (sel.track === i ? ' active' : '');
      const pips = [1, 2, 3, 4, 5].map((k) => `<b class="${k <= (t.diff || 1) ? 'on' : ''}"></b>`).join('');
      const best = getBest(t);
      row.innerHTML = `<span class="p1">${sel.track === i ? 'P1' : i + 1}</span><canvas class="thumb"></canvas><div class="info"><b>${t.name.toUpperCase()}</b><span class="sub">${(t.district || 'Klüngel-Baukasten').toUpperCase()}</span><span class="wp">${(t.waypoints || ['Eigene Streck']).join(' – ').toUpperCase()}</span><span class="pips">${pips}</span></div><div class="map"><canvas class="outline"></canvas><span class="km"></span>${best ? `<span class="best">${fmtTime(best)}</span>` : ''}</div>`;
      SP.thumb(t, row.querySelector('.thumb'), 192, 72);
      const tr = trackOutline(t, row.querySelector('.outline'), 110, 62);
      row.querySelector('.km').textContent = (tr.length * t.laps / 1000).toFixed(1) + ' KM';
      row.onclick = () => { sel.track = i; onTrackChange(); };
      tl.appendChild(row);
    });
    const t = all[sel.track] || TRACKS[0];
    $('#trackDesc').textContent = t.desc || 'Eigene Streck aus dem Klüngel-Baukasten.';
    $('#langerQuote').textContent = '„' + pick(tuenn.intro) + '“';
    $('#slogan').textContent = pick(tuenn.slogans);
    $('#tipp').textContent = pick(tuenn.tips);
    try { localStorage.setItem('stuntskoelle.sel', JSON.stringify(sel)); } catch (e) { /* ignore */ }
  }
  let builtTrackId = null;
  function onTrackChange() { renderMenu(); const def = activeTrackDef(); if (phase === 'menu' && builtTrackId !== def.id) { builtTrackId = def.id; buildScene(def); } }

  // ---------------- records ----------------
  function showRecords() {
    const box = $('#recordsList'); box.innerHTML = '';
    TRACKS.forEach((t, i) => {
      const recs = getRecords(t);
      const div = document.createElement('div'); div.className = 'recTrack';
      div.innerHTML = `<b>${i + 1}. ${t.name.toUpperCase()}</b>` + (recs.length ? '<ol>' + recs.map((r) => `<li><span>${r.name}</span><span>${r.car}</span><span>${fmtTime(r.time)}</span></li>`).join('') + '</ol>' : '<p>Noch keine Zeit. Der Lange T. wartet.</p>');
      box.appendChild(div);
    });
    $('#records').hidden = false;
  }

  // ---------------- Klüngel-Baukasten (track editor) ----------------
  const PIECES = [
    { id: 'straight', label: 'GERADE', seg: { t: 'straight', len: 60 } },
    { id: 'lcurve', label: 'KURVE L', seg: { t: 'curve', angle: 90, r: 35 } },
    { id: 'rcurve', label: 'KURVE R', seg: { t: 'curve', angle: -90, r: 35 } },
    { id: 'lbank', label: 'STEIL L', seg: { t: 'curve', angle: 90, r: 45, bank: 15 } },
    { id: 'rbank', label: 'STEIL R', seg: { t: 'curve', angle: -90, r: 45, bank: 15 } },
    { id: 'hill', label: 'HÜGEL', seg: { t: 'hill', len: 60, pitch: 14 } },
    { id: 'dip', label: 'SENKE', seg: { t: 'dip', len: 40, pitch: 12 } },
    { id: 'loop', label: 'LOOPING', seg: { t: 'loop', r: 14, shift: 14 } },
    { id: 'jump', label: 'SPRUNG', seg: { t: 'jump', ramp: 28, angle: 15, gap: 28 } },
    { id: 'bridge', label: 'BRÜCKE', seg: { t: 'bridge', len: 120 } },
    { id: 'tunnel', label: 'TUNNEL', seg: { t: 'tunnel', len: 60 } }
  ];
  const ed = { pieces: [], base: 4 };
  function edDef() {
    const base = TRACKS[ed.base];
    const segs = ed.pieces.map((p) => Object.assign({}, PIECES.find((q) => q.id === p).seg));
    return { id: 'custom-' + ($('#edName').value || 'streck').toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: $('#edName').value || 'Ming Streck', district: 'Klüngel-Baukasten', tag: 'BAUKASTEN', laps: 3, diff: Math.min(5, 1 + Math.floor(segs.length / 5)), scale: 1,
      theme: base.theme, segments: segs, waypoints: ['Eigene Streck'], desc: 'Aus dem Klüngel-Baukasten: ' + segs.length + ' Teile.',
      props: [{ type: 'tuenn', seg: 0, u: 0.05, side: 1, dist: 9 }, { type: 'crowd', seg: 0, u: 0.1, side: -1, dist: 10 }] };
  }
  function edHeading() { let a = 0; for (const p of ed.pieces) { const s = PIECES.find((q) => q.id === p).seg; if (s.t === 'curve') a += s.angle; } return ((a % 360) + 360) % 360; }
  function edRender() {
    const list = $('#edSeq'); list.innerHTML = '';
    ed.pieces.forEach((p, i) => { const b = document.createElement('span'); b.textContent = PIECES.find((q) => q.id === p).label; b.title = 'Klick: entfernen'; b.onclick = () => { ed.pieces.splice(i, 1); edRender(); }; list.appendChild(b); });
    $('#edCount').textContent = `TEILE: ${ed.pieces.length} / 40`;
    const heading = edHeading(); const ok = ed.pieces.length >= 4 && heading === 0 && ed.pieces.some((p) => p === 'straight' || p === 'bridge' || p === 'tunnel');
    $('#edWarn').textContent = ed.pieces.length < 4 ? 'Mindestens 4 Teile, Jung.' : heading !== 0 ? `Streck jeht nit zo: noch ${360 - heading}° Kurve links (oder ${heading}° rechts) fehlen.` : !ed.pieces.some((p) => p === 'straight' || p === 'bridge' || p === 'tunnel') ? 'Mindestens eine Gerade, sonst kann der Klüngel nix schließen.' : 'Streck is zo. Fott domet!';
    $('#edWarn').className = ok ? 'ok' : 'bad';
    $('#edDrive').disabled = !ok; $('#edSave').disabled = !ok;
    const cv = $('#edPreview');
    if (ed.pieces.length >= 2) { try { const tr = TB.buildTrack(edDef()); SP.outline(tr.samples, cv, cv.clientWidth || 420, cv.clientHeight || 260, ok ? '#7fff00' : '#ff7b7b'); $('#edLen').textContent = (tr.length / 1000).toFixed(2) + ' KM'; } catch (e) { /* ignore */ } }
    else { cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); $('#edLen').textContent = ''; }
  }
  function edUndo() { ed.pieces.pop(); edRender(); }
  function edSave() {
    const def = edDef(); if ($('#edDrive').disabled) return;
    customTracks = customTracks.filter((t) => t.id !== def.id); customTracks.push(def);
    try { localStorage.setItem('stuntskoelle.custom', JSON.stringify(customTracks)); } catch (e) { /* ignore */ }
    $('#edWarn').textContent = 'Jespeichert: ' + def.name + '. Steht jetz in der Streckenliste.';
  }
  function edLoad() {
    const t = customTracks[customTracks.length - 1]; if (!t) { $('#edWarn').textContent = 'Nix jespeichert.'; return; }
    ed.pieces = t.segments.map((s) => (PIECES.find((p) => p.seg.t === s.t && (p.seg.angle == null || Math.sign(p.seg.angle) === Math.sign(s.angle)) && (!!p.seg.bank === !!s.bank)) || PIECES[0]).id);
    $('#edName').value = t.name; edRender();
  }
  function openEditor() {
    phase = 'editor';
    $('#menu').hidden = true; $('#editor').hidden = false; $('#records').hidden = true;
    const pal = $('#edPalette'); pal.innerHTML = '';
    PIECES.forEach((p) => { const b = document.createElement('button'); b.textContent = p.label; b.onclick = () => { if (ed.pieces.length < 40) { ed.pieces.push(p.id); edRender(); } }; pal.appendChild(b); });
    const sc = $('#edScenery'); sc.innerHTML = ''; TRACKS.forEach((t, i) => { const o = document.createElement('option'); o.value = i; o.textContent = t.name; sc.appendChild(o); }); sc.value = ed.base;
    sc.onchange = () => { ed.base = parseInt(sc.value); };
    if (!ed.pieces.length) ed.pieces = ['straight', 'lcurve', 'straight', 'loop', 'lcurve', 'straight', 'jump', 'lcurve', 'straight', 'lcurve'];
    edRender();
  }

  // ---------------- init ----------------
  function cyclePixel() {
    pixelScale = pixelScale >= 4 ? 1 : pixelScale + 1;
    post.setScale(pixelScale);
    try { localStorage.setItem('stuntskoelle.pixel', String(pixelScale)); } catch (e) { /* ignore */ }
    $('#pixBtn').textContent = pixelScale === 1 ? '▪' : pixelScale === 2 ? '▪▪' : pixelScale === 3 ? '▪▪▪' : '▪▪▪▪';
  }
  function init() {
    try { const s = JSON.parse(localStorage.getItem('stuntskoelle.sel')); if (s) Object.assign(sel, s); } catch (e) { /* ignore */ }
    try { customTracks = JSON.parse(localStorage.getItem('stuntskoelle.custom') || '[]'); } catch (e) { customTracks = []; }
    sel.track = clamp(sel.track | 0, 0, TRACKS.length + customTracks.length - 1); sel.car = clamp(sel.car | 0, 0, D.CARS.length - 1); sel.driver = clamp(sel.driver | 0, 0, PLAYABLE.length - 1);
    renderer = new THREE.WebGLRenderer({ antialias: false, canvas: $('#gl') });
    renderer.setPixelRatio(1); renderer.info.autoReset = false;
    renderer.setSize(window.innerWidth, window.innerHeight);
    try { pixelScale = clamp(parseInt(localStorage.getItem('stuntskoelle.pixel')) || 3, 1, 5); } catch (e) { /* ignore */ }
    post = new window.Pixel.PixelPost(renderer, pixelScale);
    camera = new THREE.PerspectiveCamera(isMobile ? 76 : 70, window.innerWidth / window.innerHeight, 1.0, isMobile ? 2600 : 4000);
    if (isMobile) document.body.classList.add('mobile');
    window.addEventListener('resize', () => { renderer.setSize(window.innerWidth, window.innerHeight); post.setSize(window.innerWidth, window.innerHeight); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); drawBanner(); });
    // banner art
    drawBanner();
    // turbo/damage bar segments
    for (const id of ['turboBar', 'dmgBar']) { const el = document.getElementById(id); for (let i = 0; i < 10; i++) el.appendChild(document.createElement('i')); }
    renderMenu();
    $('#startBtn').onclick = () => startRace();
    $('#againBtn').onclick = () => startRace();
    $('#menuBtn').onclick = toMenu;
    $('#camBtn').onclick = () => { camMode = (camMode + 1) % 4; tvCam = null; };
    $('#muteBtn').onclick = toggleMute;
    $('#escBtn').onclick = toMenu;
    $('#pixBtn').onclick = cyclePixel;
    $('#editorBtn').onclick = openEditor;
    $('#recordsBtn').onclick = showRecords;
    $('#recordsClose').onclick = () => { $('#records').hidden = true; };
    $('#edDrive').onclick = () => { const def = edDef(); startRace(def); };
    $('#edSave').onclick = edSave; $('#edLoad').onclick = edLoad; $('#edUndo').onclick = edUndo;
    $('#edClear').onclick = () => { ed.pieces = []; edRender(); };
    $('#edBack').onclick = toMenu;
    musicInit();
    document.addEventListener('touchstart', () => { if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume(); if (phase !== 'menu' && music.wanted && music.el && music.el.paused && !music.muted) musicPlay(); }, { passive: true });
    buildScene(); builtTrackId = trackDef.id; phase = 'menu';
    requestAnimationFrame(frame);
  }
  function drawBanner() {
    SP.logo($('#logo'), 560, 140);
    SP.skyline($('#skyline'), Math.max(600, window.innerWidth), 150);
    SP.portrait('langer', $('#langerFace'), 5);
    SP.portrait('langer', $('#langerFace2'), 4);
    SP.portrait('langer', $('#resFace'), 5);
  }
  window.STUNTS_STATS = () => renderer && { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries };
  window.STUNTS_PROPS = () => scenery ? scenery.props.map((p) => ({ type: p.userData.type, x: p.position.x, y: p.position.y, z: p.position.z, rot: p.rotation.y })) : [];
  window.STUNTS_DEBUG = () => ({ phase, player: player && { s: player.s, lat: player.lat, v: player.v, lap: player.lap, air: player.air, crashed: player.crashed, finished: player.finished, turbo: player.turbo, damage: player.damage }, racers: racers.length, raceTime, trackLen: track && track.length, standings: racers.length ? standings().map((r) => r.name) : [] });
  window.STUNTS_SET_CAM = (m) => { camMode = m; };
  window.STUNTS_NEAR = (r) => { const out = []; const pp = player.frame.pos; scene.traverse((o) => { if (!o.isMesh) return; const wp = new THREE.Vector3(); o.getWorldPosition(wp); if (wp.distanceTo(pp) < r) { const m = Array.isArray(o.material) ? o.material[0] : o.material; out.push({ d: Math.round(wp.distanceTo(pp)), col: m.color ? m.color.getHexString() : '-', parent: o.parent && o.parent.userData && o.parent.userData.type, vc: !!m.vertexColors, n: o.geometry.attributes.position.count }); } }); return out.slice(0, 40); };
  window.STUNTS_FINISH = () => { if (player) { player.lap = trackDef.laps; player.s = track.length - 3; player.v = 30; } };
  if (typeof THREE === 'undefined') {
    document.body.innerHTML = '<div style="color:#fff;font:20px sans-serif;padding:40px">Three.js konnte nicht geladen werden. Der Lange T. sagt: Internet anmachen, Jung.</div>';
  } else {
    init();
  }
})();
