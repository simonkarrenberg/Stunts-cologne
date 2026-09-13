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
  let renderer, scene, camera, track, trackDef, theme, road, scenery, confetti, sunLight, hemi, carLight, post, pixelScale = 3, pmrem = null, envTex = null;
  let racers = [], player = null, raceTime = 0, countdown = 0, phase = 'menu'; // menu | countdown | race | finished | editor
  let camMode = 0, camPos = new THREE.Vector3(), camUp = new THREE.Vector3(0, 1, 0), camLook = new THREE.Vector3();
  let lastT = 0, msgTimer = 0, tvCam = null, tvTimer = 0, shake = 0, lastPos = null;
  let radioTimer = 40, eventTimer = 30, blitzers = [], knoellchen = 0, koelsch = 0, flashTimer = 0;
  let stories = [], telefon = { ready: true, active: 0, used: 0 };
  let player2 = null, twoPlayer = false, camera2 = null;
  // Chicago am Rhein extras: beer-mat score, Kölsch pickups, the Kripo chase, the doorman's bet, the Kölsch-Cup
  let deckel = 0, pickups = [], kripo = null, kripoT = 0, kripoHitCool = 0, sirenT = 0, wette = null, crashes = 0, waterCrashes = 0, kripoCaught = false, kripoSeen = false, lastLapSeen = 1, pickT = 0;
  const cup = { on: false, i: 0, pts: {} }; const CUP_PTS = [10, 8, 6, 5, 4, 3, 2, 1];
  const KRIPO = { name: 'Kripo Kölle', emoji: '🚓' };
  let razzia = 0, razziaBlink = 0, promille = 0, koelschLap = 0, lastHeadline = '', lastPlace = 0;
  const views = [{ pos: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), look: new THREE.Vector3(), mode: 0, tv: null, tvTimer: 0 }, { pos: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), look: new THREE.Vector3(), mode: 0, tv: null, tvTimer: 0 }];
  const input2 = { gas: 0, brake: 0, steer: 0, turbo: 0 };
  const rec = { frames: [], t: [], acc: 0, on: false };          // replay recorder
  const replay = { on: false, time: 0, speed: 1, paused: false, camIdx: -1, cams: [], mode: 0 };
  let ghost = null, ghostData = null;                              // best-lap ghost
  const voice = { on: true, ready: false, de: null };
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

  // ---------------- voice: dä Lange & co. speak (Web Speech API) ----------------
  function voiceInit() {
    if (!('speechSynthesis' in window)) { voice.on = false; return; }
    const pickVoice = () => { const vs = speechSynthesis.getVoices(); voice.de = vs.find((v) => /de[-_]DE/i.test(v.lang) && /Google|Anna|Markus|Petra|Helena|Yannick/i.test(v.name)) || vs.find((v) => /^de/i.test(v.lang)) || null; voice.ready = true; };
    pickVoice(); speechSynthesis.addEventListener('voiceschanged', pickVoice);
    try { voice.on = localStorage.getItem('stuntskoelle.voice') !== 'off'; } catch (e) { /* ignore */ }
    updateVoiceUI();
  }
  function updateVoiceUI() { const b = $('#voiceBtn'); if (b) b.textContent = ('speechSynthesis' in window) ? (voice.on ? '🗣 STIMME: AN' : '🗣 STIMME: AUS') : '🗣 STIMME: –'; }
  function toggleVoice() { voice.on = !voice.on; try { localStorage.setItem('stuntskoelle.voice', voice.on ? 'on' : 'off'); } catch (e) { /* ignore */ } updateVoiceUI(); if (voice.on) speak('Ich bin dä Lange. Jetz hörs du mich och.', 0.55, 0.95, true); else if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  function speak(text, pitch, rate, force) {
    if (!voice.on || !voice.ready || audio.muted) return;
    try {
      if (speechSynthesis.speaking && !force) return;
      if (force) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[„“…]/g, '').replace(/–/g, ','));
      u.lang = 'de-DE'; if (voice.de) u.voice = voice.de; u.pitch = pitch == null ? 0.6 : pitch; u.rate = rate == null ? 0.95 : rate; u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }
  const VOICES = { 'Dä Lange': [0.55, 0.92], 'Kripo Kölle': [0.7, 0.98], 'Radio Kölle': [1.1, 1.15], 'Blitzer Kölle': [0.9, 1.05], 'Tünnes': [0.8, 1.05], 'Schäl': [0.7, 1.0], 'Heinzel': [1.5, 1.15], 'Fräulein Anna': [1.4, 1.05], 'Klüngel Tom': [0.75, 0.9], 'Taxi Willi': [0.85, 1.0], 'Köbes Hermann': [0.65, 0.95] };

  // ---------------- messages ----------------
  function say(who, text, ms) {
    if (phase === 'race' || phase === 'countdown' || phase === 'finished') { const v = VOICES[who.name] || [0.8, 1]; speak(text, v[0], v[1], who === tuenn); }
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
    if (r === player) { crashes++; if (kind === 'water') waterCrashes++; }
    r.crashed = 2.2; r.v = 0; r.air = false; r.turboOn = false;
    r.damage = Math.min(1, r.damage + 0.25);
    if (!r.isAI) {
      crashSound(); shake = 1;
      const quotes = kind === 'water' ? tuenn.water : kind === 'loop' ? tuenn.loopFall : tuenn.crash;
      if (r.damage >= 1) { say(tuenn, pick(tuenn.damage), 3000); r.damage = 0; r.crashed = 3.5; }
      else say(tuenn, pick(quotes), 3000);
      if (Math.random() < 0.6) setTimeout(() => { if (phase === 'race') { const d = pick(racers.filter((x) => x.isAI)).driver; if (d.lines.taunt) say(d, pick(d.lines.taunt), 2400); } }, 3200);
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
      const steerV = (ctl.steer + (r === player && promille > 0 ? Math.sin(raceTime * 4.5) * 0.45 : 0)) * car.steer * (2.5 + 0.16 * Math.abs(r.v));
      r.lat += (steerV + centrifugal) * dt;
      if (Math.abs(r.lat) > ROAD_W + 1.6) {
        if (r.isAI) { r.lat = clamp(r.lat, -ROAD_W, ROAD_W); r.v *= 0.6; }
        else { crash(r, 'off'); return; }
      }
      if (f.kind === 'loop') { r.wasInLoop = true; if (f.N.y < 0.2 && r.v < 21) { crash(r, 'loop'); return; } }
      else if (r.wasInLoop) { r.wasInLoop = false; if (!r.isAI) say(tuenn, pick(tuenn.loopOk), 2500); if (r === player) addDeckel(1); }
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
      const f2 = TB.frameAt(track, r.s);
      const landing = f2.kind !== 'gap' && f2.kind !== 'ramp';
      r.y += r.vy * dt; r.vy -= G * (landing ? 2.6 : 1) * dt;
      const ry = f2.p.y;
      if (f2.kind === 'gap') { if (r.y < W.WATER_Y + 0.4) { crash(r, 'water'); return; } }
      else if (r.y <= ry + 0.12) {
        r.air = false; r.y = ry; r.prevRoadVy = r.v * f2.T.y;
        if (Math.abs(r.lat) > ROAD_W + 1.6) { if (r.isAI) r.lat = clamp(r.lat, -ROAD_W, ROAD_W); else { crash(r, 'off'); return; } }
        if (r.vy < -22) { r.v *= 0.55; r.damage = Math.min(1, r.damage + 0.08); } else if (r.vy < -14) r.v *= 0.8;
        if (!r.isAI && r.s - r.jumpStartS > 20 && r.jumpStartS > 0) { say(tuenn, pick(tuenn.jumpOk), 2500); r.jumpStartS = 0; if (r === player) addDeckel(1); }
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
      else if (!r.isAI) { say(tuenn, tuenn.lap[Math.min(tuenn.lap.length - 1, r.lap - 2 + (r.lap === trackDef.laps ? 1 : 0))], 2500); if (r === player) { telefon.ready = true; $('#hudTel').textContent = 'K = ANRUFEN'; } }
    }
    r.steerVis += (ctl.steer - r.steerVis) * Math.min(1, dt * 10);
  }

  function aiControl(r, dt) {
    r.aiTimer -= dt;
    if (r.aiTimer <= 0) { r.aiTimer = 4 + Math.random() * 8; r.aiSlow = Math.random() < r.wobble * 0.6 ? 0.55 + Math.random() * 0.3 : 1; r.laneBias = (Math.random() - 0.5) * 6; }
    const i = Math.floor(((r.s % track.length) + track.length) % track.length / track.ds) % track.samples.length;
    let band = 1;
    if (r.isAI && player && !player.finished && phase === 'race') { const L = track.length; const gap = (r.s + r.lap * L) - (player.s + player.lap * L); const k = [0.22, 0.14, 0.07, 0.025][PLAYABLE[sel.driver].diffN || 0]; band = clamp(1 - gap / 300 * k, 1 - k * 0.9, 1 + k * 0.5); }
    const target = Math.min(r.car.top * r.skill * 1.05, track.safe[i] * (0.9 + r.skill * 0.2)) * (r.aiSlow < 1 ? r.aiSlow : 1) * (telefon.active > 0 && r !== player2 ? 0.7 : 1) * (razzia > 0 && r !== player2 ? 0.62 : 1) * band;
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
    if (window.Cars) window.Cars.animate(r.mesh, r.v, dt, r.steerVis);
    if (r.crashed > 0) { r.mesh.rotation.z += dt * 6; r.mesh.position.y += Math.sin(r.crashed * 9) * 0.5 + 0.5; }
    r.frame = { pos, T, N, B, fwd, up };
  }

  // ---------------- camera (one per view) ----------------
  function updateCameraFor(view, r, dt, mode, cam) {
    cam = cam || camera;
    const fr = r && r.frame; if (!fr) return;
    let target, look, up; const N = fr.N, T = fr.T;
    if (mode === 0 || mode === 2) {
      const dist = mode === 0 ? 11 : 20, h = mode === 0 ? 4.2 : 8;
      target = fr.pos.clone().addScaledVector(T, -dist).addScaledVector(N, h);
      look = fr.pos.clone().addScaledVector(T, 6).addScaledVector(N, 1); up = N;
    } else if (mode === 1) {
      target = fr.pos.clone().addScaledVector(T, -0.2).addScaledVector(N, 1.45);
      look = fr.pos.clone().addScaledVector(T, 30).addScaledVector(N, 1.0); up = N;
    } else {
      view.tvTimer -= dt;
      if (!view.tv || view.tvTimer <= 0 || view.tv.distanceTo(fr.pos) > 140) { const f = TB.frameAt(track, r.s + 60); const side = Math.random() < 0.5 ? -1 : 1; view.tv = new THREE.Vector3(f.p.x + f.B.x * side * 22, f.p.y + 12 + Math.random() * 10, f.p.z + f.B.z * side * 22); view.tvTimer = 5; }
      target = view.tv; look = fr.pos.clone(); up = new THREE.Vector3(0, 1, 0);
    }
    const k = mode === 3 ? 1 : Math.min(1, dt * (mode === 1 ? 30 : 6));
    view.pos.lerp(target, k); view.look.lerp(look, Math.min(1, dt * 12)); view.up.lerp(up, Math.min(1, dt * 5)).normalize();
    if (shake > 0 && r === player) { shake -= dt * 2; view.pos.x += (Math.random() - 0.5) * shake; view.pos.y += (Math.random() - 0.5) * shake; }
    cam.position.copy(view.pos); cam.up.copy(view.up); cam.lookAt(view.look);
    if (cam.fov !== (isMobile ? 76 : 70)) { cam.fov = isMobile ? 76 : 70; cam.updateProjectionMatrix(); }
  }
  function updateCamera(dt) {
    if (window.STUNTS_FREECAM) { const fc = window.STUNTS_FREECAM; camera.position.set(fc.pos[0], fc.pos[1], fc.pos[2]); camera.up.set(0, 1, 0); camera.lookAt(fc.look[0], fc.look[1], fc.look[2]); return; }
    if (!player || !player.frame) return;
    if (phase === 'replay') { replayCamera(views[0], player, dt); }
    else {
      updateCameraFor(views[0], player, dt, camMode, camera);
      if (player2 && camera2) updateCameraFor(views[1], player2, dt, views[1].mode, camera2);
    }
    const fr = player.frame;
    if (carLight) carLight.position.copy(fr.pos).addScaledVector(fr.up, 3).addScaledVector(fr.fwd, 6);
    if (sunLight && sunLight.castShadow) { sunLight.position.set(fr.pos.x + 120, fr.pos.y + 200, fr.pos.z + 80); sunLight.target.position.copy(fr.pos); sunLight.target.updateMatrixWorld(); }
    if (player.mesh) player.mesh.visible = !(camMode === 1 && phase !== 'replay' && !player2);
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
    if (kripo) dot(kripo, '#2060ff', 3.5);
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
    $('#hudDeckel').textContent = deckel ? strokes(deckel) : '–';
    $('#hudWette').textContent = wette ? (wette.done ? (wette.won ? 'JEWONNE' : 'VERLORE') : `${wette.n}🍺 › ${wette.rival.name.toUpperCase().split(' ').pop()}`) : '–';
    if (kripo) $('#hudKripo').textContent = 'HINTER DIR!'; else $('#hudKripo').textContent = kripoSeen ? 'ABJEHÄNGT' : knoellchen >= 2 ? 'NOCH 1 BLITZ…' : '–';
    if (player2) { $('#speed2').textContent = String(Math.round(Math.abs(player2.v) * 3.6)).padStart(3, '0'); $('#pos2').textContent = `POS ${standings().indexOf(player2) + 1}/${racers.length} · RUNDE ${player2.lap}/${trackDef.laps}`; const t2 = $('#turboBar2').children; for (let i = 0; i < t2.length; i++) t2[i].className = (i / t2.length) < player2.turbo ? 'on' : ''; }
    if (lastPos !== null && lastPos !== pos && phase === 'race' && raceTime > 3 && msgTimer <= 0) {
      const byTuenn = Math.random() < 0.5; const other = pick(racers.filter((r) => r.isAI)).driver;
      if (pos < lastPos) { say(byTuenn ? tuenn : other, byTuenn ? pick(tuenn.overtake) : pick(other.lines.overtaken), 2200); addDeckel(1); }
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
    hemi = new THREE.HemisphereLight(theme.night ? 0x8090c0 : theme.sky, theme.ground, theme.night ? 0.7 : 0.5); scene.add(hemi);
    sunLight = new THREE.DirectionalLight(theme.sun, theme.night ? 0.45 : 0.8); sunLight.position.set(120, 200, 80); scene.add(sunLight);
    if (renderer.shadowMap.enabled) { sunLight.castShadow = true; sunLight.shadow.mapSize.set(2048, 2048); const sc = sunLight.shadow.camera; sc.left = -170; sc.right = 170; sc.top = 170; sc.bottom = -170; sc.near = 10; sc.far = 700; sunLight.shadow.bias = -0.0008; sunLight.shadow.normalBias = 0.6; scene.add(sunLight.target); }
    scene.add(new THREE.AmbientLight(theme.night ? 0x223055 : 0x404050, theme.night ? 0.5 : 0.25));
    if (theme.night) { carLight = new THREE.PointLight(0xfff2cc, 2.0, 90); scene.add(carLight); } else carLight = null;
    // sky reflections for paint, chrome and glass
    if (window.Cars) { try { if (!pmrem) pmrem = new THREE.PMREMGenerator(renderer); if (envTex) envTex.dispose(); envTex = pmrem.fromEquirectangular(window.Pixel.T.sky(theme)).texture; window.Cars.setEnv(envTex); } catch (e) { console.warn('env map', e); } }
    road = W.buildRoad(track, theme); scene.add(road);
    scenery = W.buildScenery(track, theme); scene.add(scenery.group);
    confetti = theme.confetti ? W.buildConfetti() : null; if (confetti) scene.add(confetti);
    // field of 8: you + seven of the others
    const me = PLAYABLE[sel.driver]; const carDef = D.CARS[sel.car];
    const diffMul = me.aiMul || 1;
    racers = [];
    player = makeRacer(carDef, W.buildCar(carDef, theme.night), me, false); scene.add(player.mesh); racers.push(player);
    player2 = null;
    if (twoPlayer && !isMobile) {
      const d2 = PLAYABLE[(sel.driver + 1) % PLAYABLE.length], c2 = D.CARS[(sel.car + 1) % D.CARS.length];
      player2 = makeRacer(c2, W.buildCar(c2, theme.night), d2, false); player2.name = 'P2 (' + d2.name + ')'; player.name = 'P1 (DU)'; scene.add(player2.mesh); racers.push(player2);
      if (!camera2) camera2 = new THREE.PerspectiveCamera(70, 1, 1.0, 4000);
      document.body.classList.add('split');
    } else { document.body.classList.remove('split'); player.name = 'DU'; }
    const others = D.DRIVERS.filter((d) => d !== me && !(player2 && d === player2.driver)).slice(0, player2 ? 6 : 7);
    others.forEach((d, i) => {
      const base = D.CARS.find((c) => c.id === d.car) || D.CARS[1];
      const cdef = Object.assign({}, base, { color: d.color, plate: 'K-' + d.name.slice(0, 2).toUpperCase() + ' ' + (i + 1) });
      const r = makeRacer(cdef, W.buildCar(cdef, theme.night), d, true);
      r.skill = clamp(d.skill * diffMul, 0.7, 1.08);
      scene.add(r.mesh); racers.push(r);
    });
    // starting grid: 2 columns, player at the back like in Stunts
    racers.forEach((r, i) => { const row = Math.floor(i / 2); r.s = 6 + (racers.length / 2 - row) * 7; r.lat = (i % 2 ? 1 : -1) * 2.8; r.safeS = r.s; });
    player.s = 6; player.lat = -2.8; if (player2) { player2.s = 6; player2.lat = 2.8; }
    const sz = pixelScale === 1 ? { w: renderer.domElement.width, h: renderer.domElement.height } : (post ? post.size() : { w: 640, h: 360 }); if (camera2) { camera2.aspect = sz.w / (sz.h / 2); camera2.updateProjectionMatrix(); camera.aspect = player2 ? sz.w / (sz.h / 2) : window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); } else { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); }
    for (const v of views) { v.pos.set(0, 5, -15); v.up.set(0, 1, 0); v.look.set(0, 0, 10); v.tv = null; }
    buildMinimap(); lastPos = null;
    rec.frames = []; rec.t = []; rec.acc = 0; loadGhost();
    blitzers = scenery.props.filter((p) => p.userData.type === 'blitzer').map((p) => ({ s: p.userData.at * track.length, flash: p.userData.flash, cool: 0 }));
    // dä Lange "verzällt": anecdotes when you pass the places of his night tour
    stories = scenery.props.filter((p) => p.userData.story).map((p) => ({ s: p.userData.at * track.length, text: p.userData.story, told: false }));
    telefon = { ready: true, active: 0, used: 0 };
    knoellchen = 0; koelsch = 0; radioTimer = 40; eventTimer = 30;
    const idx = TRACKS.indexOf(trackDef);
    $('#hudTrack').textContent = `${cup.on ? 'CUP ' + (cup.i + 1) + '/' + TRACKS.length + ' · ' : idx >= 0 ? idx + 1 + '. ' : ''}${trackDef.name.toUpperCase()} (${(trackDef.tag || 'BAUKASTEN')})`;
    deckel = 0; kripo = null; kripoSeen = false; kripoCaught = false; crashes = 0; waterCrashes = 0; wette = null; lastLapSeen = 1; kripoHitCool = 0; razzia = 0; promille = 0; koelschLap = 0; $('#flash').style.background = ''; buildPickups();
  }
  function bestKey() { return `stuntskoelle.best.${trackDef.id}`; }
  function getBest(def) { try { const v = localStorage.getItem(`stuntskoelle.best.${(def || trackDef).id}`); return v ? parseFloat(v) : null; } catch (e) { return null; } }
  function setBest(t) { try { localStorage.setItem(bestKey(), String(t)); } catch (e) { /* ignore */ } }
  function getRecords(def) { try { return JSON.parse(localStorage.getItem(`stuntskoelle.rec.${def.id}`) || '[]'); } catch (e) { return []; } }
  function addRecord(def, entry) { const list = getRecords(def); list.push(entry); list.sort((a, b) => a.time - b.time); try { localStorage.setItem(`stuntskoelle.rec.${def.id}`, JSON.stringify(list.slice(0, 5))); } catch (e) { /* ignore */ } }

  // ---------------- race flow ----------------
  let cdShown = -1;
  function lockLandscape() {
    if (!document.body.classList.contains('mobile')) return;
    try {
      const el = document.documentElement; const fs = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : Promise.reject();
      Promise.resolve(fs).catch(() => {}).then(() => { if (screen.orientation && screen.orientation.lock) return screen.orientation.lock('landscape'); }).catch(() => {});
    } catch (e) { /* iOS: no lock API, the rotate overlay does the job */ }
  }
  function startRace(def) {
    audioInit();
    buildScene(def);
    raceTime = 0; countdown = 4.2; phase = 'countdown'; perf.frames = 0; perf.since = 0; perf.wait = 3;
    musicPlay();
    $('#menu').hidden = true; $('#hud').hidden = false; $('#results').hidden = true; $('#editor').hidden = true; $('#touch').hidden = !isTouch;
    document.body.classList.add('racing'); document.body.classList.remove('resultsOpen', 'replaying');
    const hour = new Date().getHours(); const dayLines = tuenn.daytime[hour >= 22 || hour < 5 ? 'night' : hour < 10 ? 'morning' : hour < 17 ? 'day' : 'evening'];
    say(tuenn, ghostData ? `Ding beste Rund (${fmtTime(ghostData.time)}) fährt als Geist mit. Fang se, Jung!` : (Math.random() < 0.35 ? pick(dayLines).replace('{h}', String(hour)) : Math.random() < 0.5 ? pick(tuenn.door) : pick(tuenn.intro)), 3800);
    $('#hudTel').textContent = 'K = ANRUFEN';
    if (tilt.mode > 0) { tiltListen(); setTimeout(tiltCalibrate, 1500); }
    if (isMobile) { camMode = 0; tvCam = null; }
    setTimeout(() => { if (phase !== 'menu') { const d = pick(racers.filter((r) => r.isAI)).driver; say(d, pick(d.lines.start), 2500); } }, 3900);
    setTimeout(() => { if (phase === 'race' && !player2) offerWette(); }, 9000);
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
    saveGhost();
    addRecord(trackDef, { name: PLAYABLE[sel.driver].name + ' (DU)', car: D.CARS[sel.car].name, time: player.finishTime, date: Date.now() });
    fanfare(won);
    if (kripo) endKripo('finish');
    if (wette && !wette.done) { wette.done = true; wette.won = order.indexOf(wette.rival.r) > order.indexOf(player); if (wette.won) addDeckel(wette.n * 2); else deckel = Math.max(0, deckel - wette.n); }
    const total = deckelTotal(deckel); const rank = deckelRank(total);
    const headline = expressHeadline(place, won, record, order); lastHeadline = headline; lastPlace = place;
    if (cup.on) { order.forEach((r, i) => { cup.pts[r.name] = (cup.pts[r.name] || 0) + (CUP_PTS[i] || 0); }); cup.i++; try { localStorage.setItem('stuntskoelle.cup', JSON.stringify(cup)); } catch (e) { /* ignore */ } }
    setTimeout(() => {
      $('#resTitle').textContent = player2 ? (order.indexOf(player) < order.indexOf(player2) ? `P1 SCHLÄGT P2! PLATZ ${place} GEGEN ${order.indexOf(player2) + 1}.` : `P2 SCHLÄGT P1! PLATZ ${order.indexOf(player2) + 1} GEGEN ${place}.`) : won ? 'JEWONNE! KÖLLE ALAAF!' : place === 2 ? 'ZWEITER. FAST, JUNG.' : `PLATZ ${place}. ET HÄTZ SCHLECHT, ÄVVER ET KÜTT!`;
      const tb = $('#resTable'); tb.innerHTML = '';
      order.forEach((r, i) => { const tr = document.createElement('tr'); if (r === player || r === player2) tr.className = 'me'; tr.innerHTML = `<td>${i + 1}.</td><td>${r.name}</td><td>${r.car.name}</td><td>${fmtTime(r.finishTime)}${r.projected ? '*' : ''}</td>`; tb.appendChild(tr); });
      $('#resBest').textContent = fmtTime(player.bestLap);
      $('#resStats').innerHTML = `KNÖLLCHEN: <b>${knoellchen}</b> (${knoellchen * 60} €, Klüngel Tom regelt dat) · KÖLSCH UNTERWEGS: <b>${koelsch}</b> · KLÜNGEL-TELEFON: <b>${telefon.used}×</b> (schuldest ihm ${telefon.used} Kölsch) · SCHADEN: <b>${Math.round(player.damage * 100)} %</b> · ${knoellchen > 2 ? 'Führerschein: uff Deckel.' : knoellchen ? 'Führerschein: noch da.' : 'Kein Blitzer erwischt. Verdächtig.'}`;
      $('#resRecord').hidden = !record;
      $('#resExpress').textContent = headline;
      $('#resDeckel').innerHTML = `BIERDECKEL: <b>${strokes(deckel)}</b> (${deckel} Striche) · GESAMT: <b>${total}</b> – <b>${rank}</b>` + (wette ? ` · WETTE: <b>${wette.won ? 'JEWONNE' : 'VERLORE'}</b> (${wette.n} Kölsch ${wette.won ? 'für dich' : 'für dä Lange'})` : '') + (kripoSeen ? ` · KRIPO: <b>${kripoCaught ? 'HÄT DICH JEKRIEGT' : 'ABJEHÄNGT'}</b>` : '');
      if (wette) { const wl = pick(wette.won ? tuenn.wette.won : tuenn.wette.lost).replace('{r}', wette.rival.name).replace('{n}', String(wette.n)); $('#resTuenn').textContent = wl; }
      renderCup(order);
      if (!wette) $('#resTuenn').textContent = record ? pick(tuenn.record) : won ? pick(tuenn.win) : pick(tuenn.lose);
      const rd = order[won ? 1 : 0].driver;
      $('#resRival').textContent = `${rd.name}: „${pick(won ? rd.lines.lose : rd.lines.win)}“`;
      $('#results').hidden = false; document.body.classList.add('resultsOpen');
    }, 1200);
  }
  function toMenu() {
    phase = 'menu';
    $('#menu').hidden = false; $('#hud').hidden = true; $('#results').hidden = true; $('#editor').hidden = true; $('#touch').hidden = true; $('#records').hidden = true; $('#replayUI').hidden = true;
    replay.on = false; if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (isMobile && twoPlayer) toggleTwoPlayer();
    document.body.classList.remove('racing', 'resultsOpen', 'replaying');
    $('#msg').classList.remove('show');
    audioEngine(0, 0); musicStop();
    if (player && player.mesh) player.mesh.visible = true;
    renderMenu();
  }

  // ---------------- main loop ----------------
  const perf = { frames: 0, since: 0, stage: 0, wait: 0 }; let lastDtReal = 0.016;
  function adaptQuality(dtReal) {
    if ((phase !== 'race' && phase !== 'countdown') || perf.stage >= 2 || window.STUNTS_SIMSTEPS || window.STUNTS_FREECAM) return;
    perf.frames++; perf.since += dtReal; if (perf.wait > 0) { perf.wait -= dtReal; }
    if (perf.since < 4) return;
    const fps = perf.frames / perf.since; perf.frames = 0; perf.since = 0;
    if (fps >= 24 || perf.wait > 0) return;
    perf.stage++; perf.wait = 8;
    if (perf.stage === 1) { renderer.setPixelRatio(1); if (renderer.shadowMap.enabled) { renderer.shadowMap.enabled = false; if (sunLight) sunLight.castShadow = false; scene.traverse((o) => { if (o.isMesh && o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { m.needsUpdate = true; }); } }); } say({ name: 'Heinzel', emoji: '🔧' }, 'Dat Handy schwitzt. Ich hab de Schatten avjeschraubt. Läuft.', 2600); }
    else if (pixelScale === 1) { pixelScale = 2; applyPixelMode(); post.setScale(2); say({ name: 'Heinzel', emoji: '🔧' }, 'Un jetz Pixel. Wie 1990. Dafür flüssig.', 2600); }
  }
  function frame(t) {
    requestAnimationFrame(frame);
    const dtReal = Math.min(0.5, (t - lastT) / 1000 || 0.016); adaptQuality(dtReal); lastDtReal = dtReal;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
    renderer.info.reset();
    if (!scene) return;
    const steps = window.STUNTS_SIMSTEPS && (phase === 'countdown' || phase === 'race' || phase === 'finished') ? window.STUNTS_SIMSTEPS : 1;
    for (let k = 0; k < steps; k++) tick(steps > 1 ? 1 / 60 : dt);
    if (scenery) W.animate(t, dt, camPos);
    if (confetti && player && player.frame) confetti.userData.update(dt, player.frame.pos);
    if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) $('#msg').classList.remove('show'); }
    updateCamera(dt);
    const cams = (player2 && camera2 && phase !== 'menu' && phase !== 'editor') ? [camera, camera2] : camera;
    if (pixelScale === 1) renderDirect(cams); else post.render(scene, cams);
  }

  // one simulation step (physics, AI, commentary); the frame loop may run several per render for headless testing
  function tick(dt) {
    if (phase === 'countdown') {
      countdown -= window.STUNTS_SIMSTEPS ? dt : Math.min(0.25, lastDtReal); // real time, so a slow phone does not stretch the countdown
      const idx = 3 - Math.ceil(countdown - 0.2); const cd = $('#countdown');
      if (countdown <= 0.2) { cd.textContent = tuenn.countdown[3]; if (cdShown !== 3) { beep(880, 0.5, 'square', 0.2); cdShown = 3; } }
      else if (idx >= 0 && idx < 3) { cd.textContent = tuenn.countdown[idx]; if (cdShown !== idx) { beep(440, 0.15); cdShown = idx; } }
      cd.hidden = false;
      if (countdown <= 0) { phase = 'race'; setTimeout(() => { cd.hidden = true; }, 700); }
      for (const r of racers) placeRacer(r, dt);
      updateHUD();
    } else if (phase === 'race' || phase === 'finished') {
      if (phase === 'race') raceTime += dt;
      if (tilt.mode > 0 && tilt.listening) readKeys();
      const ctl = player.finished ? { gas: 0, brake: 0.5, steer: 0, turbo: 0 } : window.STUNTS_AUTOPILOT ? aiControl(player, dt) : input;
      updateRacer(player, dt, ctl);
      if (player2) updateRacer(player2, dt, player2.finished ? { gas: 0, brake: 0.5, steer: 0, turbo: 0 } : window.STUNTS_AUTOPILOT ? aiControl(player2, dt) : input2);
      if (phase === 'race') recordFrame(dt);
      if (ghost) updateGhost();
      for (const r of racers) if (r.isAI) updateRacer(r, dt, r.finished ? { gas: 0, brake: 0.3, steer: 0, turbo: 0 } : aiControl(r, dt));
      for (let i = 0; i < racers.length; i++) for (let j = i + 1; j < racers.length; j++) collide(racers[i], racers[j]);
      for (const r of racers) placeRacer(r, dt);
      if (phase === 'race') { updatePickups(dt); updateKripo(dt); }
      if (phase === 'race') {
        radioTimer -= dt; eventTimer -= dt;
        if (radioTimer <= 0 && msgTimer <= 0) { radioTimer = 55 + Math.random() * 35; const roll = Math.random(); if (roll < 0.5) say({ name: 'EXPRESS', emoji: '📰' }, pick(tuenn.express).replace('EXPRESS: ', ''), 3500); else say({ name: 'Kölsches Grundgesetz', emoji: '📜' }, pick(tuenn.grundgesetz), 3500); }
        for (const st of stories) { if (st.told) continue; let ds = player.s - st.s; if (ds > track.length / 2) ds -= track.length; if (ds > -8 && ds < 30) { st.told = true; say({ name: 'Dä Lange verzällt', emoji: '🎩' }, st.text, 5000); radioTimer = Math.max(radioTimer, 8); } }
        if (telefon.active > 0) telefon.active -= dt;
        if (razzia > 0) { razzia -= dt; razziaBlink += dt; if (razziaBlink > 0.45) { razziaBlink = 0; beep(Math.floor(razzia * 2) % 2 ? 700 : 940, 0.2, 'square', 0.05); const fl = $('#flash'); fl.style.background = '#2060ff'; fl.style.opacity = '0.35'; setTimeout(() => { fl.style.opacity = '0'; }, 120); } if (razzia <= 0) { $('#flash').style.background = ''; say(tuenn, pick(tuenn.razziaEnd), 2500); } }
        else if (eventTimer <= 0 && msgTimer <= 0 && Math.random() < 0.22 && raceTime > 20 && !kripo) { eventTimer = 30 + Math.random() * 20; razzia = 8; razziaBlink = 0; say(tuenn, pick(tuenn.razzia), 3500); }
        if (eventTimer <= 0 && msgTimer <= 0) { eventTimer = 26 + Math.random() * 18; const ev = pick(tuenn.events); say(tuenn, ev, 3000); if (ev.includes('Kölsch')) { koelsch++; player.turbo = Math.min(1, player.turbo + 0.35); } }
        for (const b of blitzers) {
          b.cool -= dt; if (b.flash) b.flash.material.opacity = Math.max(0, b.flash.material.opacity - dt * 3);
          let ds = player.s - b.s; if (ds > track.length / 2) ds -= track.length;
          if (ds > 0 && ds < 4 && b.cool <= 0) { b.cool = 8; if (Math.abs(player.v) * 3.6 > 120 && !player.air) { knoellchen++; if (knoellchen >= 3 && !kripo && !kripoSeen) startKripo(); if (b.flash) b.flash.material.opacity = 1; flashTimer = 0.25; beep(1400, 0.12, 'square', 0.12); say({ name: 'Blitzer Kölle', emoji: '📸' }, pick(tuenn.blitzer), 2600); } }
        }
        if (flashTimer > 0) { flashTimer -= dt; $('#flash').style.opacity = String(Math.max(0, flashTimer * 3)); }
      }
      if (player2 && phase === 'race') { const first = [player, player2].filter((r) => r.finished); if (first.length === 1) { if (!first[0].waitT) first[0].waitT = raceTime; else if (raceTime - first[0].waitT > 20) { const o = first[0] === player ? player2 : player; o.finished = true; o.finishTime = raceTime + 5; o.projected = true; } } }
      if (player.finished && (!player2 || player2.finished) && phase === 'race') finishRace();
      if (phase === 'race') updateHUD();
      drawMinimap();
      audioEngine(Math.abs(player.v), ctl.gas, player.turboOn);
    } else if (phase === 'replay') {
      replayStep(dt);
    } else if (phase === 'menu' || phase === 'editor') {
      // idle drive-by behind the menu
      if (player) { player.s = (player.s + dt * 30) % track.length; placeRacer(player, dt); racers.forEach((r, i) => { if (r.isAI) { r.s = (player.s + 8 + i * 7) % track.length; placeRacer(r, dt); } }); }
    }
  }

  function renderDirect(cams) {
    const r = renderer;
    // viewport and scissor take CSS pixels (three multiplies by the pixel ratio itself); using the canvas'
    // device-pixel size doubled the viewport on phones with pixel ratio 2 and showed only a zoomed quarter
    const sz = r.getSize(new THREE.Vector2()); const w = sz.x, h = sz.y;
    if (Array.isArray(cams)) {
      const hh = Math.floor(h / 2);
      r.setScissorTest(true);
      r.setViewport(0, hh, w, h - hh); r.setScissor(0, hh, w, h - hh); r.render(scene, cams[0]);
      r.setViewport(0, 0, w, hh); r.setScissor(0, 0, w, hh); r.render(scene, cams[1]);
      r.setScissorTest(false); r.setViewport(0, 0, w, h);
    } else { r.setViewport(0, 0, w, h); r.render(scene, cams); }
  }
  // ---------------- input ----------------
  const isTouch = ('ontouchstart' in window) && matchMedia('(pointer: coarse)').matches;
  const isMobile = isTouch || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const touch = { left: false, right: false, gas: false, brake: false, turbo: false };
  // tilt steering: the phone's gravity vector along its long axis tells how far it is turned like a wheel
  const tilt = { mode: 0, raw: 0, zero: 0, val: 0, listening: false, lastCal: 0 }; // mode 0 off, 1 on, 2 on + inverted
  try { tilt.mode = parseInt(localStorage.getItem('stuntskoelle.tilt') || '0') || 0; } catch (e) { /* ignore */ }
  function onMotion(e) { const a = e.accelerationIncludingGravity; if (!a || a.y == null) return; tilt.raw = a.y; }
  function tiltListen() {
    if (tilt.listening) return; tilt.listening = true;
    window.addEventListener('devicemotion', onMotion);
  }
  function tiltCalibrate() { tilt.zero = tilt.raw; tilt.lastCal = Date.now(); }
  function updateTiltUI() { const b = $('#tiltBtn'); if (b) b.textContent = tilt.mode === 0 ? '📱 NEIGEN: AUS' : tilt.mode === 1 ? '📱 NEIGEN: AN' : '📱 NEIGEN: AN (UMGEKEHRT)'; document.body.classList.toggle('tilt', tilt.mode > 0); }
  function setTiltMode(m) { tilt.mode = m; try { localStorage.setItem('stuntskoelle.tilt', String(m)); } catch (e) { /* ignore */ } updateTiltUI(); if (m > 0) { tiltListen(); setTimeout(tiltCalibrate, 600); say(tuenn, m === 1 ? 'Handy neigen wie e Lenkrad, Jung. Links, rechts, un nit zo wild. Nochmal drücke dreht de Richtung um.' : 'Umjekehrt jelenkt. Wie de Schäl. Passt.', 3500); } }
  function toggleTilt() {
    const next = (tilt.mode + 1) % 3;
    if (next > 0 && !tilt.listening && typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().then((st) => { if (st === 'granted') setTiltMode(next); else say(tuenn, 'Kein Zugriff op de Bewegungssensor. Dann halt mit de Knöpp.', 3000); }).catch(() => say(tuenn, 'Der Sensor sagt nä. Dann halt mit de Knöpp.', 3000));
    } else setTiltMode(next);
  }
  function tiltSteer() {
    if (tilt.mode === 0 || !tilt.listening) return 0;
    const ang = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (window.orientation || 0);
    const sign = (ang === 90 ? 1 : -1) * (tilt.mode === 2 ? -1 : 1);
    let v = (tilt.raw - tilt.zero) / 9.81 * sign * 3.2;
    if (Math.abs(v) < 0.08) v = 0; else v -= Math.sign(v) * 0.08;
    tilt.val += (clamp(v, -1, 1) - tilt.val) * 0.35;
    return tilt.val;
  }
  function readKeys() {
    const left = keys.ArrowLeft || (!player2 && keys.KeyA), right = keys.ArrowRight || (!player2 && keys.KeyD);
    input.steer = (left ? -1 : 0) + (right ? 1 : 0);
    input.gas = (keys.ArrowUp || (!player2 && keys.KeyW)) ? 1 : 0;
    input.brake = (keys.ArrowDown || (!player2 && keys.KeyS) || keys.Space) ? 1 : 0;
    input.turbo = (keys.ShiftLeft || keys.ShiftRight || keys.KeyN || keys.KeyX) ? 1 : 0;
    if (touch.left) input.steer -= 1; if (touch.right) input.steer += 1; if (touch.gas) input.gas = 1; if (touch.brake) input.brake = 1; if (touch.turbo) input.turbo = 1;
    if (tilt.mode > 0 && !touch.left && !touch.right && input.steer === 0) input.steer = tiltSteer();
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
    if (phase === 'replay') {
      if (e.code === 'Escape') stopReplay(); if (e.code === 'Space') replay.paused = !replay.paused;
      if (e.code === 'ArrowRight') { replay.speed = replay.speed >= 4 ? 1 : replay.speed * 2; } if (e.code === 'ArrowLeft') { replay.time = Math.max(0, replay.time - 5); replay.paused = false; }
      if (e.code === 'KeyC') { replay.mode = (replay.mode + 1) % 4; }
      e.preventDefault(); return;
    }
    if (player2) { readKeys2(); if (e.code === 'KeyV') views[1].mode = (views[1].mode + 1) % 3; }
    if (e.code === 'KeyC') { camMode = (camMode + 1) % 4; tvCam = null; }
    if (e.code === 'KeyP') cyclePixel();
    if (e.code === 'KeyM') toggleMute();
    if (e.code === 'KeyR' && phase === 'race' && player.crashed <= 0) { crash(player, 'off'); player.crashed = 0.6; }
    if (e.code === 'KeyK' && phase === 'race') tuennsTelefon();
    if (e.code === 'Escape') toMenu();
    if (e.code === 'Enter' && phase === 'finished') $('#againBtn').onclick();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; readKeys(); if (player2) readKeys2(); });
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
      row.innerHTML = `<span class="p1">${sel.track === i ? 'P1' : t.fromLink ? '🔗' : i + 1}</span><canvas class="thumb"></canvas><div class="info"><b>${t.name.toUpperCase()}</b><span class="sub">${(t.district || 'Klüngel-Baukasten').toUpperCase()}</span><span class="wp">${(t.waypoints || ['Eigene Streck']).join(' – ').toUpperCase()}</span><span class="pips">${pips}</span></div><div class="map"><canvas class="outline"></canvas><span class="km"></span>${best ? `<span class="best">${fmtTime(best)}</span>` : ''}</div>`;
      SP.thumb(t, row.querySelector('.thumb'), 192, 72);
      const tr = trackOutline(t, row.querySelector('.outline'), 110, 62);
      row.querySelector('.km').textContent = (tr.length * t.laps / 1000).toFixed(1) + ' KM';
      row.onclick = () => { sel.track = i; onTrackChange(); };
      tl.appendChild(row);
    });
    const t = all[sel.track] || TRACKS[0];
    $('#trackDesc').textContent = t.desc || 'Eigene Streck aus dem Klüngel-Baukasten.';
    $('#langerQuote').textContent = '„' + pick(tuenn.intro) + '“';
    $('#slogan').textContent = tuenn.slogans[Math.floor(Date.now() / 86400000) % tuenn.slogans.length];
    try { const tot = parseInt(localStorage.getItem('stuntskoelle.deckel') || '0') || 0; const wins = parseInt(localStorage.getItem('stuntskoelle.cupwins') || '0') || 0; const q = document.querySelector('.bannerQuote .q'); if (q && tot > 0) q.innerHTML = `DING DECKEL: ${tot} STRICHE<br>${deckelRank(tot)}${wins ? ' · ' + wins + '× CUP' : ''}<span>– der Köbes</span>`; } catch (e) { /* ignore */ }
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
      div.innerHTML = `<b>${i + 1}. ${t.name.toUpperCase()}</b>` + (recs.length ? '<ol>' + recs.map((r) => `<li><span>${r.name}</span><span>${r.car}</span><span>${fmtTime(r.time)}</span></li>`).join('') + '</ol>' : '<p>Noch keine Zeit. Dä Lange wartet.</p>');
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

  // ---------------- Klüngel-Telefon: one call per lap, the doormen hold the field ----------------
  function tuennsTelefon() {
    if (!telefon.ready || telefon.active > 0) { say(tuenn, 'Besetzt, Jung. Ich telefonier nur eimol pro Rund.', 2000); return; }
    telefon.ready = false; telefon.active = 6; telefon.used++;
    if (kripo) { endKripo('off'); say(tuenn, pick(tuenn.kripo.off), 3500); } else say(tuenn, pick(tuenn.tuennsTelefon), 3500);
    beep(660, 0.12, 'triangle', 0.15); setTimeout(() => beep(880, 0.12, 'triangle', 0.15), 150);
    $('#hudTel').textContent = 'BESETZT'; setTimeout(() => { $('#hudTel').textContent = telefon.ready ? 'K = ANRUFEN' : 'NÄCHSTE RUND'; }, 6000);
  }
  // ---------------- Chicago am Rhein extras ----------------
  function strokes(n) { let out = ''; for (let i = 0; i < n; i++) out += (i % 5 === 4) ? '/ ' : '|'; return out.trim(); }
  function addDeckel(n) { deckel += n; }
  function deckelTotal(add) { let t = 0; try { t = parseInt(localStorage.getItem('stuntskoelle.deckel') || '0') || 0; } catch (e) { /* ignore */ } t += add; try { localStorage.setItem('stuntskoelle.deckel', String(t)); } catch (e) { /* ignore */ } return t; }
  function deckelRank(total) { let r = tuenn.ranks[0][1]; for (const [min, name] of tuenn.ranks) if (total >= min) r = name; return r; }
  function koelschMesh() {
    const g = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 1.0, 12), new THREE.MeshBasicMaterial({ color: 0xffc300, transparent: true, opacity: 0.9 })); glass.position.y = 0.5; g.add(glass);
    const foam = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); foam.position.y = 1.08; g.add(foam);
    const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 16), new THREE.MeshBasicMaterial({ color: 0xf4e8c8 })); mat.position.y = -0.02; g.add(mat);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffe080, transparent: true, opacity: 0.7 })); halo.rotation.x = Math.PI / 2; halo.position.y = 0.05; g.add(halo);
    return g;
  }
  function buildPickups() {
    for (const p of pickups) scene.remove(p.mesh); pickups = [];
    const L = track.length, S = track.samples, n = Math.max(4, Math.floor(L / 230));
    let sPos = 60;
    for (let k = 0; k < n; k++) {
      sPos += (L - 120) / n * (0.75 + Math.random() * 0.3); let i = Math.floor((sPos % L) / track.ds), tries = 0;
      while (tries++ < 80 && !['straight', 'bridge', 'curve'].includes(S[i % S.length].kind)) i += 4;
      i %= S.length; const f = TB.frameAt(track, i * track.ds); const lat = (Math.random() - 0.5) * 6;
      const mesh = koelschMesh(); const base = new THREE.Vector3(f.p.x, f.p.y, f.p.z).addScaledVector(new THREE.Vector3(f.B.x, f.B.y, f.B.z), lat).addScaledVector(new THREE.Vector3(f.N.x, f.N.y, f.N.z), 0.9);
      mesh.position.copy(base); scene.add(mesh); pickups.push({ s: i * track.ds, lat, mesh, base, taken: false, phase: Math.random() * 6 });
    }
  }
  function updatePickups(dt) {
    pickT += dt;
    if (player.lap !== lastLapSeen) { lastLapSeen = player.lap; koelschLap = 0; for (const p of pickups) { p.taken = false; p.mesh.visible = true; } }
    if (promille > 0) { promille -= dt; if (promille <= 0) say(tuenn, pick(tuenn.promilleEnd), 2200); }
    const L = track.length;
    for (const p of pickups) {
      if (p.taken) continue;
      p.mesh.rotation.y += dt * 2.2; p.mesh.position.y = p.base.y + Math.sin(pickT * 3 + p.phase) * 0.22;
      let ds = player.s - p.s; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
      if (Math.abs(ds) < 3.6 && Math.abs(player.lat - p.lat) < 2.0 && !player.air && player.crashed <= 0) {
        p.taken = true; p.mesh.visible = false; koelsch++; koelschLap++; addDeckel(1); player.turbo = Math.min(1, player.turbo + 0.3);
        if (koelschLap >= 5 && promille <= 0) { promille = 7; say(tuenn, pick(tuenn.promille), 3200); }
        beep(1180, 0.07, 'square', 0.1); setTimeout(() => beep(1580, 0.1, 'square', 0.1), 70);
        if (msgTimer <= 0.4) say(D.DRIVERS.find((d) => d.id === 'koebes'), pick(tuenn.koelschPick), 1600);
      }
    }
  }
  function startKripo() {
    kripoSeen = true; kripoT = 0; kripoHitCool = 3;
    const base = D.CARS.find((c) => c.id === 'special') || D.CARS[0];
    const cdef = Object.assign({}, base, { name: 'Peterwagen', color: 0xf4f4f0, stripe: 0x2d6a3a, shape: 'sedan', plate: 'K-3110', top: Math.max(base.top, player.car.top) * 1.08, accel: base.accel * 1.25, grip: Math.max(base.grip, player.car.grip) * 1.15 });
    const mesh = W.buildCar(cdef, theme.night);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.34), new THREE.MeshBasicMaterial({ color: 0x2060ff })); bar.position.set(0, 1.55, -0.2); mesh.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.34), new THREE.MeshBasicMaterial({ color: 0xffffff })); bar2.position.set(0, 1.55, -0.2); bar2.visible = false; mesh.add(bar2);
    const sign = W.textPlane('POLIZEI', '#f4f4f0', '#2d6a3a', 1.4, 0.28, false, { sizeK: 0.6 }); sign.position.set(0.9, 0.75, -0.2); sign.rotation.y = Math.PI / 2; mesh.add(sign);
    const sign2 = sign.clone(); sign2.position.x = -0.9; sign2.rotation.y = -Math.PI / 2; mesh.add(sign2);
    kripo = makeRacer(cdef, mesh, { name: 'Kripo Kölle', skill: 1.05, wobble: 0, lines: {} }, true); kripo.isCop = true; kripo.bar = bar; kripo.bar2 = bar2;
    kripo.s = ((player.s - 75) % track.length + track.length) % track.length; kripo.lat = 0; kripo.v = Math.max(15, player.v * 0.8); kripo.safeS = kripo.s; kripo.turbo = 1;
    scene.add(mesh); say(KRIPO, pick(tuenn.kripo.start), 3500);
  }
  function copControl(r) {
    const L = track.length; let ds = player.s - r.s; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
    const i = Math.floor(((r.s % L) + L) % L / track.ds) % track.samples.length;
    const safe = track.safe[i] * 1.12;
    const target = ds > 5 ? Math.min(safe, r.car.top) : Math.max(0, Math.abs(player.v) - 1);
    const gas = r.v < target ? 1 : 0, brake = r.v > target + 3 ? 0.8 : 0;
    const wantLat = clamp(player.lat, -ROAD_W + 1.2, ROAD_W - 1.2);
    let steer = clamp((wantLat - r.lat) * 0.45, -1, 1);
    const f = TB.frameAt(track, r.s); const need = f.curv * r.v * r.v, gripAcc = 24 * r.car.grip;
    const slide = Math.sign(need) * Math.max(0, Math.abs(need) - gripAcc) * 0.28; steer -= clamp(slide / (2.5 + 0.16 * r.v), -1, 1);
    return { gas, brake, steer: clamp(steer, -1, 1), turbo: ds > 40 && r.turbo > 0.1 ? 1 : 0 };
  }
  function updateKripo(dt) {
    if (!kripo) return;
    kripoT += dt; kripoHitCool -= dt; sirenT += dt;
    updateRacer(kripo, dt, copControl(kripo)); placeRacer(kripo, dt);
    const blink = Math.floor(kripoT * 5) % 2 === 0; kripo.bar.visible = blink; kripo.bar2.visible = !blink;
    const L = track.length; let ds = player.s - kripo.s; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
    if (sirenT > 0.5) { sirenT = 0; if (Math.abs(ds) < 160) beep(Math.floor(kripoT * 2) % 2 ? 720 : 960, 0.22, 'square', Math.max(0.02, 0.07 - Math.abs(ds) * 0.0003)); }
    const pk = TB.frameAt(track, player.s).kind;
    if (kripoHitCool <= 0 && Math.abs(ds) < 4.8 && Math.abs(player.lat - kripo.lat) < 2.4 && !player.air && !kripo.air && player.crashed <= 0 && kripo.crashed <= 0 && pk !== 'loop' && pk !== 'ramp') {
      kripoHitCool = 2.4; player.damage = Math.min(1, player.damage + 0.14); player.v *= 0.82; player.lat += (player.lat >= kripo.lat ? 1 : -1) * 1.3; kripo.v *= 0.9; crashSound(); shake = 0.6;
      if (player.damage >= 1) { kripoCaught = true; crash(player, 'kripo'); say(KRIPO, pick(tuenn.kripo.caught), 3000); endKripo('caught'); return; }
      say(KRIPO, pick(tuenn.kripo.hit), 2200);
    }
    if (kripoT > 55 || ds < -140) endKripo('giveup');
  }
  function endKripo(why) {
    if (!kripo) return; scene.remove(kripo.mesh); kripo = null;
    if (why === 'giveup') say(KRIPO, pick(tuenn.kripo.giveup), 3000);
  }
  function offerWette() {
    const cands = racers.filter((r) => r.isAI && r !== player2); if (!cands.length) return;
    const r = pick(cands); wette = { rival: { name: r.driver.name, r }, n: 1 + Math.floor(Math.random() * 3), done: false, won: false };
    say(tuenn, pick(tuenn.wette.offer).replace('{r}', r.driver.name).replace('{n}', String(wette.n)), 4200);
  }
  function expressHeadline(place, won, record, order) {
    const E = tuenn.express2; const car = D.CARS[sel.car].name.toUpperCase(); const fill = (t) => t.replace('{car}', car).replace('{track}', trackDef.name.toUpperCase()).replace('{n}', String(knoellchen)).replace('{p}', String(place));
    if (record && won) return fill(E.record);
    if (kripoCaught) return fill(E.kripoCaught);
    if (won) return fill(E.win);
    if (kripoSeen) return fill(E.kripo);
    if (waterCrashes) return fill(E.water);
    if (knoellchen >= 3) return fill(E.knoellchen);
    if (crashes >= 3) return fill(E.crashes);
    if (place >= order.length) return fill(E.last);
    if (koelsch >= 8) return fill(E.koelsch).replace('{n}', String(koelsch));
    if (place <= 3) return fill(E.podium);
    return fill(E.default);
  }
  function renderCup(order) {
    const box = $('#resCup'); const again = $('#againBtn');
    if (!cup.on) { box.hidden = true; again.textContent = 'NOCHMAL (ENTER)'; return; }
    const rows = Object.entries(cup.pts).sort((a, b) => b[1] - a[1]); const myPos = rows.findIndex((e) => e[0] === 'DU') + 1; const done = cup.i >= TRACKS.length;
    box.hidden = false;
    box.innerHTML = `<b>🍺 KÖLSCH-CUP · ${done ? 'ENDSTAND' : 'NACH ' + cup.i + ' VON ' + TRACKS.length + ' STRECKEN'}</b><table>` + rows.slice(0, 5).map((e, i) => `<tr class="${e[0] === 'DU' ? 'me' : ''}"><td>${i + 1}.</td><td>${e[0]}</td><td>${e[1]} Pkt.</td></tr>`).join('') + (myPos > 5 ? `<tr class="me"><td>${myPos}.</td><td>DU</td><td>${cup.pts.DU || 0} Pkt.</td></tr>` : '') + '</table>';
    again.textContent = done ? 'CUP BEENDEN (ENTER)' : `NÄCHSTE STRECKE: ${TRACKS[cup.i].name.toUpperCase()} (ENTER)`;
    if (done) { const line = myPos === 1 ? pick(tuenn.cup.champion) : myPos <= 3 ? pick(tuenn.cup.podium) : pick(tuenn.cup.loser); $('#resTuenn').textContent = line; try { const wins = parseInt(localStorage.getItem('stuntskoelle.cupwins') || '0') || 0; if (myPos === 1) localStorage.setItem('stuntskoelle.cupwins', String(wins + 1)); } catch (e) { /* ignore */ } }
    else setTimeout(() => { if (phase === 'finished') say(tuenn, pick(tuenn.cup.next), 3000); }, 2500);
  }

  // ---------------- replay ----------------
  function recordFrame(dt) {
    rec.acc += dt; if (rec.acc < 0.05 || rec.frames.length > 6000) return; rec.acc = 0;
    const f = new Float32Array(racers.length * 5);
    racers.forEach((r, i) => { f[i * 5] = r.s + r.lap * track.length; f[i * 5 + 1] = r.lat; f[i * 5 + 2] = r.air ? r.y : -999; f[i * 5 + 3] = r.steerVis; f[i * 5 + 4] = r.crashed > 0 ? 1 : 0; });
    rec.frames.push(f); rec.t.push(raceTime);
  }
  function buildReplayCams() {
    replay.cams = [];
    for (let s = 40; s < track.length; s += 90) { const f = TB.frameAt(track, s); const side = (Math.floor(s / 90) % 2) ? 1 : -1; replay.cams.push({ s, pos: new THREE.Vector3(f.p.x + f.B.x * side * 18, f.p.y + 5 + (s % 3) * 3, f.p.z + f.B.z * side * 18) }); }
  }
  function startReplay() {
    if (rec.frames.length < 10) return;
    phase = 'replay'; replay.on = true; document.body.classList.add('replaying'); document.body.classList.remove('resultsOpen'); replay.time = 0; replay.paused = false; replay.speed = 1; replay.camIdx = -1; replay.mode = 0;
    buildReplayCams();
    $('#results').hidden = true; $('#replayUI').hidden = false; $('#hud').hidden = false; $('#cockpit').hidden = true;
    for (const r of racers) { r.crashed = 0; r.mesh.visible = true; }
    if (ghost) ghost.visible = false;
    if (player.mesh) player.mesh.visible = true;
    say(tuenn, 'Replay, Jung. Kuck dir an, wie et wirklich wor.', 2500);
  }
  function stopReplay() { replay.on = false; phase = 'finished'; document.body.classList.remove('replaying'); document.body.classList.add('resultsOpen'); $('#replayUI').hidden = true; $('#results').hidden = false; if (ghost) ghost.visible = true; }
  function replayStep(dt) {
    if (!replay.paused) replay.time += dt * replay.speed;
    const T = rec.t; const last = T[T.length - 1];
    if (replay.time >= last) { replay.time = last; replay.paused = true; }
    if (replay.time < 0) replay.time = 0;
    // locate frame
    let i = 0; let lo = 0, hi = T.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (T[mid] < replay.time) lo = mid + 1; else hi = mid; } i = Math.max(0, lo - 1);
    const a = rec.frames[i], b = rec.frames[Math.min(i + 1, rec.frames.length - 1)]; const u = (b === a) ? 0 : clamp((replay.time - T[i]) / Math.max(1e-3, T[i + 1] - T[i]), 0, 1);
    racers.forEach((r, k) => {
      const S = a[k * 5] + (b[k * 5] - a[k * 5]) * u; r.lap = Math.floor(S / track.length); r.s = S - r.lap * track.length;
      r.lat = a[k * 5 + 1] + (b[k * 5 + 1] - a[k * 5 + 1]) * u; const ya = a[k * 5 + 2], yb = b[k * 5 + 2]; r.air = ya > -900 && yb > -900; r.y = r.air ? ya + (yb - ya) * u : 0; r.steerVis = a[k * 5 + 3]; r.crashed = a[k * 5 + 4] > 0.5 ? 1 : 0; r.v = 30;
      placeRacer(r, dt); if (r.crashed) r.mesh.rotation.z += dt * 6;
    });
    raceTime = replay.time; drawMinimap();
    $('#replayTime').textContent = fmtTime(replay.time) + ' / ' + fmtTime(last); $('#replayBar').style.width = (100 * replay.time / last) + '%';
    $('#replayState').textContent = replay.paused ? '❚❚ PAUSE' : replay.speed > 1 ? '▶▶ ' + replay.speed + '×' : '▶ REPLAY';
    $('#speed').textContent = String(Math.round(Math.abs(player.v) * 3.6)).padStart(3, '0');
  }
  function replayCamera(view, r, dt) {
    if (replay.mode !== 0) { updateCameraFor(view, r, dt, replay.mode); return; }
    // Stunts-style trackside TV: nearest camera the car just passed, looking at the car
    const pos = r.s; let best = replay.camIdx;
    if (best < 0 || replay.cams[best].s > pos + 20 || pos - replay.cams[best].s > 100) { best = 0; for (let i = 0; i < replay.cams.length; i++) if (replay.cams[i].s <= pos + 20) best = i; }
    replay.camIdx = best; const c = replay.cams[best];
    camera.position.copy(c.pos); camera.up.set(0, 1, 0); camera.lookAt(r.frame.pos);
    camera.fov = clamp(70 - camera.position.distanceTo(r.frame.pos) * 0.35, 28, 70); camera.updateProjectionMatrix();
  }

  // ---------------- ghost of your best lap ----------------
  function ghostKey() { return `stuntskoelle.ghost.${trackDef.id}`; }
  function loadGhost() {
    ghostData = null; if (ghost) { scene.remove(ghost); ghost = null; }
    try { const g = JSON.parse(localStorage.getItem(ghostKey()) || 'null'); if (g && g.t && g.t.length > 10) ghostData = g; } catch (e) { /* ignore */ }
    if (!ghostData) return;
    ghost = W.buildCar(Object.assign({}, D.CARS[0], { color: 0xdde6ff, plate: 'GEIST' }), false);
    ghost.traverse((o) => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; const cl = ms.map((m) => { const c = m.clone(); c.transparent = true; c.opacity = 0.35; c.depthWrite = false; return c; }); o.material = Array.isArray(o.material) ? cl : cl[0]; } });
    scene.add(ghost);
  }
  function updateGhost() {
    if (!ghostData || !ghost) return;
    const t = raceTime - player.lapStart; const T = ghostData.t; if (t > T[T.length - 1]) { ghost.visible = false; return; }
    ghost.visible = phase === 'race';
    let lo = 0, hi = T.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (T[mid] < t) lo = mid + 1; else hi = mid; } const i = Math.max(0, lo - 1); const u = clamp((t - T[i]) / Math.max(1e-3, T[i + 1] - T[i]), 0, 1);
    const s = ghostData.s[i] + (ghostData.s[Math.min(i + 1, T.length - 1)] - ghostData.s[i]) * u, lat = ghostData.l[i] + (ghostData.l[Math.min(i + 1, T.length - 1)] - ghostData.l[i]) * u;
    const f = TB.frameAt(track, s + (player.lap - 1) * 0); const B = new THREE.Vector3(f.B.x, f.B.y, f.B.z), N = new THREE.Vector3(f.N.x, f.N.y, f.N.z), Tt = new THREE.Vector3(f.T.x, f.T.y, f.T.z);
    ghost.position.set(f.p.x, f.p.y, f.p.z).addScaledVector(B, lat).addScaledVector(N, 0.1);
    const right = new THREE.Vector3().crossVectors(N, Tt).normalize(); _m.makeBasis(right, N, Tt); ghost.quaternion.setFromRotationMatrix(_m);
  }
  function saveGhost() {
    if (!player.bestLap || player.laps.length === 0 || rec.frames.length < 10) return;
    const old = ghostData; if (old && old.time <= player.bestLap + 0.01) return;
    // find the best lap window in the recording
    let start = 0; let bestIdx = player.laps.indexOf(player.bestLap); for (let k = 0; k < bestIdx; k++) start += player.laps[k];
    const end = start + player.bestLap; const t = [], sArr = [], l = [];
    for (let i = 0; i < rec.frames.length; i++) { const tt = rec.t[i]; if (tt < start || tt > end) continue; const f = rec.frames[i]; t.push(Math.round((tt - start) * 100) / 100); sArr.push(Math.round((f[0] % track.length) * 10) / 10); l.push(Math.round(f[1] * 10) / 10); }
    if (t.length < 10) return;
    try { localStorage.setItem(ghostKey(), JSON.stringify({ time: player.bestLap, t, s: sArr, l })); } catch (e) { /* ignore */ }
  }

  // ---------------- share links for Baukasten tracks ----------------
  const PIECE_CODE = { straight: 'g', lcurve: 'l', rcurve: 'r', lbank: 'L', rbank: 'R', hill: 'h', dip: 'd', loop: 'o', jump: 'j', bridge: 'b', tunnel: 't' };
  function encodeTrack(def) { const code = def.segments.map((sg) => { const p = PIECES.find((q) => q.seg.t === sg.t && (q.seg.angle == null || Math.sign(q.seg.angle) === Math.sign(sg.angle)) && (!!q.seg.bank === !!sg.bank)) || PIECES[0]; return PIECE_CODE[p.id]; }).join(''); const base = TRACKS.findIndex((t) => t.theme === def.theme); return `#s=${code}&k=${Math.max(0, base)}&n=${encodeURIComponent(def.name)}`; }
  function decodeTrackHash(hash) {
    const m = /[#&]s=([gLlRrhdojbt]+)/.exec(hash); if (!m) return null;
    const k = parseInt((/[#&]k=(\d+)/.exec(hash) || [])[1] || '4'); const n = decodeURIComponent((/[#&]n=([^&]+)/.exec(hash) || [])[1] || 'Link-Streck');
    const inv = {}; for (const id in PIECE_CODE) inv[PIECE_CODE[id]] = id;
    const pieces = m[1].split('').map((c) => inv[c]).filter(Boolean); if (pieces.length < 4) return null;
    ed.pieces = pieces; ed.base = clamp(k, 0, TRACKS.length - 1); $('#edName').value = n.slice(0, 24);
    const def = edDef(); def.fromLink = true; return def;
  }
  function shareTrack() {
    const def = edDef(); if ($('#edDrive').disabled) return;
    const url = location.origin + location.pathname + encodeTrack(def);
    const done = (how) => { $('#edWarn').textContent = how + ' – schick den Link per WhatsApp, dann fährt dä andere ding Streck.'; $('#edWarn').className = 'ok'; };
    if (navigator.share) navigator.share({ title: 'KÖLLE 4D – ' + def.name, text: 'Ming Streck aus dem Klüngel-Baukasten: ' + def.name, url }).then(() => done('Jeteilt')).catch(() => { navigator.clipboard && navigator.clipboard.writeText(url).then(() => done('Link kopiert')); });
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => done('Link kopiert')).catch(() => { prompt('Link zum Kopieren:', url); });
    else prompt('Link zum Kopieren:', url);
  }

  // ---------------- two players on one keyboard ----------------
  function toggleTwoPlayer() {
    twoPlayer = !twoPlayer;
    $('#p2Btn').textContent = twoPlayer ? '👥 2 SPIELER: AN' : '👥 2 SPIELER: AUS';
    $('#p2Info').hidden = !twoPlayer;
    if (twoPlayer) { const d2 = PLAYABLE[(sel.driver + 1) % PLAYABLE.length], c2 = D.CARS[(sel.car + 1) % D.CARS.length]; $('#p2Info').textContent = `P2: ${d2.name} im ${c2.name} · W/A/S/D + Q Nitro · P1: Pfeile + Shift`; }
  }
  function readKeys2() {
    input2.steer = (keys.KeyA ? -1 : 0) + (keys.KeyD ? 1 : 0);
    input2.gas = keys.KeyW ? 1 : 0; input2.brake = keys.KeyS ? 1 : 0; input2.turbo = keys.KeyQ ? 1 : 0;
  }

  // ---------------- init ----------------
  // pixelScale 1 = full HD rendering with smooth textures, 2-4 = retro pixel modes
  function applyPixelMode() {
    const hd = pixelScale === 1;
    renderer.setPixelRatio(hd ? Math.min(2, window.devicePixelRatio || 1) : 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    window.Pixel.setSmooth(hd);
    document.body.classList.toggle('hd', hd);
    $('#pixBtn').textContent = hd ? 'HD' : pixelScale === 2 ? '▪▪' : pixelScale === 3 ? '▪▪▪' : '▪▪▪▪';
  }
  function cyclePixel() {
    pixelScale = pixelScale >= 4 ? 1 : pixelScale + 1;
    applyPixelMode();
    if (pixelScale > 1) post.setScale(pixelScale);
    try { localStorage.setItem('stuntskoelle.pixel', String(pixelScale)); } catch (e) { /* ignore */ }
  }
  function init() {
    try { const s = JSON.parse(localStorage.getItem('stuntskoelle.sel')); if (s) Object.assign(sel, s); } catch (e) { /* ignore */ }
    try { customTracks = JSON.parse(localStorage.getItem('stuntskoelle.custom') || '[]'); } catch (e) { customTracks = []; }
    sel.track = clamp(sel.track | 0, 0, TRACKS.length + customTracks.length - 1); sel.car = clamp(sel.car | 0, 0, D.CARS.length - 1); sel.driver = clamp(sel.driver | 0, 0, PLAYABLE.length - 1);
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: $('#gl'), powerPreference: 'high-performance' });
    renderer.info.autoReset = false;
    renderer.shadowMap.enabled = !isMobile; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    try { pixelScale = clamp(parseInt(localStorage.getItem('stuntskoelle.pixel')) || 1, 1, 4); } catch (e) { /* ignore */ }
    applyPixelMode();
    post = new window.Pixel.PixelPost(renderer, Math.max(2, pixelScale));
    camera = new THREE.PerspectiveCamera(isMobile ? 76 : 70, window.innerWidth / window.innerHeight, 1.0, isMobile ? 2600 : 4000);
    if (isMobile) document.body.classList.add('mobile');
    window.addEventListener('resize', () => { renderer.setSize(window.innerWidth, window.innerHeight); post.setSize(window.innerWidth, window.innerHeight); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); drawBanner(); });
    // banner art
    drawBanner();
    // turbo/damage bar segments
    for (const id of ['turboBar', 'dmgBar']) { const el = document.getElementById(id); for (let i = 0; i < 10; i++) el.appendChild(document.createElement('i')); }
    renderMenu();
    $('#startBtn').onclick = () => { cup.on = false; lockLandscape(); startRace(); };
    $('#againBtn').onclick = () => { if (cup.on) { if (cup.i >= TRACKS.length) { cup.on = false; toMenu(); return; } startRace(TRACKS[cup.i]); } else startRace(); };
    $('#cupBtn').onclick = () => { cup.on = true; cup.i = 0; cup.pts = {}; startRace(TRACKS[0]); };
    $('#menuBtn').onclick = toMenu;
    $('#shareBtn').onclick = () => {
      const url = location.href.split('#')[0]; const text = `KÖLLE 4D – ${trackDef.name}: Platz ${lastPlace}, ${fmtTime(player.finishTime)}. ${lastHeadline.replace('EXPRESS: ', '')} · Bierdeckel: ${deckel} Striche. Fahr selbst: `;
      const done = (m) => { $('#shareBtn').textContent = m; setTimeout(() => { $('#shareBtn').textContent = '📲 TEILEN'; }, 2500); };
      if (navigator.share) navigator.share({ title: 'KÖLLE 4D – CHICAGO AM RHEIN', text, url }).then(() => done('JETEILT')).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(text + url).then(() => done('KOPIERT')).catch(() => { prompt('Zum Kopieren:', text + url); });
      else prompt('Zum Kopieren:', text + url);
    };
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
    $('#edShare').onclick = shareTrack;
    $('#replayBtn').onclick = startReplay;
    $('#replayExit').onclick = stopReplay;
    $('#replayPause').onclick = () => { replay.paused = !replay.paused; };
    $('#replaySpeed').onclick = () => { replay.speed = replay.speed >= 4 ? 1 : replay.speed * 2; };
    $('#replayCam').onclick = () => { replay.mode = (replay.mode + 1) % 4; };
    $('#p2Btn').onclick = toggleTwoPlayer;
    $('#tTel').addEventListener('touchstart', (e) => { e.preventDefault(); if (phase === 'race') tuennsTelefon(); }, { passive: false });
    $('#voiceBtn').onclick = toggleVoice;
    $('#tiltBtn').onclick = toggleTilt; updateTiltUI(); if (!isMobile) $('#tiltBtn').hidden = true;
    voiceInit();
    for (const id of ['turboBar2']) { const el = document.getElementById(id); for (let i = 0; i < 10; i++) el.appendChild(document.createElement('i')); }
    // a track shared by link?
    const linked = decodeTrackHash(location.hash);
    if (linked) { customTracks = customTracks.filter((t) => t.id !== linked.id); customTracks.push(linked); sel.track = TRACKS.length + customTracks.length - 1; try { localStorage.setItem('stuntskoelle.custom', JSON.stringify(customTracks)); } catch (e) { /* ignore */ } renderMenu(); setTimeout(() => { $('#langerQuote').textContent = '„Ne Link-Streck: ' + linked.name + '. Jemand hät dir wat jebaut. Fahr et, Jung!“'; }, 50); }
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
    if ($('#rotateArt')) SP.carSide(D.CARS[0], $('#rotateArt'));
  }
  window.STUNTS_STATS = () => renderer && { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries };
  window.STUNTS_PROPS = () => scenery ? scenery.props.map((p) => ({ type: p.userData.type, x: p.position.x, y: p.position.y, z: p.position.z, rot: p.rotation.y })) : [];
  window.STUNTS_DEBUG = () => ({ phase, player: player && { pos: player.frame && [player.frame.pos.x, player.frame.pos.y, player.frame.pos.z], fwd: player.frame && [player.frame.fwd.x, player.frame.fwd.z], s: player.s, lat: player.lat, v: player.v, lap: player.lap, air: player.air, crashed: player.crashed, finished: player.finished, turbo: player.turbo, damage: player.damage }, racers: racers.length, raceTime, trackLen: track && track.length, standings: racers.length ? standings().map((r) => r.name) : [] });
  window.STUNTS_SET_CAM = (m) => { camMode = m; };
  window.STUNTS_SCENE = () => scene;
  window.STUNTS_RAZZIA = () => { razzia = 8; razziaBlink = 0; say(tuenn, pick(tuenn.razzia), 3500); };
  window.STUNTS_PROMILLE = () => { promille = 7; say(tuenn, pick(tuenn.promille), 3200); };
  window.STUNTS_EXTRAS = () => ({ tilt: { mode: tilt.mode, raw: tilt.raw, zero: tilt.zero, val: tilt.val, steer: input.steer }, razzia, promille, koelschLap, deckel, koelsch, knoellchen, kripo: !!kripo, kripoSeen, kripoCaught, wette: wette && { rival: wette.rival.name, n: wette.n, done: wette.done, won: wette.won }, taken: pickups.filter((p) => p.taken).length, pickups: pickups.length, crashes, cup: { on: cup.on, i: cup.i, pts: cup.pts } });
  window.STUNTS_FRAME = (sPos) => { const f = TB.frameAt(track, sPos); return { p: [f.p.x, f.p.y, f.p.z], T: [f.T.x, f.T.y, f.T.z], N: [f.N.x, f.N.y, f.N.z], len: track.length, kind: f.kind }; };
  window.STUNTS_FIELD = () => racers.map((r) => ({ name: r.name, s: r.s, lap: r.lap, v: r.v, crashed: r.crashed > 0, air: r.air, ai: r.isAI, finished: !!r.finished, damage: r.damage }));
  window.STUNTS_NEAR = (r) => { const out = []; const pp = player.frame.pos; scene.traverse((o) => { if (!o.isMesh) return; const wp = new THREE.Vector3(); o.getWorldPosition(wp); if (wp.distanceTo(pp) < r) { const m = Array.isArray(o.material) ? o.material[0] : o.material; out.push({ d: Math.round(wp.distanceTo(pp)), col: m.color ? m.color.getHexString() : '-', parent: o.parent && o.parent.userData && o.parent.userData.type, vc: !!m.vertexColors, n: o.geometry.attributes.position.count }); } }); return out.slice(0, 40); };
  window.STUNTS_FINISH = () => { for (const r of [player, player2]) if (r) { r.lap = trackDef.laps; r.s = track.length - 3; r.v = 30; } };
  if (typeof THREE === 'undefined') {
    document.body.innerHTML = '<div style="color:#fff;font:20px sans-serif;padding:40px">Three.js konnte nicht geladen werden. Dä Lange sagt: Internet anmachen, Jung.</div>';
  } else {
    init();
  }
})();
