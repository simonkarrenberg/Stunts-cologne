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
  let radioTimer = 45, storyCool = 0, eventTimer = 30, blitzers = [], knoellchen = 0, koelsch = 0, flashTimer = 0;
  let stories = [], telefon = { ready: true, active: 0, used: 0 };
  let player2 = null, twoPlayer = false, camera2 = null;
  // Chicago am Rhein extras: beer-mat score, Kölsch pickups, the Kripo chase, the doorman's bet, the Kölsch-Cup
  let deckel = 0, pickups = [], kripo = null, kripoT = 0, kripoHitCool = 0, sirenT = 0, wette = null, crashes = 0, waterCrashes = 0, kripoCaught = false, kripoSeen = false, lastLapSeen = 1, pickT = 0;
  const cup = { on: false, i: 0, pts: {} }; const CUP_PTS = [12, 10, 8, 6, 5, 4, 3, 2, 1, 1];
  const KRIPO = { name: 'Kripo Kölle', emoji: '🚓' };
  let razzia = 0, razziaBlink = 0, promille = 0, koelschLap = 0, lastHeadline = '', lastPlace = 0;
  // Klüngel-Auftrag (courier job for dä Lange), the DÄ SCHNELLE front page photo and the arcade attract mode
  let demoPrevCam = 0, daily = null, introT = 0, hornCool = 0, newOrden = [];
  // Botengang missions (on foot and back in the car with the Kripo behind) and the Karriere (Nachtschicht)
  let mission = null, missionMode = false, missionDef = null, careerChapter = null, walkT = 0;
  let auftrag = null, auftragT = 40, auftragDone = 0, auftragFail = 0, shotWanted = false, lastShot = null, demo = false, demoT = 0, idleT = 0;
  const views = [{ pos: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), look: new THREE.Vector3(), mode: 0, tv: null, tvTimer: 0 }, { pos: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), look: new THREE.Vector3(), mode: 0, tv: null, tvTimer: 0 }];
  const input2 = { gas: 0, brake: 0, steer: 0, turbo: 0 };
  const rec = { frames: [], t: [], acc: 0, on: false };          // replay recorder
  const replay = { on: false, time: 0, speed: 1, paused: false, camIdx: -1, cams: [], mode: 0 };
  let ghost = null, ghostData = null;                              // best-lap ghost
  const voice = { on: true, ready: false, de: null, list: [] };
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
    try { speechSynthesis.getVoices(); } catch (e) { /* ignore */ }
    // every German voice the device has; a deep male one first (the doorman), the chosen one is remembered
    const rank = (v) => (/de[-_]DE/i.test(v.lang) ? 0 : 5) + (/Markus|Yannick|Martin|Conrad|Stefan|Klaus|Hans|Michael|Viktor|Kevin|Reed|Male|Mann/i.test(v.name) ? 0 : 2) + (/Google|Microsoft|Siri|Premium|Enhanced|Natural/i.test(v.name) ? 0 : 1);
    const pickVoice = () => {
      voice.list = speechSynthesis.getVoices().filter((v) => /^de/i.test(v.lang)).sort((a, b) => rank(a) - rank(b));
      let want = null; try { want = localStorage.getItem('stuntskoelle.voiceName'); } catch (e) { /* ignore */ }
      voice.de = (want && voice.list.find((v) => v.name === want)) || voice.list[0] || null; voice.ready = true; updateVoiceUI();
    };
    pickVoice(); speechSynthesis.addEventListener('voiceschanged', pickVoice);
    try { voice.on = localStorage.getItem('stuntskoelle.voice') !== 'off'; } catch (e) { /* ignore */ }
    updateVoiceUI();
  }
  function nextVoice() { // cycle through the device's German voices; the sample line tells you how Kölsch it sounds
    if (!voice.list || voice.list.length < 2) return;
    const i = voice.list.indexOf(voice.de); voice.de = voice.list[(i + 1) % voice.list.length];
    try { localStorage.setItem('stuntskoelle.voiceName', voice.de.name); } catch (e) { /* ignore */ }
    updateVoiceUI(); if (!voice.on) toggleVoice(); else speak(pick(['Ich bin dä Lange. Kölle, Jung, dat is e Jeföhl.', 'Et hätt noch immer jot jejange. Sagt der Türsteher.', 'Drink doch ene met, un dann fahr.']), 0.55, 0.92, true, 'Dä Lange');
  }
  // the browser's German voices speak Hochdeutsch; a phonetic pass pushes them towards the Veedel:
  // isch statt ich, -isch statt -ig, dat/wat/et, a softer g, no clipped endings
  function koelschify(t) {
    const w = (from, to) => { t = t.replace(new RegExp('\\b' + from + '\\b', 'g'), to); t = t.replace(new RegExp('\\b' + from[0].toUpperCase() + from.slice(1) + '\\b', 'g'), to[0].toUpperCase() + to.slice(1)); };
    w('ich', 'isch'); w('dich', 'disch'); w('mich', 'misch'); w('sich', 'sisch'); w('nicht', 'nit'); w('nichts', 'nix'); w('das', 'dat'); w('was', 'wat'); w('es', 'et'); w('ist', 'is'); w('auch', 'och'); w('gut', 'jot'); w('gibt', 'jibt'); w('geht', 'jeht'); w('gegen', 'jäjen'); w('ganz', 'janz'); w('jetzt', 'jetz'); w('etwas', 'jet'); w('kein', 'kei'); w('einen', 'ene'); w('einem', 'enem'); w('Straße', 'Strooß'); w('groß', 'jroß'); w('gerade', 'jrad');
    t = t.replace(/lich\b/g, 'lisch').replace(/ig\b/g, 'isch').replace(/ige\b/g, 'ije').replace(/\bge([a-zäöü])/g, 'je$1').replace(/\bGe([a-zäöü])/g, 'Je$1');
    t = t.replace(/Jung\b(?![,.!?])/g, 'Jung,'); // the tiny pause after "Jung" is how a doorman talks
    return t.replace(/,,/g, ',');
  }
  // menu buttons carry a pixel icon (canvas) in front of their text; the icon survives label changes
  function labelBtn(btn, text) { if (!btn) return; const name = btn.dataset.icon; btn.textContent = ''; if (name && SP.icon) { const c = document.createElement('canvas'); c.className = 'pxi'; SP.icon(name, c, 1); btn.appendChild(c); } btn.appendChild(document.createTextNode(text)); }
  function updateVoiceUI() {
    labelBtn($('#voiceBtn'), ('speechSynthesis' in window) ? (voice.on ? 'STIMME: AN' : 'STIMME: AUS') : 'STIMME: –');
    const b = $('#voicePickBtn'); if (!b) return; const many = voice.list && voice.list.length > 1; b.hidden = !many;
    if (many) labelBtn(b, 'SPRECHER: ' + voice.de.name.replace(/^(Microsoft|Google)\s*/i, '').replace(/\s*\(.*$/, '').slice(0, 14).toUpperCase());
  }
  function toggleVoice() { voice.on = !voice.on; try { localStorage.setItem('stuntskoelle.voice', voice.on ? 'on' : 'off'); } catch (e) { /* ignore */ } updateVoiceUI(); if (voice.on) speak('Ich bin dä Lange. Jetz hörs du mich och. Dat vierte Kölsch wor jut.', 0.55, 0.95, true, 'Dä Lange'); else if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  // dä Lange is a man in his fifties with a few Kölsch in him: the s slurs to sch, vowels get long, there is
  // the odd "ähh" and "ne?", and every sentence comes out with its own wobble in pitch and speed
  const DRUNK = { 'Dä Lange': 1, 'Köbes Hermann': 0.6, 'Klüngel Tom': 0.4 };
  function drunkify(t, k) {
    const r = () => Math.random();
    t = t.replace(/(^|[^csS])s(?=[aeiouäöü])/g, '$1sch').replace(/(^|[^csS])S(?=[aeiouäöü])/g, '$1Sch'); // isch schach dir wat
    t = t.replace(/\b([A-Za-zÄÖÜäöüß]{4,})\b/g, (w) => (r() < 0.22 * k ? w.replace(/([aouäöüe])/i, '$1$1$1') : w)); // lang gezogen
    t = t.replace(/([.!?])(\s+)(?=[A-ZÄÖÜ])/g, (m, p, sp) => p + sp + (r() < 0.3 * k ? pick(['Ähh, ', 'Also, ', 'Wat wollt isch, ähh, ', 'Hicks. ']) : ''));
    t = t.replace(/([^.!?]{12,})\.(?=\s|$)/g, (m, a) => (r() < 0.25 * k ? a + ', ne?' : m));
    if (r() < 0.35 * k) t = pick(['Ähh, ', 'Also, ', 'Höhö. ', 'Pass op, ']) + t;
    return t;
  }
  function speak(text, pitch, rate, force, who) {
    if (!voice.on || !voice.ready || audio.muted) return;
    try {
      if (speechSynthesis.speaking && !force) return;
      if (force) speechSynthesis.cancel();
      const k = DRUNK[who] || 0; let clean = koelschify(text.replace(/[„“…]/g, '').replace(/–/g, ','));
      if (k) clean = drunkify(clean, k);
      const parts = k ? clean.split(/(?<=[.!?])\s+/).filter((x) => x.trim()) : [clean];
      for (const part of parts) {
        const u = new SpeechSynthesisUtterance(part);
        u.lang = voice.de ? voice.de.lang : 'de-DE'; if (voice.de) u.voice = voice.de;
        const p0 = pitch == null ? 0.6 : pitch, r0 = (rate == null ? 0.95 : rate) * 0.94; // a shade slower: Kölsch is sung, not read
        u.pitch = Math.max(0.1, p0 - 0.08 * k + (Math.random() - 0.5) * 0.14 * k); u.rate = Math.max(0.5, r0 - 0.12 * k + (Math.random() - 0.5) * 0.16 * k); u.volume = 0.9;
        speechSynthesis.speak(u);
      }
    } catch (e) { /* ignore */ }
  }
  const VOICES = { 'Dä Lange': [0.5, 0.88], 'Kripo Kölle': [0.7, 0.98], 'Radio Kölle': [1.1, 1.15], 'Blitzer Kölle': [0.9, 1.05], 'Tünnes': [0.8, 1.05], 'Schäl': [0.7, 1.0], 'Heinzel': [1.5, 1.15], 'Fräulein Anna': [1.4, 1.05], 'Klüngel Tom': [0.75, 0.9], 'Taxi Willi': [0.85, 1.0], 'Köbes Hermann': [0.65, 0.95], 'Tango': [1.05, 1.0], 'Täsch': [0.55, 0.9] };

  // ---------------- messages ----------------
  // flavour messages are throttled while driving: never over a message that is still showing, and at least
  // 12 s apart. sayMust() is for things the player needs to know (laps, Kripo, Razzia, Wette, Telefon).
  let quiet = 0;
  function sayMust(who, text, ms) { return say(who, text, ms, true); }
  function say(who, text, ms, must) {
    if (phase === 'race' && !must && (msgTimer > 0 || quiet > 0)) return false;
    if (phase === 'race') quiet = 12;
    if (phase === 'race' || phase === 'countdown' || phase === 'intro' || phase === 'finished') { const v = VOICES[who.name] || [0.8, 1]; speak(text, v[0], v[1], who === tuenn, who.name); }
    $('#msgWho').textContent = `${who.emoji || '🏁'} ${who.name}`;
    $('#msgText').textContent = text;
    $('#msg').classList.add('show');
    msgTimer = (ms || 3500) / 1000;
  }

  // ---------------- racers ----------------
  function routeFor(r) { return r && r.shortcut >= 0 ? track.shortcuts[r.shortcut] : null; }
  function racerFrame(r, s) {
    const route = routeFor(r); s = s == null ? r.s : s;
    if (route && s >= route.startS && s <= route.endS) return window.Shortcuts.frameAt(route, (s - route.startS) * route.length / (route.endS - route.startS));
    return TB.frameAt(track, s);
  }
  function sameRoad(a, b) { return (a.shortcut == null ? -1 : a.shortcut) === (b.shortcut == null ? -1 : b.shortcut); }
  function advanceRacer(r, distance) {
    let route = routeFor(r);
    if (!route && distance > 0 && !r.isAI && !r.air && !r.finished) {
      route = track.shortcuts.find((q) => r.s <= q.startS && r.s + distance >= q.startS && r.lat * q.side >= 1.6 && Math.abs(r.lat) <= q.halfWidth - 0.8);
      if (route) { distance -= route.startS - r.s; r.s = route.startS; r.shortcut = route.index; r.safeS = route.resetS + 18; } // respawn() subtracts 18 m
    }
    if (!route) { r.s += distance; return; }
    const scale = (route.endS - route.startS) / route.length;
    const next = r.s + distance * scale;
    if (next >= route.endS || next < route.startS) {
      const forward = next >= route.endS;
      r.s = (forward ? route.endS : route.startS) + (next - (forward ? route.endS : route.startS)) / scale;
      r.shortcut = -1; r.prevRoadVy = 0;
      const key = r.lap + ':' + route.id;
      if (forward && r === player && !r.shortcutsDone.has(key)) {
        r.shortcutsDone.add(key); addDeckel(1); bumpStat('shortcuts');
        say(tuenn, `${route.name}: ${Math.round(route.saved)} Meter jespart. Dat steht nit im Stadtplan, Jung.`, 2600);
      }
    } else r.s = next;
  }
  function makeRacer(carDef, mesh, driver, isAI) {
    return {
      car: carDef, mesh, driver, isAI, name: isAI ? driver.name : 'DU',
      s: 0, lat: 0, v: 0, air: false, y: 0, vy: 0, lap: 1, safeS: 0, crashed: 0,
      finished: false, finishTime: null, laps: [], lapStart: 0, prevRoadVy: 0, wasInLoop: false,
      steerVis: 0, aiTimer: 0, aiSlow: 1, jumpStartS: 0, bestLap: null, wobblePhase: Math.random() * 10, laneBias: 0,
      turbo: 0.5, turboOn: false, damage: 0, skill: driver.skill, wobble: driver.wobble,
      shortcut: -1, shortcutsDone: new Set()
    };
  }
  function respawn(r) { r.shortcut = -1; r.s = ((r.safeS - 18) % track.length + track.length) % track.length; r.lat = 0; r.v = 0; r.air = false; r.vy = 0; r.crashed = 0; r.prevRoadVy = 0; }
  function crash(r, kind) {
    if (r === player && auftrag && auftrag.stage === 'carry') failAuftrag('lost');
    if (r.crashed > 0) return;
    r.lastCrash = kind; if (r === player) { crashes++; if (kind === 'water') { waterCrashes++; bumpStat('water'); } if (kind === 'roof') bumpStat('roofs'); }
    r.crashed = 2.2; r.v = 0; r.air = false; r.turboOn = false;
    r.damage = Math.min(1, r.damage + 0.25);
    if (!r.isAI) {
      crashSound(); shake = 1;
      const quotes = kind === 'water' ? tuenn.water : kind === 'loop' ? tuenn.loopFall : kind === 'roof' ? tuenn.roof : tuenn.crash;
      if (r.damage >= 1) { say(tuenn, pick(tuenn.damage), 3000); r.damage = 0; r.crashed = 3.5; }
      else say(tuenn, pick(quotes), 3000);
      if (Math.random() < 0.6) setTimeout(() => { if (phase === 'race') { const rival = pick(racers.filter((x) => x.isAI)); if (rival && rival.driver.lines.taunt) say(rival.driver, pick(rival.driver.lines.taunt), 2400); } }, 3200);
    }
  }

  function updateRacer(r, dt, ctl) {
    const car = r.car;
    if (r.crashed > 0) { r.crashed -= dt; if (r.crashed <= 0) respawn(r); return; }
    const f = racerFrame(r);
    const roadWidth = routeFor(r) ? routeFor(r).halfWidth - 0.6 : ROAD_W + 1.6;
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
      if (Math.abs(r.lat) > roadWidth) {
        if (r.isAI) { r.lat = clamp(r.lat, -ROAD_W, ROAD_W); r.v *= 0.6; }
        else { crash(r, 'off'); return; }
      }
      if (f.kind === 'loop') { r.wasInLoop = true; if (f.N.y < 0.2 && r.v < 21) { crash(r, 'loop'); return; } }
      else if (r.wasInLoop) { r.wasInLoop = false; if (!r.isAI) say(tuenn, pick(tuenn.loopOk), 2500); if (r === player) { addDeckel(1); bumpStat('loops'); } }
      advanceRacer(r, r.v * dt);
      const f2 = racerFrame(r);
      if (f2.kind === 'gap' && f.kind !== 'gap') {
        const a0 = f.rampAngle; r.air = true; r.y = Math.max(f.p.y, track.samples[f.index].p.y) + 0.1; r.vy = r.v * Math.sin(a0) + 0.5; // launch from the ramp lip, not from the lerp down into the gap r.v = Math.max(r.v * Math.cos(a0), 4); r.jumpStartS = r.s;
      } else if (f2.kind === 'gap') { r.air = true; r.y = roadY; r.vy = 0; }
      else {
        const roadVy = r.v * f2.T.y;
        if (r.prevRoadVy - roadVy > G * dt * 1.3 && r.v > 25 && f2.kind !== 'loop') { r.air = true; r.y = f2.p.y; r.vy = r.prevRoadVy; }
        r.prevRoadVy = roadVy;
      }
      if (!r.air && !routeFor(r) && Math.abs(r.lat) < ROAD_W && ['straight', 'bridge', 'tunnel', 'curve', 'hill', 'dip'].includes(f.kind) && f.N.y > 0.9) r.safeS = r.s;
    } else {
      advanceRacer(r, r.v * dt);
      r.lat += ctl.steer * car.steer * 1.5 * dt;
      const f2 = racerFrame(r);
      const landing = f2.kind !== 'gap' && f2.kind !== 'ramp';
      r.y += r.vy * dt; r.vy -= G * (landing ? 2.6 : 1) * dt;
      const ry = f2.p.y;
      if (f2.kind === 'gap') { if (r.y < W.WATER_Y + 0.4) { crash(r, 'water'); return; } if (f2.over && r.y < f2.over) { crash(r, 'roof'); return; } }
      else if (r.y <= ry + 0.12) {
        r.air = false; r.y = ry; r.prevRoadVy = r.v * f2.T.y;
        if (Math.abs(r.lat) > roadWidth) { if (r.isAI) r.lat = clamp(r.lat, -ROAD_W, ROAD_W); else { crash(r, 'off'); return; } }
        if (r.vy < -22) { r.v *= 0.55; r.damage = Math.min(1, r.damage + 0.08); } else if (r.vy < -14) r.v *= 0.8;
        if (!r.isAI && r.s - r.jumpStartS > 20 && r.jumpStartS > 0) { say(tuenn, pick(tuenn.jumpOk), 2500); r.jumpStartS = 0; if (r === player) { addDeckel(1); bumpStat('jumps'); } }
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
      else if (!r.isAI) { sayMust(tuenn, tuenn.lap[Math.min(tuenn.lap.length - 1, r.lap - 2 + (r.lap === trackDef.laps ? 1 : 0))], 2500); if (r === player) { telefon.ready = true; $('#hudTel').textContent = 'K = ANRUFEN'; } }
    }
    r.steerVis += (ctl.steer - r.steerVis) * Math.min(1, dt * 10);
  }

  function aiControl(r, dt) {
    if (routeFor(r)) {
      const f = racerFrame(r), target = Math.min(r.car.top * 0.8, Math.sqrt(24 * r.car.grip / Math.max(0.001, Math.abs(f.curv))) * 0.85);
      return { gas: r.v < target ? 1 : 0, brake: r.v > target + 2 ? 0.7 : 0, steer: clamp(-r.lat * 0.6, -1, 1), turbo: 0 };
    }
    r.aiTimer -= dt;
    if (r.aiTimer <= 0) { r.aiTimer = 4 + Math.random() * 8; r.aiSlow = Math.random() < r.wobble * 0.6 ? 0.55 + Math.random() * 0.3 : 1; r.laneBias = (Math.random() - 0.5) * 6; }
    const i = Math.floor(((r.s % track.length) + track.length) % track.length / track.ds) % track.samples.length;
    let band = 1;
    if (r.isAI && player && !player.finished && phase === 'race') { const L = track.length; const gap = (r.s + r.lap * L) - (player.s + player.lap * L); const k = [0.22, 0.14, 0.07, 0.025][PLAYABLE[sel.driver].diffN || 0]; band = clamp(1 - gap / 300 * k, 1 - k * 0.9, 1 + k * 0.5); }
    const target = Math.min(r.car.top * r.skill * (r.isCop ? 1.05 : 0.95), track.safe[i] * (0.86 + r.skill * 0.2)) * (r.aiSlow < 1 ? r.aiSlow : 1) * (telefon.active > 0 && r !== player2 ? 0.7 : 1) * (razzia > 0 && r !== player2 ? 0.62 : 1) * band;
    let gas = r.v < target ? 1 : 0, brake = r.v > target + 3 ? 0.8 : 0;
    let wantLat = Math.sin(raceTime * 0.7 + r.wobblePhase) * r.wobble * 2 + r.laneBias * 0.5;
    // avoid the car ahead
    for (const o of racers) {
      if (o === r || o.crashed > 0 || !sameRoad(o, r)) continue;
      let ds = o.s - r.s; const L = track.length; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
      if (ds > 0 && ds < 16 && Math.abs(o.lat - r.lat) < 3) { wantLat = r.lat + (r.lat > o.lat ? 3 : -3); if (ds < 7 && o.v < r.v && track.samples[i].kind !== 'ramp') gas = 0.3; } // never lift on a ramp: too slow means the roof
    }
    if (r.yieldT > 0) { r.yieldT -= dt; wantLat = r.lat >= 0 ? ROAD_W - 1.5 : -ROAD_W + 1.5; gas = Math.min(gas, 0.6); }
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
    if (a.crashed > 0 || b.crashed > 0 || a.air !== b.air || !sameRoad(a, b)) return;
    let ds = a.s - b.s; const L = track.length;
    if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
    const route = routeFor(a);
    if (route) ds *= route.length / (route.endS - route.startS);
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
    const f = racerFrame(r);
    const T = new THREE.Vector3(f.T.x, f.T.y, f.T.z), N = new THREE.Vector3(f.N.x, f.N.y, f.N.z), B = new THREE.Vector3(f.B.x, f.B.y, f.B.z);
    const pos = new THREE.Vector3(f.p.x, f.p.y, f.p.z).addScaledVector(B, r.lat).addScaledVector(N, f.surfaceOffset || 0.1);
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
      const here = racerFrame(r), back = racerFrame(r, r.s - dist);
      if (here.kind === 'loop' || back.kind === 'loop') { // inside a loop or cork screw: follow the ribbon, a straight tangent would put the camera through the loop's skin
        target = new THREE.Vector3(back.p.x, back.p.y, back.p.z).addScaledVector(new THREE.Vector3(back.N.x, back.N.y, back.N.z), h * 0.8);
      } else target = fr.pos.clone().addScaledVector(T, -dist).addScaledVector(N, h);
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
    if (mission && mission.onFoot && mission.walker) { const w = mission.walker; const fwd = new THREE.Vector3(Math.sin(w.rotation.y), 0, Math.cos(w.rotation.y)); views[0].pos.lerp(w.position.clone().addScaledVector(fwd, -4.2).add(new THREE.Vector3(0, 3.6, 0)), Math.min(1, dt * 6)); views[0].look.lerp(w.position.clone().addScaledVector(fwd, 3).add(new THREE.Vector3(0, 1.3, 0)), Math.min(1, dt * 10)); views[0].up.set(0, 1, 0); camera.position.copy(views[0].pos); camera.up.copy(views[0].up); camera.lookAt(views[0].look); if (player.mesh) player.mesh.visible = true; return; }
    if (phase === 'intro') { // flyover: from high above the first bend down into the chase position behind the grid
      const k = Math.min(1, introT / 3.8), e = k * k * (3 - 2 * k); const fr = player.frame;
      let fs = Math.min(170, track.length * 0.3); { const fk = TB.frameAt(track, fs).kind; if (fk === 'loop' || fk === 'ramp' || fk === 'gap') fs = 90; } const f = TB.frameAt(track, fs); const far = new THREE.Vector3(f.p.x, f.p.y, f.p.z).addScaledVector(new THREE.Vector3(f.N.x, f.N.y, f.N.z), 34).addScaledVector(new THREE.Vector3(f.B.x, f.B.y, f.B.z), 26);
      const near = fr.pos.clone().addScaledVector(fr.fwd, -11).addScaledVector(fr.up, 4.2);
      views[0].pos.copy(far).lerp(near, e); views[0].look.copy(fr.pos).addScaledVector(fr.fwd, 6 * e); views[0].up.set(0, 1, 0);
      camera.position.copy(views[0].pos); camera.up.copy(views[0].up); camera.lookAt(views[0].look);
    } else if (phase === 'replay') { replayCamera(views[0], player, dt); }
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
    x.strokeStyle = '#83e7b3'; x.lineWidth = 2;
    for (const route of track.shortcuts) { x.beginPath(); route.samples.forEach((f, i) => { const px = c.width - (f.p.x * miniScale + miniOff.x), py = c.height - (f.p.z * miniScale + miniOff.z); if (i) x.lineTo(px, py); else x.moveTo(px, py); }); x.stroke(); }
    const dot = (r, col, rad) => { const f = racerFrame(r); x.beginPath(); x.arc(c.width - (f.p.x * miniScale + miniOff.x), c.height - (f.p.z * miniScale + miniOff.z), rad, 0, Math.PI * 2); x.fillStyle = col; x.fill(); x.strokeStyle = '#000'; x.lineWidth = 1; x.stroke(); };
    for (const r of racers) if (r.isAI) dot(r, '#ffd400', 2.5);
    if (kripo) dot(kripo, '#2060ff', 3.5);
    dot(player, '#ff2a2a', 4);
    if (player2) dot(player2, '#4fd6ff', 4);
  }

  // ---------------- HUD ----------------
  function progress(r) { return (r.finished ? 1e6 - r.finishTime : 0) + r.lap * track.length + r.s; }
  function standings() { return racers.slice().sort((a, b) => progress(b) - progress(a)); }
  function updateHUD() {
    const activeRoute = routeFor(player);
    const aheadRoute = !activeRoute && track.shortcuts.find((r) => r.startS - player.s > 0 && r.startS - player.s < 85);
    const shortcutHint = $('#hudShortcut'); shortcutHint.hidden = !activeRoute && (!aheadRoute || (mission && mission.onFoot));
    if (activeRoute) shortcutHint.textContent = `${activeRoute.name.toUpperCase()} · SCHMALE GASSE · ${Math.round(activeRoute.length * (activeRoute.endS - player.s) / (activeRoute.endS - activeRoute.startS))} M`;
    else if (aheadRoute) shortcutHint.textContent = `${aheadRoute.side < 0 ? '← LINKS' : 'RECHTS →'} EINORDNEN · ${aheadRoute.name.toUpperCase()} · ${Math.round(aheadRoute.startS - player.s)} M`;
    $('#speed').textContent = String(Math.round(Math.abs(player.v) * 3.6)).padStart(3, '0');
    $('#hudRunde').textContent = `${player.lap} / ${trackDef.laps}`;
    $('#hudZeit').textContent = fmtTime(raceTime);
    $('#hudBeste').textContent = fmtTime(player.bestLap);
    const pos = standings().indexOf(player) + 1;
    $('#hudPos').textContent = `${pos} / ${racers.length}`;
    $('#hudKn').textContent = knoellchen ? `${knoellchen} × 60 €` : '–';
    $('#hudDeckel').textContent = deckel ? strokes(deckel) : '–';
    $('#hudWette').textContent = wette ? (wette.done ? (wette.won ? 'JEWONNE' : 'VERLORE') : `${wette.n}🍺 › ${wette.rival.name.toUpperCase().split(' ').pop()}`) : '–';
    if (mission) $('#hudAuftrag').textContent = missionHud(); else $('#hudAuftrag').textContent = auftrag ? (auftrag.stage === 'pickup' ? `HOLEN: ${Math.max(0, Math.round(auftrag.timer))} S` : `› ${auftrag.where} ${Math.max(0, Math.round(auftrag.timer))} S`) : auftragDone ? `${auftragDone} ERLEDIGT` : '–';
    if (kripo) $('#hudKripo').textContent = 'HINTER DIR!'; else $('#hudKripo').textContent = kripoSeen ? 'ABJEHÄNGT' : knoellchen >= 2 ? 'NOCH 1 BLITZ…' : '–';
    if (player2) { $('#speed2').textContent = String(Math.round(Math.abs(player2.v) * 3.6)).padStart(3, '0'); $('#pos2').textContent = `POS ${standings().indexOf(player2) + 1}/${racers.length} · RUNDE ${player2.lap}/${trackDef.laps}`; const t2 = $('#turboBar2').children; for (let i = 0; i < t2.length; i++) t2[i].className = (i / t2.length) < player2.turbo ? 'on' : ''; }
    if (lastPos !== null && lastPos !== pos && phase === 'race' && raceTime > 3 && msgTimer <= 0) {
      const ais = racers.filter((r) => r.isAI && !r.isCop); if (!ais.length) return; const byTuenn = Math.random() < 0.5; const other = pick(ais).driver;
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
  function allTracks() { return TRACKS.concat(daily ? [daily] : [], customTracks); }
  function activeTrackDef() { return allTracks()[sel.track] || TRACKS[0]; }
  function buildScene(def) {
    trackDef = def || activeTrackDef();
    theme = trackDef.theme;
    track = TB.buildTrack(trackDef);
    track.shortcuts = window.Shortcuts.buildRoutes(track);
    if (scene) scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.sky);
    // time of day: night (stars, lamps), dusk (blue hour: lit windows, orange horizon), dawn (low warm sun, long shadows), day
    scene.fog = new THREE.Fog(theme.fog, theme.dusk ? 150 : theme.night ? 90 : theme.dawn ? 180 : 220, theme.dusk ? 900 : theme.night ? 520 : theme.dawn ? 1100 : 1300);
    hemi = new THREE.HemisphereLight(theme.dusk ? 0x5a6aa0 : theme.night ? 0x8090c0 : theme.dawn ? 0xb0a0c0 : theme.sky, theme.ground, theme.dusk ? 0.55 : theme.night ? 0.7 : 0.5); scene.add(hemi);
    sunLight = new THREE.DirectionalLight(theme.sun, theme.dusk ? 0.35 : theme.night ? 0.45 : theme.dawn ? 0.75 : 0.8); sunLight.position.set(theme.dawn ? 320 : theme.dusk ? -260 : 120, theme.dawn ? 70 : theme.dusk ? 55 : 200, theme.dawn ? -40 : 80); scene.add(sunLight);
    if (renderer.shadowMap.enabled) { sunLight.castShadow = true; sunLight.shadow.mapSize.set(2048, 2048); const sc = sunLight.shadow.camera; sc.left = -170; sc.right = 170; sc.top = 170; sc.bottom = -170; sc.near = 10; sc.far = 700; sunLight.shadow.bias = -0.0008; sunLight.shadow.normalBias = 0.6; scene.add(sunLight.target); }
    scene.add(new THREE.AmbientLight(theme.dusk ? 0x2a3060 : theme.night ? 0x223055 : theme.dawn ? 0x504050 : 0x404050, theme.dusk ? 0.55 : theme.night ? 0.5 : theme.dawn ? 0.3 : 0.25));
    if (theme.night) { carLight = new THREE.PointLight(0xfff2cc, 2.0, 90); scene.add(carLight); } else carLight = null;
    // sky reflections for paint, chrome and glass
    if (window.Cars) { try { if (!pmrem) pmrem = new THREE.PMREMGenerator(renderer); if (envTex) envTex.dispose(); envTex = pmrem.fromEquirectangular(window.Pixel.T.sky(theme)).texture; window.Cars.setEnv(envTex); } catch (e) { console.warn('env map', e); } }
    road = W.buildRoad(track, theme); scene.add(road);
    road.add(W.buildShortcutRoads(track, theme));
    scenery = W.buildScenery(track, theme); scene.add(scenery.group);
    confetti = theme.confetti ? W.buildConfetti() : theme.wet ? W.buildConfetti({ rain: true }) : null; if (confetti) scene.add(confetti);
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
    const others = missionMode ? [] : D.DRIVERS.filter((d) => d !== me && !(player2 && d === player2.driver)).slice(0, player2 ? 8 : 9); // a field of ten (none on a Botengang)
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
    knoellchen = 0; koelsch = 0; radioTimer = 45; storyCool = 0; eventTimer = 30;
    const idx = TRACKS.indexOf(trackDef);
    $('#hudTrack').textContent = careerChapter != null ? `KAPITEL ${careerChapter + 1}: ${tuenn.career[careerChapter].title} · ${missionMode ? 'BOTENGANG' : 'ZIEL: ' + goalText(tuenn.career[careerChapter].goal)}` : missionMode ? `BOTENGANG · ${trackDef.name.toUpperCase()}` : `${cup.on ? 'CUP ' + (cup.i + 1) + '/' + TRACKS.length + ' · ' : idx >= 0 ? idx + 1 + '. ' : ''}${trackDef.name.toUpperCase()} (${(trackDef.tag || 'BAUKASTEN')})`;
    deckel = 0; kripo = null; kripoSeen = false; kripoCaught = false; crashes = 0; waterCrashes = 0; wette = null; lastLapSeen = 1; kripoHitCool = 0; razzia = 0; promille = 0; koelschLap = 0; $('#flash').style.background = ''; buildPickups();
    endAuftrag(); auftragT = window.STUNTS_AUFTRAG ? 6 : 30 + Math.random() * 25; auftragDone = 0; auftragFail = 0; lastShot = null;
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
  function startRace(def, after) { // the scenery build blocks for a moment: show the doorman first, then build
    audioInit(); if (phase === 'loading') return; phase = 'loading';
    const ov = $('#loading'); ov.hidden = false; $('#loadingText').textContent = pick(tuenn.loading || ['Dä Lange kuckt dich an…']); $('#menu').hidden = true; $('#results').hidden = true;
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => { try { startRaceNow(def); if (after) after(); } finally { ov.hidden = true; } }, 20)));
  }
  function startRaceNow(def) {
    buildScene(def);
    raceTime = 0; countdown = 4.2; phase = 'intro'; introT = 0; hornCool = 0; newOrden = []; perf.frames = 0;
    { const c = $('#introCard'); c.hidden = false; c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; $('#introName').textContent = trackDef.name.toUpperCase(); $('#introSub').textContent = missionMode ? 'BOTENGANG · ABHOLEN, ABLIEFERN, NIT ERWISCHE LASSE' + (careerChapter != null ? ` · KAPITEL ${careerChapter + 1}: ${tuenn.career[careerChapter].title}` : '') : `${(trackDef.district || 'Klüngel-Baukasten').toUpperCase()} · ${trackDef.laps} RUNDEN · ${(track.length * trackDef.laps / 1000).toFixed(1)} KM` + (careerChapter != null ? ` · KAPITEL ${careerChapter + 1}: ${tuenn.career[careerChapter].title} · ZIEL: ${goalText(tuenn.career[careerChapter].goal)}` : ''); } perf.since = 0; perf.wait = 3;
    musicPlay();
    $('#menu').hidden = true; $('#hud').hidden = false; $('#results').hidden = true; $('#editor').hidden = true; $('#touch').hidden = !isTouch;
    document.body.classList.add('racing'); document.body.classList.remove('resultsOpen', 'replaying');
    const hour = new Date().getHours(); const dayLines = tuenn.daytime[hour >= 22 || hour < 5 ? 'night' : hour < 10 ? 'morning' : hour < 17 ? 'day' : 'evening'];
    const sceneKey = theme.dawn ? 'dawn' : theme.dusk ? 'dusk' : theme.night ? 'night' : null;
    if (theme.intro) setTimeout(() => { if (phase === 'race' || phase === 'countdown') sayMust(tuenn, pick(theme.intro), 4200); }, 7000);
    else if (sceneKey && tuenn.scene && tuenn.scene[sceneKey]) setTimeout(() => { if (phase === 'race' || phase === 'countdown') sayMust(tuenn, pick(tuenn.scene[sceneKey]), 4000); }, 7000);
    sayMust(tuenn, ghostData ? `Ding beste Rund (${fmtTime(ghostData.time)}) fährt als Geist mit. Fang se, Jung!` : (Math.random() < 0.35 ? pick(dayLines).replace('{h}', String(hour)) : Math.random() < 0.5 ? pick(tuenn.door) : pick(tuenn.intro)), 3800);
    $('#hudTel').textContent = 'K = ANRUFEN';
    if (tilt.mode > 0) { tiltListen(); setTimeout(tiltCalibrate, 1500); }
    if (isMobile) { camMode = 0; tvCam = null; }
    setTimeout(() => { const ais = racers.filter((r) => r.isAI && !r.isCop); if (phase !== 'menu' && ais.length) { const d = pick(ais).driver; sayMust(d, pick(d.lines.start), 2500); } }, 3900);
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
    fanfare(won); shotWanted = true;
    if (auftrag) endAuftrag();
    if (kripo) endKripo('finish');
    if (wette && !wette.done) { wette.done = true; wette.won = order.indexOf(wette.rival.r) > order.indexOf(player); if (wette.won) addDeckel(wette.n * 2); else deckel = Math.max(0, deckel - wette.n); }
    const total = deckelTotal(deckel); const rank = deckelRank(total);
    try { const hs = parseInt(localStorage.getItem('stuntskoelle.hiscore') || '0') || 0; if (deckel > hs) localStorage.setItem('stuntskoelle.hiscore', String(deckel)); } catch (e) { /* ignore */ }
    const headline = expressHeadline(place, won, record, order); lastHeadline = headline; lastPlace = place;
    if (knoellchen) bumpStat('knoellchen', knoellchen); if (koelsch) bumpStat('koelsch', koelsch); if (record) bumpStat('records'); if (won && theme.night) bumpStat('nightWins'); if (trackDef.daily) bumpStat('daily'); newOrden = checkOrden();
    if (cup.on) { order.forEach((r, i) => { cup.pts[r.name] = (cup.pts[r.name] || 0) + (CUP_PTS[i] || 0); }); cup.i++; try { localStorage.setItem('stuntskoelle.cup', JSON.stringify(cup)); } catch (e) { /* ignore */ } }
    setTimeout(() => {
      if (phase === 'menu') return; // the attract mode went back to the menu meanwhile
      $('#resTitle').textContent = player2 ? (order.indexOf(player) < order.indexOf(player2) ? `P1 SCHLÄGT P2! PLATZ ${place} GEGEN ${order.indexOf(player2) + 1}.` : `P2 SCHLÄGT P1! PLATZ ${order.indexOf(player2) + 1} GEGEN ${place}.`) : won ? 'JEWONNE! KÖLLE ALAAF!' : place === 2 ? 'ZWEITER. FAST, JUNG.' : `PLATZ ${place}. ET HÄTZ SCHLECHT, ÄVVER ET KÜTT!`;
      const tb = $('#resTable'); tb.innerHTML = '';
      order.forEach((r, i) => { const tr = document.createElement('tr'); if (r === player || r === player2) tr.className = 'me'; tr.innerHTML = `<td>${i + 1}.</td><td>${r.name}</td><td>${r.car.name}</td><td>${fmtTime(r.finishTime)}${r.projected ? '*' : ''}</td>`; tb.appendChild(tr); });
      $('#resBest').textContent = fmtTime(player.bestLap);
      $('#resStats').innerHTML = (auftragDone || auftragFail ? `KLÜNGEL-AUFTRÄGE: <b>${auftragDone}</b> erledigt${auftragFail ? `, <b>${auftragFail}</b> vermasselt` : ''} · ` : '') + `KNÖLLCHEN: <b>${knoellchen}</b> (${knoellchen * 60} €, Klüngel Tom regelt dat) · KÖLSCH UNTERWEGS: <b>${koelsch}</b> · KLÜNGEL-TELEFON: <b>${telefon.used}×</b> (schuldest ihm ${telefon.used} Kölsch) · SCHADEN: <b>${Math.round(player.damage * 100)} %</b> · ${knoellchen > 2 ? 'Führerschein: uff Deckel.' : knoellchen ? 'Führerschein: noch da.' : 'Kein Blitzer erwischt. Verdächtig.'}`;
      $('#resRecord').hidden = !record;
      $('#resExpress').textContent = headline.replace(/^DÄ SCHNELLE:\s*/, ''); drawFrontPage(headline, place, order);
      $('#resDeckel').innerHTML = `BIERDECKEL: <b>${strokes(deckel)}</b> (${deckel} Striche) · GESAMT: <b>${total}</b> – <b>${rank}</b>` + (wette ? ` · WETTE: <b>${wette.won ? 'JEWONNE' : 'VERLORE'}</b> (${wette.n} Kölsch ${wette.won ? 'für dich' : 'für dä Lange'})` : '') + (kripoSeen ? ` · KRIPO: <b>${kripoCaught ? 'HÄT DICH JEKRIEGT' : 'ABJEHÄNGT'}</b>` : '');
      if (wette) { const wl = pick(wette.won ? tuenn.wette.won : tuenn.wette.lost).replace('{r}', wette.rival.name).replace('{n}', String(wette.n)); $('#resTuenn').textContent = wl; }
      renderCup(order);
      { const ob = $('#resOrden'); ob.hidden = !newOrden.length; if (newOrden.length) { ob.innerHTML = newOrden.map((o) => `<div class="oitem"><canvas class="medal"></canvas><span>NEUER ORDEN: <b>${o.name}</b> · ${o.desc}</span></div>`).join(''); ob.querySelectorAll('canvas').forEach((c, i) => medalIcon(c, newOrden[i].color, 2)); } }
      if (!wette) $('#resTuenn').textContent = newOrden.length ? pick(tuenn.ordenLine).replace('{name}', newOrden[0].name) : record ? pick(tuenn.record) : won ? pick(tuenn.win) : pick(tuenn.lose);
      if (careerChapter != null) { const g = tuenn.career[careerChapter].goal; applyCareerResult(g.place ? place <= g.place : g.win ? won : g.koelsch ? koelsch >= g.koelsch : g.auftrag ? auftragDone >= g.auftrag : true); }
      const rd = order[won ? 1 : 0].driver;
      $('#resRival').textContent = `${rd.name}: „${pick(won ? rd.lines.lose : rd.lines.win)}“`;
      $('#results').hidden = false; document.body.classList.add('resultsOpen');
    }, 1200);
  }
  function toMenu() {
    if (phase === 'loading') return; $('#loading').hidden = true;
    if (window.Club) window.Club.close(); clearMission(); missionMode = false; careerChapter = null; $('#hudPrompt').hidden = true;
    phase = 'menu'; if (demo) { camMode = demoPrevCam; tvCam = null; } demo = false; idleT = 0; $('#demo').hidden = true; document.body.classList.remove('demo');
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
    if (perf.stage === 1) { renderer.setPixelRatio(1); if (renderer.shadowMap.enabled) { renderer.shadowMap.enabled = false; if (sunLight) sunLight.castShadow = false; scene.traverse((o) => { if (o.isMesh && o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { m.needsUpdate = true; }); } }); } sayMust({ name: 'Heinzel', emoji: '🔧' }, 'Dat Handy schwitzt. Ich hab de Schatten avjeschraubt. Läuft.', 2600); }
    else if (pixelScale === 1) { pixelScale = 2; applyPixelMode(); post.setScale(2); sayMust({ name: 'Heinzel', emoji: '🔧' }, 'Un jetz Pixel. Wie 1990. Dafür flüssig.', 2600); }
  }
  function frame(t) {
    requestAnimationFrame(frame);
    const dtReal = Math.min(0.5, (t - lastT) / 1000 || 0.016); adaptQuality(dtReal); lastDtReal = dtReal;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
    renderer.info.reset();
    if (phase === 'menu' || phase === 'editor') { tick(dt); return; }
    if (!scene || phase === 'club') return;
    const steps = window.STUNTS_SIMSTEPS && (phase === 'intro' || phase === 'countdown' || phase === 'race' || phase === 'finished') ? window.STUNTS_SIMSTEPS : 1;
    if (!window.STUNTS_MANUAL_STEP) for (let k = 0; k < steps; k++) tick(steps > 1 ? 1 / 60 : dt);
    if (scenery) W.animate(t, dt, camPos, phase === 'race' || phase === 'countdown' || phase === 'finished' ? racers.map((r) => r.mesh.position).concat(kripo ? [kripo.mesh.position] : []) : null);
    if (confetti && player && player.frame) confetti.userData.update(dt, player.frame.pos);
    if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) $('#msg').classList.remove('show'); }
    updateCamera(dt);
    const cams = (player2 && camera2 && phase !== 'menu' && phase !== 'editor') ? [camera, camera2] : camera;
    if (pixelScale === 1) renderDirect(cams); else post.render(scene, cams);
    if (shotWanted) { shotWanted = false; try { lastShot = renderer.domElement.toDataURL('image/jpeg', 0.82); } catch (e) { lastShot = null; } }
  }

  // one simulation step (physics, AI, commentary); the frame loop may run several per render for headless testing
  function tick(dt) {
    if (phase === 'intro') {
      introT += dt; for (const r of racers) placeRacer(r, dt); updateHUD();
      if (introT > 3.8) { phase = 'countdown'; $('#introCard').hidden = true; }
    } else if (phase === 'countdown') {
      countdown -= window.STUNTS_SIMSTEPS ? dt : Math.min(0.25, lastDtReal); // real time, so a slow phone does not stretch the countdown
      const idx = 3 - Math.ceil(countdown - 0.2); const cd = $('#countdown');
      if (countdown <= 0.2) { cd.textContent = tuenn.countdown[3]; if (cdShown !== 3) { beep(880, 0.5, 'square', 0.2); cdShown = 3; } }
      else if (idx >= 0 && idx < 3) { cd.textContent = tuenn.countdown[idx]; if (cdShown !== idx) { beep(440, 0.15); cdShown = idx; } }
      cd.hidden = false;
      if (countdown <= 0) { phase = 'race'; setTimeout(() => { cd.hidden = true; }, 700); if (theme.heist) setTimeout(() => { if (phase === 'race' && !kripo) { knoellchen = 3; startKripo(); sayMust(tuenn, pick(tuenn.heist), 3800); } }, 5000); }
      for (const r of racers) placeRacer(r, dt);
      updateHUD();
    } else if (phase === 'race' || phase === 'finished') {
      if (phase === 'race') raceTime += dt;
      if (tilt.mode > 0 && tilt.listening) readKeys();
      const ctl = player.finished ? { gas: 0, brake: 0.5, steer: 0, turbo: 0 } : (window.STUNTS_AUTOPILOT || demo) ? aiControl(player, dt) : input;
      if (mission && mission.onFoot) { player.v = 0; walkStep(dt); } else updateRacer(player, dt, ctl);
      if (player2) updateRacer(player2, dt, player2.finished ? { gas: 0, brake: 0.5, steer: 0, turbo: 0 } : window.STUNTS_AUTOPILOT ? aiControl(player2, dt) : input2);
      if (phase === 'race') recordFrame(dt);
      if (ghost) updateGhost();
      for (const r of racers) if (r.isAI) updateRacer(r, dt, r.finished ? { gas: 0, brake: 0.3, steer: 0, turbo: 0 } : aiControl(r, dt));
      for (let i = 0; i < racers.length; i++) for (let j = i + 1; j < racers.length; j++) collide(racers[i], racers[j]);
      for (const r of racers) placeRacer(r, dt);
      if (phase === 'race') { updatePickups(dt); updateKripo(dt); if (mission) updateMission(dt); else updateAuftrag(dt); }
      if (demo) { demoT += dt; if (demoT > 75 || phase === 'finished') { toMenu(); return; } }
      if (phase === 'race') {
        radioTimer -= dt; eventTimer -= dt; storyCool -= dt; quiet -= dt;
        if (theme.heist && !kripo && raceTime > 8 && raceTime - kripoEndT > 25 && !player.finished) { knoellchen = 3; startKripo(); sayMust(tuenn, pick(tuenn.heist), 3200); } // on the heist the Kripo never gives up for long
        if (radioTimer <= 0 && msgTimer <= 0) { radioTimer = 80 + Math.random() * 40; const roll = Math.random(); if (roll < 0.5) say({ name: 'DÄ SCHNELLE', emoji: '📰' }, pick(tuenn.express).replace('DÄ SCHNELLE: ', ''), 3500); else say({ name: 'Kölsches Grundgesetz', emoji: '📜' }, pick(tuenn.grundgesetz), 3500); }
        for (const st of stories) { if (st.told || routeFor(player)) continue; let ds = player.s - st.s; if (ds > track.length / 2) ds -= track.length; if (ds > -8 && ds < 30) { st.told = true; if (storyCool > 0 || msgTimer > 0) continue; storyCool = 25; say({ name: 'Dä Lange verzällt', emoji: '🎩' }, st.text, 5000); radioTimer = Math.max(radioTimer, 30); } }
        if (telefon.active > 0) telefon.active -= dt; if (hornCool > 0) hornCool -= dt;
        if (razzia > 0) { razzia -= dt; razziaBlink += dt; if (razziaBlink > 0.45) { razziaBlink = 0; beep(Math.floor(razzia * 2) % 2 ? 700 : 940, 0.2, 'square', 0.05); const fl = $('#flash'); fl.style.background = '#2060ff'; fl.style.opacity = '0.35'; setTimeout(() => { fl.style.opacity = '0'; }, 120); } if (razzia <= 0) { $('#flash').style.background = ''; sayMust(tuenn, pick(tuenn.razziaEnd), 2500); } }
        else if (eventTimer <= 0 && msgTimer <= 0 && Math.random() < 0.22 && raceTime > 20 && !kripo) { eventTimer = 30 + Math.random() * 20; razzia = 8; razziaBlink = 0; sayMust(tuenn, pick(tuenn.razzia), 3500); }
        if (eventTimer <= 0 && msgTimer <= 0) { eventTimer = 26 + Math.random() * 18; const ev = pick(tuenn.events); say(tuenn, ev, 3000); if (ev.includes('Kölsch')) { koelsch++; player.turbo = Math.min(1, player.turbo + 0.35); } }
        for (const b of blitzers) {
          b.cool -= dt; if (b.flash) b.flash.material.opacity = Math.max(0, b.flash.material.opacity - dt * 3);
          let ds = player.s - b.s; if (ds > track.length / 2) ds -= track.length;
          if (!routeFor(player) && ds > 0 && ds < 4 && b.cool <= 0) { b.cool = 8; if (Math.abs(player.v) * 3.6 > 120 && !player.air) { knoellchen++; if (knoellchen >= 3 && !kripo && !kripoSeen) startKripo(); if (b.flash) b.flash.material.opacity = 1; flashTimer = 0.25; beep(1400, 0.12, 'square', 0.12); say({ name: 'Blitzer Kölle', emoji: '📸' }, pick(tuenn.blitzer), 2600); } }
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
    } else if (phase === 'menu' || phase === 'editor' || phase === 'club') {
      if (phase === 'menu' && !document.hidden && $('#records').hidden) { idleT += dt; if (idleT > (window.STUNTS_IDLE || 50)) startDemo(); }
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
  function updateTiltUI() { labelBtn($('#tiltBtn'), tilt.mode === 0 ? 'NEIGEN: AUS' : tilt.mode === 1 ? 'NEIGEN: AN' : 'NEIGEN: AN (UMGEKEHRT)'); document.body.classList.toggle('tilt', tilt.mode > 0); }
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
    idleT = 0; if (demo) { e.preventDefault(); toMenu(); return; }
    keys[e.code] = true; readKeys();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) && phase !== 'menu' && phase !== 'editor') e.preventDefault();
    if (phase === 'club') { if (window.Club) window.Club.key(e.code); return; }
    if (phase === 'menu') {
      if (e.code === 'Enter') startRace();
      if (e.code === 'KeyP') cyclePixel();
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { sel.car = (sel.car + (e.code === 'ArrowRight' ? 1 : -1) + D.CARS.length) % D.CARS.length; renderMenu(); }
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') { const n = allTracks().length; sel.track = (sel.track + (e.code === 'ArrowDown' ? 1 : -1) + n) % n; onTrackChange(); }
      if (/^Digit[1-9]$/.test(e.code) && parseInt(e.code.slice(-1)) <= PLAYABLE.length) { sel.driver = parseInt(e.code.slice(-1)) - 1; renderMenu(); }
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
    if (phase === 'intro' && (e.code === 'Enter' || e.code === 'Space')) introT = 99;
    if (e.code === 'KeyH' && phase === 'race') horn();
    if (e.code === 'KeyE' && phase === 'race' && mission) missionAction();
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
    if (!tr.shortcuts) tr.shortcuts = window.Shortcuts.buildRoutes(tr);
    const projection = SP.outline(tr.samples, canvas, w, h, '#f4f4f4'), ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#6ffc95'; ctx.lineWidth = 1.5;
    for (const route of tr.shortcuts) {
      ctx.beginPath(); route.samples.forEach((q, i) => i ? ctx.lineTo(projection.px(q), projection.pz(q)) : ctx.moveTo(projection.px(q), projection.pz(q))); ctx.stroke();
    }
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
    if (carLocked(sel.car)) sel.car = 0;
    D.CARS.forEach((c, i) => {
      const card = document.createElement('div'); card.className = 'card car' + (sel.car === i ? ' active' : '');
      const stat = (label, v) => `<div class="stat"><span>${label}</span><i>${[1, 2, 3, 4, 5].map((k) => `<b class="${k <= v ? (k >= 5 ? 'hi' : 'on') : ''}"></b>`).join('')}</i></div>`;
      card.innerHTML = `<span class="p1">${sel.car === i ? 'P1' : ''}</span><canvas></canvas><b>${c.name.toUpperCase()}</b>${stat('TEMPO', c.stats[0])}${stat('BESCHL.', c.stats[1])}${stat('HANDLING', c.stats[2])}${stat('NITRO', c.stats[3])}`;
      SP.carSide(c, card.querySelector('canvas'), 4);
      if (carLocked(i)) { card.classList.add('locked'); card.querySelector('b').textContent = '🔒 ' + c.name.toUpperCase(); card.onclick = () => { $('#tipp').textContent = pick(tuenn.careerLines.locked); }; } else card.onclick = () => { sel.car = i; renderMenu(); };
      cl.appendChild(card);
    });
    // tracks
    const tl = $('#trackList'); tl.innerHTML = '';
    const all = allTracks();
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
    const routes = outlineCache[t.id + t.segments.length].shortcuts;
    $('#trackRoutes').textContent = routes.length ? 'GRÜNE ABKÜRZUNGEN: ' + routes.map((r) => `${r.name} (−${Math.round(r.saved)} m)`).join(' · ') + '. Am Schild einordnen; in der schmalen Gasse vom Gas.' : '';
    $('#quickTrack').textContent = t.name.toUpperCase();
    $('#langerQuote').textContent = '„' + pick(tuenn.intro) + '“';
    $('#slogan').textContent = tuenn.slogans[Math.floor(Date.now() / 86400000) % tuenn.slogans.length];
    try { const pad = (v) => String(Math.max(0, v | 0)).padStart(6, '0'); const tot0 = parseInt(localStorage.getItem('stuntskoelle.deckel') || '0') || 0; const hs = parseInt(localStorage.getItem('stuntskoelle.hiscore') || '0') || 0; if ($('#hs1')) { $('#hs1').textContent = pad(tot0 * 100); $('#hsTop').textContent = pad(Math.max(hs * 100, 471100)); $('#hsCredit').textContent = String(1 + Math.min(98, Math.floor(tot0 / 11))).padStart(2, '0'); } } catch (e) { /* ignore */ }
    try { const tot = parseInt(localStorage.getItem('stuntskoelle.deckel') || '0') || 0; const wins = parseInt(localStorage.getItem('stuntskoelle.cupwins') || '0') || 0; const q = document.querySelector('.bannerQuote .q'); if (q && tot > 0) q.innerHTML = `DING DECKEL: ${tot} STRICHE<br>${deckelRank(tot)}${wins ? ' · ' + wins + '× CUP' : ''}<span>– der Köbes</span>`; } catch (e) { /* ignore */ }
    $('#tipp').textContent = pick(tuenn.tips);
    try { localStorage.setItem('stuntskoelle.sel', JSON.stringify(sel)); } catch (e) { /* ignore */ }
  }
  function onTrackChange() { renderMenu(); }

  // ---------------- records ----------------
  function showRecords() {
    const box = $('#recordsList'); box.innerHTML = '';
    { const st = getStats(), have = getOrden(); const grid = document.createElement('div'); grid.className = 'ordenGrid';
      grid.innerHTML = '<b class="ordenHead">ORDEN OP DÄ DECKEL · ' + have.length + ' / ' + tuenn.orden.length + '</b>' + tuenn.orden.map((o) => `<div class="orden ${have.includes(o.id) ? 'on' : ''}"><canvas></canvas><b>${o.name}</b><small>${o.desc}</small><i>${Math.min(o.need, st[o.stat] || 0)} / ${o.need}</i></div>`).join('');
      grid.querySelectorAll('.orden canvas').forEach((c, i) => medalIcon(c, tuenn.orden[i].color, 3)); box.appendChild(grid); }
    TRACKS.concat(daily ? [daily] : []).forEach((t, i) => {
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
    { id: 'jumphouse', label: 'SPRUNG ÜBERS HAUS', seg: { t: 'jump', ramp: 28, angle: 16, gap: 30, over: 'house' } },
    { id: 'cork', label: 'KORKENZIEHER', seg: { t: 'corkscrew', len: 64, r: 9, turns: 1 } },
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
  // ---------------- Streck des Tages: one seeded random round per day ----------------
  function dailyDef(offsetDays) {
    const d = new Date(Date.now() + (offsetDays || 0) * 86400000); const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const rng = (seed) => { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const FILL = ['straight', 'straight', 'straight', 'hill', 'hill', 'dip', 'loop', 'jump', 'jumphouse', 'cork', 'bridge', 'tunnel', 'straight'];
    const STUNT = /loop|jump|cork/; const piece = (id) => Object.assign({}, PIECES.find((q) => q.id === id).seg);
    for (let attempt = 0; attempt < 40; attempt++) {
      const r = rng(key * 7 + attempt * 131); const ids = ['straight'];
      const nRight = Math.floor(r() * 3); const curves = []; for (let i = 0; i < 4 + nRight; i++) curves.push(r() < 0.3 ? 'lbank' : 'lcurve'); for (let i = 0; i < nRight; i++) curves.push(r() < 0.3 ? 'rbank' : 'rcurve');
      for (let i = curves.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [curves[i], curves[j]] = [curves[j], curves[i]]; }
      for (const c of curves) { const n = 1 + Math.floor(r() * 2); for (let k = 0; k < n; k++) { let f = FILL[Math.floor(r() * FILL.length)]; if (STUNT.test(f) && STUNT.test(ids[ids.length - 1])) f = 'straight'; ids.push(f); } ids.push(c); }
      ids.push('straight');
      if (!ids.some((x) => STUNT.test(x))) { const at = 1 + Math.floor(r() * (ids.length - 2)); ids.splice(at, 0, r() < 0.5 ? 'loop' : 'jump', 'straight'); }
      const segs = ids.map(piece); const v = tuenn.veedel[(key + attempt) % tuenn.veedel.length]; const base = TRACKS[(key + attempt) % TRACKS.length];
      const names = tuenn.dailyNames.filter((nm) => base.theme.night ? true : !/NACHT/.test(nm));
      const def = { id: 'tag-' + key, daily: true, name: names[(key + attempt) % names.length].replace('{v}', v), district: 'STRECK DES TAGES · ' + d.getDate() + '.' + (d.getMonth() + 1) + '.', tag: 'TAGESSTRECK', laps: 3, diff: Math.min(5, 2 + Math.floor(ids.length / 6)), scale: 1,
        theme: base.theme, segments: segs, waypoints: [v, 'ZUFALL', 'KLÜNGEL'], desc: tuenn.dailyDesc + ' Heute: ' + ids.length + ' Teile durch ' + v + ', Kulisse wie ' + base.name + '.', props: [{ type: 'tuenn', seg: 0, u: 0.05, side: 1, dist: 9 }, { type: 'crowd', seg: 0, u: 0.1, side: -1, dist: 10 }] };
      try { const t = TB.buildTrack(def); const S = t.samples; const a = S[0].p, b = S[S.length - 1].p; const gap = Math.hypot(a.x - b.x, a.z - b.z); if (gap < 6 && t.length > 900 && t.length < 2600) return def; } catch (e) { /* next attempt */ }
    }
    return null;
  }

  // ---------------- Orden: lifetime counters on the Bierdeckel ----------------
  function getStats() { try { return JSON.parse(localStorage.getItem('stuntskoelle.stats') || '{}'); } catch (e) { return {}; } }
  function bumpStat(key, n) { const st = getStats(); st[key] = (st[key] || 0) + (n || 1); try { localStorage.setItem('stuntskoelle.stats', JSON.stringify(st)); } catch (e) { /* ignore */ } }
  function getOrden() { try { return JSON.parse(localStorage.getItem('stuntskoelle.orden') || '[]'); } catch (e) { return []; } }
  function checkOrden() { // returns the badges that were just earned
    const st = getStats(), have = getOrden(), fresh = [];
    for (const o of tuenn.orden) if (!have.includes(o.id) && (st[o.stat] || 0) >= o.need) { have.push(o.id); fresh.push(o); }
    if (fresh.length) { try { localStorage.setItem('stuntskoelle.orden', JSON.stringify(have)); } catch (e) { /* ignore */ } setTimeout(() => { beep(784, 0.12, 'square', 0.12); setTimeout(() => beep(1046, 0.12, 'square', 0.12), 120); setTimeout(() => beep(1568, 0.3, 'square', 0.12), 240); }, 800); }
    return fresh;
  }
  function medalIcon(canvas, color, scale) { // a pixel medal: coloured disc on a red-white ribbon
    const map = ['......rr..rr....', '.....rwwrrwwr...', '.....rwwrrwwr...', '....rwwrrrrwwr..', '....rwwrrrrwwr..', '......kkkkkk....', '.....kXXXXXXk...', '....kXXxxxxXXk..', '...kXXxxwwxxXXk.', '...kXXxwwwwxXXk.', '...kXXxwwwwxXXk.', '...kXXxxwwxxXXk.', '....kXXxxxxXXk..', '.....kXXXXXXk...', '......kkkkkk....', '................'];
    const C = { y: ['#c9a227', '#ffd23f'], o: ['#c25a00', '#ff7a00'], p: ['#b0206e', '#ff3fa0'], b: ['#2a6da0', '#4fd6ff'], r: ['#8a0f18', '#ff2a2a'], g: ['#207a20', '#3adf3a'], w: ['#9a9aa8', '#f4f4f4'] }[color] || ['#9a9aa8', '#f4f4f4'];
    const pal = { k: '#14121c', r: '#c1121f', w: '#f4f4f4', X: C[0], x: C[1] }; scale = scale || 2; canvas.width = 16 * scale; canvas.height = 16 * scale; const x = canvas.getContext('2d');
    map.forEach((row, j) => { for (let i = 0; i < 16; i++) { const ch = row[i]; if (ch === '.') continue; x.fillStyle = pal[ch]; x.fillRect(i * scale, j * scale, scale, scale); } });
  }

  // ---------------- Hupe ----------------
  function horn() {
    if (hornCool > 0 || phase !== 'race') return; hornCool = 1.2; audioInit();
    beep(392, 0.45, 'sawtooth', 0.12); beep(494, 0.45, 'sawtooth', 0.1); setTimeout(() => { beep(392, 0.3, 'sawtooth', 0.1); beep(494, 0.3, 'sawtooth', 0.08); }, 520);
    let ahead = null, best = 99; for (const o of racers) { if (o === player || o.isCop || !sameRoad(player, o)) continue; let ds = o.s - player.s; const L = track.length; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L; if (ds > 0 && ds < 22 && ds < best) { best = ds; ahead = o; } }
    if (ahead) { ahead.yieldT = 2.5; if (msgTimer <= 0 && Math.random() < 0.6) say(ahead.driver, pick(tuenn.hupeRival), 2200); }
    else if (msgTimer <= 0 && Math.random() < 0.5) say(tuenn, pick(tuenn.hupe), 2200);
  }

  // ---------------- Botengang: fetch something on foot, deliver it by car, the Kripo behind you ----------------
  function goalText(g) { return g.place ? `TOP ${g.place}` : g.win ? 'SIEG' : g.koelsch ? `${g.koelsch} KÖLSCH` : g.auftrag ? `${g.auftrag} AUFTRAG` : 'ANKOMMEN'; }
  function startMission(def) {
    missionMode = true; missionDef = def; clearMission();
    startRace(Object.assign({}, def, { laps: 99 }), () => {
    const B = tuenn.botengang; const k = Math.floor(Math.random() * B.what.length);
    const a = roadFrameAhead(player.s, 230 + Math.random() * 150, 45);
    mission = { stage: 'drive1', pickS: a.s, side: Math.random() < 0.5 ? 1 : -1, what: B.what[k], short: B.whatShort[k], pickName: pick(B.where), dropName: pick(B.where), timer: 0, onFoot: false, walker: null, meshes: [], farCool: 0 };
    if (mission.dropName === mission.pickName) mission.dropName = B.where[(B.where.indexOf(mission.pickName) + 1) % B.where.length];
    const ring = dropMesh('ABHOLEN · ' + mission.pickName); ring.position.set(a.f.p.x, a.f.p.y + 0.1, a.f.p.z); ring.rotation.y = Math.atan2(a.f.T.x, a.f.T.z); scene.add(ring); mission.meshes.push(ring); mission.ring = ring;
    setTimeout(() => { if (mission && phase !== 'menu') sayMust(tuenn, pick(B.brief).replace('{pick}', mission.pickName).replace('{what}', mission.what).replace('{drop}', mission.dropName), 5200); }, 7600);
    });
  }
  function clearMission() { if (mission) { for (const m of mission.meshes) scene && scene.remove(m); if (mission.walker && scene) scene.remove(mission.walker); } mission = null; $('#hudPrompt').hidden = true; }
  function missionHud() {
    const L = track.length; const dist = (sTarget) => { let d = sTarget - player.s; if (d < 0) d += L; return Math.round(d); };
    if (mission.stage === 'drive1') return `→ ${mission.pickName} ${dist(mission.pickS)} M`;
    if (mission.stage === 'walk') return `ZU FUSS → ${mission.short} ${Math.round(mission.walker.position.distanceTo(mission.doorPos))} M`;
    if (mission.stage === 'walkback') return `ZU FUSS → AUTO ${Math.round(mission.walker.position.distanceTo(player.mesh.position))} M`;
    return `→ ${mission.dropName} ${dist(mission.dropS)} M · ${Math.max(0, Math.round(mission.timer))} S`;
  }
  function prompt(text) { const p = $('#hudPrompt'); if (text) { p.hidden = false; p.textContent = text; } else p.hidden = true; }
  function updateMission(dt) {
    if (routeFor(player)) { prompt(null); if (mission.stage === 'drive2') { mission.timer -= dt; if (mission.timer <= 0) missionEnd(false, 'late'); } return; }
    const L = track.length; const near = (sT) => { let d = player.s - sT; if (d > L / 2) d -= L; if (d < -L / 2) d += L; return Math.abs(d) < 7 && Math.abs(player.v) < 3 && !player.air; };
    if (mission.stage === 'drive1') prompt(near(mission.pickS) ? 'E · AUSSTEIJEN' : null);
    else if (mission.stage === 'walkback') prompt(mission.walker.position.distanceTo(player.mesh.position) < 3.4 ? 'E · EINSTEIJEN' : null);
    else if (mission.stage === 'drive2') {
      mission.timer -= dt; if (mission.ring2) { const k = 1 + Math.sin(raceTime * 5) * 0.08; mission.ring2.scale.set(k, 1, k); }
      if (near(mission.dropS)) { missionEnd(true); return; }
      if (mission.timer <= 0) { missionEnd(false, 'late'); return; }
    }
  }
  function missionAction() {
    if (!mission || phase !== 'race') return; const B = tuenn.botengang;
    if (mission.stage === 'drive1' && !$('#hudPrompt').hidden) { // get out: a walker beside the car, the door marker up the sidewalk
      mission.onFoot = true; mission.stage = 'walk'; player.v = 0; prompt(null); const f = TB.frameAt(track, player.s); const Bv = new THREE.Vector3(f.B.x, 0, f.B.z).normalize();
      const w = W.human({ h: 1.78, shirt: PLAYABLE[sel.driver].color || 0x14141a, pants: 0x2a2a34, hat: PLAYABLE[sel.driver].id === 'langer' ? 'fedora' : 'none', hatColor: 0x0a0a0a }); w.position.copy(player.mesh.position).addScaledVector(Bv, mission.side * 3.4); w.position.y = W.GROUND_Y; w.rotation.y = Math.atan2(f.T.x, f.T.z); scene.add(w); mission.walker = w;
      const d = TB.frameAt(track, mission.pickS + 22 + Math.random() * 14); const Bd = new THREE.Vector3(d.B.x, 0, d.B.z).normalize(); mission.doorPos = new THREE.Vector3(d.p.x, W.GROUND_Y, d.p.z).addScaledVector(Bd, mission.side * (ROAD_W + 4.3));
      const door = dropMesh(mission.pickName); door.position.copy(mission.doorPos); door.scale.set(0.55, 1, 0.55); scene.add(door); mission.meshes.push(door); mission.door = door;
      const pk = umschlagMesh(); pk.position.copy(mission.doorPos); pk.position.y += 0.4; scene.add(pk); mission.meshes.push(pk); mission.pkg = pk;
      scene.remove(mission.ring); sayMust(tuenn, pick(B.out), 3000); return;
    }
    if (mission.stage === 'walkback' && !$('#hudPrompt').hidden) { // back in: the drop-off appears, the Kripo too
      mission.onFoot = false; mission.stage = 'drive2'; prompt(null); scene.remove(mission.walker); mission.walker = null; if (mission.carRing) scene.remove(mission.carRing);
      const b = roadFrameAhead(player.s, 420 + Math.random() * 260, 30); mission.dropS = b.s; let dist = b.s - player.s; if (dist < 0) dist += track.length; mission.timer = Math.round(dist / 12) + 25;
      const ring = dropMesh('ABLIEFERN · ' + mission.dropName); ring.position.set(b.f.p.x, b.f.p.y + 0.1, b.f.p.z); ring.rotation.y = Math.atan2(b.f.T.x, b.f.T.z); scene.add(ring); mission.meshes.push(ring); mission.ring2 = ring;
      if (!kripo) startKripo(); sayMust(tuenn, pick(B.back).replace('{drop}', mission.dropName), 3600);
    }
  }
  function walkStep(dt) {
    const w = mission.walker; if (!w) return; const B = tuenn.botengang; walkT += dt;
    const turn = -input.steer * 2.6 * dt; w.rotation.y += turn; const speed = (input.gas ? 5.2 : 0) - (input.brake ? 2.4 : 0);
    if (speed) { w.position.x += Math.sin(w.rotation.y) * speed * dt; w.position.z += Math.cos(w.rotation.y) * speed * dt; w.position.y = W.GROUND_Y + Math.abs(Math.sin(walkT * 11)) * 0.06; w.rotation.z = Math.sin(walkT * 11) * 0.04; } else { w.position.y = W.GROUND_Y; w.rotation.z = 0; }
    const car = player.mesh.position; mission.farCool -= dt;
    { // project onto the road: the walker may use the street and both sidewalks, up to 70 m from the car along it
      const L = track.length; let bestD = 1e9, bestI = 0; const i0 = Math.floor(player.s / track.ds); const S = track.samples, n = S.length;
      for (let k = -80; k <= 80; k += 2) { const q = S[((i0 + k) % n + n) % n]; const d = (q.p.x - w.position.x) ** 2 + (q.p.z - w.position.z) ** 2; if (d < bestD) { bestD = d; bestI = ((i0 + k) % n + n) % n; } }
      const q = S[bestI]; const bl = Math.hypot(q.B.x, q.B.z) || 1; const bx = q.B.x / bl, bz = q.B.z / bl; let lat = (w.position.x - q.p.x) * bx + (w.position.z - q.p.z) * bz; const along = (w.position.x - q.p.x) * q.T.x + (w.position.z - q.p.z) * q.T.z;
      const maxLat = ROAD_W + 5.6; let pushed = false; if (Math.abs(lat) > maxLat) { lat = Math.sign(lat) * maxLat; pushed = true; }
      let ds = (bestI - i0) * track.ds; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L; if (Math.abs(ds) > 70) { pushed = true; if (mission.farCool <= 0) { mission.farCool = 6; sayMust(tuenn, pick(B.far), 2500); } }
      if (pushed) { const sI = Math.abs(ds) > 70 ? ((i0 + Math.sign(ds) * Math.round(70 / track.ds)) % n + n) % n : bestI; const qq = S[sI]; const bl2 = Math.hypot(qq.B.x, qq.B.z) || 1; w.position.x = qq.p.x + qq.B.x / bl2 * lat + (Math.abs(ds) > 70 ? 0 : qq.T.x * along); w.position.z = qq.p.z + qq.B.z / bl2 * lat + (Math.abs(ds) > 70 ? 0 : qq.T.z * along); }
    }
    if (mission.stage === 'walk') { mission.pkg.rotation.y += dt * 2; if (w.position.distanceTo(mission.doorPos) < 2.4) { mission.stage = 'walkback'; scene.remove(mission.pkg); scene.remove(mission.door); const cr = dropMesh('DAT AUTO'); cr.position.copy(car); cr.position.y = W.GROUND_Y + 0.1; scene.add(cr); mission.meshes.push(cr); mission.carRing = cr; beep(1180, 0.08, 'square', 0.12); setTimeout(() => beep(1580, 0.12, 'square', 0.12), 90); sayMust(tuenn, pick(B.got), 3000); } }
  }
  function missionEnd(ok, why) {
    if (!mission || phase !== 'race') return; phase = 'finished'; prompt(null); const B = tuenn.botengang; player.finished = true; player.finishTime = raceTime;
    if (kripo) endKripo('finish'); const m = mission; clearMission(); mission = null;
    const strokes = ok ? 8 : -3; addDeckel(strokes); const total = deckelTotal(deckel); if (ok) bumpStat('boten'); newOrden = checkOrden();
    const headline = ok ? B.headlineDone : why === 'caught' ? B.headlineCaught : B.headlineLate; lastHeadline = headline; lastPlace = ok ? 1 : 10; shotWanted = true; fanfare(ok);
    setTimeout(() => {
      if (phase === 'menu') return;
      $('#resTitle').textContent = ok ? `BOTENGANG ERLEDIGT: ${m.short} BEIM ${m.dropName}.` : why === 'caught' ? 'BOTENGANG VERMASSELT: DIE KRIPO HÄT DICH.' : 'BOTENGANG VERMASSELT: ZU SPÄT.';
      $('#resTable').innerHTML = `<tr class="me"><td>${ok ? '✓' : '✗'}</td><td>DU</td><td>${D.CARS[sel.car].name}</td><td>${fmtTime(raceTime)}</td></tr>`;
      $('#resBest').textContent = ok ? 'pünktlich' : '–'; $('#resRecord').hidden = true;
      $('#resStats').innerHTML = `PAKET: <b>${m.short}</b> (${m.what}) · VON: <b>${m.pickName}</b> · NACH: <b>${m.dropName}</b> · KRIPO: <b>${why === 'caught' ? 'HÄT DICH JEKRIEGT' : ok ? 'ABJEHÄNGT' : 'NOCH DRAN'}</b> · SCHADEN: <b>${Math.round(player.damage * 100)} %</b>`;
      $('#resExpress').textContent = headline.replace(/^DÄ SCHNELLE:\s*/, ''); drawFrontPage(headline, ok ? 1 : 10, [player]);
      $('#resDeckel').innerHTML = `BIERDECKEL: <b>${strokes > 0 ? '+' : ''}${strokes}</b> Striche · GESAMT: <b>${total}</b> – <b>${deckelRank(total)}</b>`;
      $('#resCup').hidden = true; $('#againBtn').textContent = careerChapter != null ? (ok ? 'NÄCHSTES KAPITEL (ENTER)' : 'KAPITEL NOCHMAL (ENTER)') : 'NOCHMAL (ENTER)';
      { const ob = $('#resOrden'); ob.hidden = !newOrden.length; if (newOrden.length) { ob.innerHTML = newOrden.map((o) => `<div class="oitem"><canvas class="medal"></canvas><span>NEUER ORDEN: <b>${o.name}</b> · ${o.desc}</span></div>`).join(''); ob.querySelectorAll('canvas').forEach((c, i) => medalIcon(c, newOrden[i].color, 2)); } }
      $('#resTuenn').textContent = pick(ok ? B.done : why === 'caught' ? B.caught : B.late).replace('{drop}', m.dropName); $('#resRival').textContent = '';
      if (careerChapter != null) applyCareerResult(ok);
      $('#results').hidden = false; document.body.classList.add('resultsOpen');
    }, 1400);
  }

  // ---------------- Deckel mitnehmen: export and import of everything the browser remembers ----------------
  const SAVE_SKIP = /^stuntskoelle\.(ghost|sel|pixel|voice|voiceName|tilt|music)/;
  function exportSave() {
    const data = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('stuntskoelle.') && !SAVE_SKIP.test(k)) data[k] = localStorage.getItem(k); } } catch (e) { /* ignore */ }
    const json = JSON.stringify(data); const b64 = btoa(unescape(encodeURIComponent(json))); return 'K4D1.' + b64;
  }
  function importSave(code) {
    code = (code || '').trim(); if (!code.startsWith('K4D1.')) return 'Dat is kein Deckel-Code.';
    let data; try { data = JSON.parse(decodeURIComponent(escape(atob(code.slice(5))))); } catch (e) { return 'Code kaputt. Nochmal kopieren.'; }
    let n = 0; try { for (const k of Object.keys(data)) if (k.startsWith('stuntskoelle.') && !SAVE_SKIP.test(k)) { localStorage.setItem(k, String(data[k])); n++; } } catch (e) { return 'Speichern jing nit.'; }
    renderMenu(); return `${n} Einträge übernommen. Der Deckel hängt jetzt hee.`;
  }

  // ---------------- Karriere: die Nachtschicht ----------------
  function careerState() { try { return JSON.parse(localStorage.getItem('stuntskoelle.career') || '{"chapter":0}'); } catch (e) { return { chapter: 0 }; } }
  function carLocked(i) { if (D.CARS[i].id !== 'countach') return false; try { return localStorage.getItem('stuntskoelle.countach') !== '1' && careerState().chapter < tuenn.career.length; } catch (e) { return true; } }
  function startCareer() {
    const st = careerState(); let ch = st.chapter; if (ch >= tuenn.career.length) { ch = 0; try { localStorage.setItem('stuntskoelle.career', JSON.stringify({ chapter: 0, done: true })); } catch (e) { /* ignore */ } }
    careerChapter = ch; const c = tuenn.career[ch]; const def = TRACKS.find((t) => t.id === c.track) || TRACKS[0];
    if (c.type === 'mission') startMission(def); else { missionMode = false; startRace(def); }
    setTimeout(() => { if (careerChapter === ch && phase !== 'menu') sayMust(tuenn, `Kapitel ${ch + 1}, ${c.title}. ${c.intro}`, 5200); }, c.type === 'mission' ? 13500 : 7600);
  }
  function applyCareerResult(ok) {
    const ch = careerChapter, c = tuenn.career[ch]; const st = careerState();
    if (ok) {
      if (st.chapter === ch) { st.chapter = ch + 1; try { localStorage.setItem('stuntskoelle.career', JSON.stringify(st)); } catch (e) { /* ignore */ } }
      const finale = ch + 1 >= tuenn.career.length;
      if (finale) { try { localStorage.setItem('stuntskoelle.countach', '1'); } catch (e) { /* ignore */ } bumpStat('career'); const no = checkOrden(); if (no.length) { newOrden = newOrden.concat(no); const ob = $('#resOrden'); ob.hidden = false; ob.innerHTML = newOrden.map((o) => `<div class="oitem"><canvas class="medal"></canvas><span>NEUER ORDEN: <b>${o.name}</b> · ${o.desc}</span></div>`).join(''); ob.querySelectorAll('canvas').forEach((cv, i) => medalIcon(cv, newOrden[i].color, 2)); } }
      $('#resTitle').textContent = (finale ? 'NACHTSCHICHT BEENDET! ' : `KAPITEL ${ch + 1} JESCHAFFT: ${c.title}. `) + $('#resTitle').textContent;
      $('#resTuenn').textContent = c.outro + (finale ? ' Die Contessa steht im Menü, Jung.' : '');
      $('#againBtn').textContent = finale ? 'NOCHMAL VON VORNE (ENTER)' : 'NÄCHSTES KAPITEL (ENTER)';
    } else { $('#resTitle').textContent = `KAPITEL ${ch + 1} NIT JESCHAFFT (ZIEL: ${goalText(c.goal)}). ` + $('#resTitle').textContent; $('#resTuenn').textContent = pick(tuenn.careerLines.fail); $('#againBtn').textContent = 'KAPITEL NOCHMAL (ENTER)'; }
  }

  // ---------------- dat Hinterzimmer: the second door, cards and dice for Deckel strokes ----------------
  function openClub() {
    if (!window.Club) return; audioInit(); phase = 'club'; idleT = 0;
    $('#menu').hidden = true; $('#records').hidden = true; if ('speechSynthesis' in window) speechSynthesis.cancel();
    window.Club.open({ lines: tuenn.club, portrait: (id, c) => SP.portrait(id, c, 3), getDeckel: () => deckelTotal(0), addDeckel: (n) => deckelTotal(n), beep, stat: bumpStat, onClose: toMenu,
      speak: (name, text) => { const v = VOICES[name] || [0.8, 1]; speak(text, v[0], v[1], true, name); } });
  }

  // ---------------- Klüngel-Auftrag: carry something for dä Lange from A to B ----------------
  function umschlagMesh() {
    const g = new THREE.Group();
    const env = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.75), new THREE.MeshBasicMaterial({ color: 0xf2e4c0 })); env.position.y = 0.6; g.add(env);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.4), new THREE.MeshBasicMaterial({ color: 0xd9c9a0 })); flap.position.set(0, 0.64, 0.05); g.add(flap);
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 10), new THREE.MeshBasicMaterial({ color: 0xc1121f })); seal.position.set(0, 0.66, 0.12); g.add(seal);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.08, 6, 28), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.75 })); halo.rotation.x = Math.PI / 2; halo.position.y = 0.05; g.add(halo);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.9, 6, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })); beam.position.y = 3.2; g.add(beam);
    return g;
  }
  function dropMesh(name) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.18, 6, 32), new THREE.MeshBasicMaterial({ color: 0xff3fa0, transparent: true, opacity: 0.85 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.12; g.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.12, 6, 32), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.7 })); ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.12; g.add(ring2);
    const sign = W.textPlane(name, '#ffffff', '#c1121f', 5, 1.0, true, { border: '#ffd23f', sizeK: 0.5 }); sign.position.y = 3.6; g.add(sign);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 6), new THREE.MeshBasicMaterial({ color: 0x555555 })); post.position.y = 1.6; g.add(post);
    return g;
  }
  function roadFrameAhead(fromS, dist, clear) { // a flat, ordinary piece of road at least `dist` ahead of fromS; `clear` = no stunt within that many metres
    const S = track.samples, L = track.length, n = S.length; let i = Math.floor(((fromS + dist) % L) / track.ds), tries = 0;
    const okAt = (k) => { const q = S[((k % n) + n) % n]; return ['straight', 'curve', 'bridge'].includes(q.kind) && Math.abs(q.p.y) < 1.5; };
    const clearAt = (k) => { if (!clear) return true; const r = Math.round(clear / track.ds); for (let j = -r; j <= r; j += 4) { const q = S[(((k + j) % n) + n) % n]; if (q.kind === 'loop' || q.kind === 'ramp' || q.kind === 'gap' || q.kind === 'tunnel' || q.p.y > 3) return false; } return true; };
    while (tries++ < 400 && !(okAt(i) && clearAt(i))) i += 3;
    i %= n; return { s: i * track.ds, f: TB.frameAt(track, i * track.ds) };
  }
  function startAuftrag() {
    const A = tuenn.auftrag; const what = pick(A.what), where = pick(A.where);
    const a = roadFrameAhead(player.s, 90 + Math.random() * 60), b = roadFrameAhead(a.s, 280 + Math.random() * 220);
    const lat = window.STUNTS_AUFTRAG ? 0 : (Math.random() - 0.5) * 5;
    const m1 = umschlagMesh(); const base = new THREE.Vector3(a.f.p.x, a.f.p.y, a.f.p.z).addScaledVector(new THREE.Vector3(a.f.B.x, a.f.B.y, a.f.B.z), lat).addScaledVector(new THREE.Vector3(a.f.N.x, a.f.N.y, a.f.N.z), 0.5); m1.position.copy(base); scene.add(m1);
    const m2 = dropMesh(where); m2.position.set(b.f.p.x, b.f.p.y + 0.1, b.f.p.z); m2.rotation.y = Math.atan2(b.f.T.x, b.f.T.z); m2.visible = false; scene.add(m2);
    let dist = b.s - a.s; if (dist < 0) dist += track.length;
    auftrag = { stage: 'pickup', s1: a.s, lat, s2: b.s, m1, m2, base, what, where, timer: 40, carryTime: Math.round(dist / 13) + 10, phase: Math.random() * 6 };
    sayMust(tuenn, pick(A.start).replace('{what}', what).replace('{where}', where), 4200);
  }
  function endAuftrag() { if (!auftrag) return; scene.remove(auftrag.m1); scene.remove(auftrag.m2); auftrag = null; }
  function failAuftrag(why) {
    const A = tuenn.auftrag; auftragFail++; deckel = Math.max(0, deckel - 2);
    sayMust(tuenn, pick(why === 'lost' ? A.lost : A.late).replace('{what}', auftrag.what).replace('{where}', auftrag.where), 3600);
    beep(220, 0.3, 'sawtooth', 0.12); endAuftrag(); auftragT = 45 + Math.random() * 25;
  }
  function updateAuftrag(dt) {
    const L = track.length;
    if (!auftrag) {
      if (player.finished || kripo || razzia > 0) return;
      auftragT -= dt; if (auftragT <= 0 && msgTimer <= 0 && auftragDone + auftragFail < 3) startAuftrag();
      return;
    }
    auftrag.timer -= dt;
    if (auftrag.stage === 'pickup') {
      auftrag.m1.rotation.y += dt * 2; auftrag.m1.position.y = auftrag.base.y + Math.sin(raceTime * 3 + auftrag.phase) * 0.2;
      let ds = player.s - auftrag.s1; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
      if (!routeFor(player) && Math.abs(ds) < 4.2 && Math.abs(player.lat - auftrag.lat) < 4.5 && !player.air && player.crashed <= 0) {
        auftrag.stage = 'carry'; auftrag.m1.visible = false; auftrag.m2.visible = true; auftrag.timer = auftrag.carryTime;
        beep(880, 0.08, 'square', 0.1); setTimeout(() => beep(1320, 0.12, 'square', 0.1), 80);
        sayMust(tuenn, pick(tuenn.auftrag.pick).replace('{where}', auftrag.where), 3000);
      } else if (auftrag.timer <= 0) { endAuftrag(); auftragT = 40 + Math.random() * 20; }
    } else {
      const k = 1 + Math.sin(raceTime * 5) * 0.08; auftrag.m2.scale.set(k, 1, k);
      let ds = player.s - auftrag.s2; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
      if (!routeFor(player) && Math.abs(ds) < 4 && !player.air && player.crashed <= 0) {
        auftragDone++; addDeckel(5); player.turbo = 1; bumpStat('jobs'); beep(1180, 0.08, 'square', 0.12); setTimeout(() => beep(1580, 0.1, 'square', 0.12), 80); setTimeout(() => beep(2100, 0.16, 'square', 0.12), 160);
        sayMust(tuenn, pick(tuenn.auftrag.done).replace('{where}', auftrag.where), 3800); endAuftrag(); auftragT = 45 + Math.random() * 25;
      } else if (auftrag.timer <= 0) failAuftrag('late');
    }
  }

  // ---------------- DÄ SCHNELLE front page: the finish photo as tomorrow's paper ----------------
  function drawFrontPage(headline, place, order) {
    const c = $('#resPaper'); if (!c) return; const W2 = 560, H2 = 400; c.width = W2; c.height = H2; const x = c.getContext('2d');
    x.fillStyle = '#f3ecd8'; x.fillRect(0, 0, W2, H2);
    x.fillStyle = '#e6dcc2'; for (let i = 0; i < 40; i++) x.fillRect(Math.random() * W2, Math.random() * H2, 2, 1);
    x.fillStyle = '#c1121f'; x.fillRect(14, 14, W2 - 28, 54);
    x.fillStyle = '#fff'; x.font = 'bold 40px Impact, "Arial Narrow", sans-serif'; x.textBaseline = 'middle'; x.fillText('DÄ SCHNELLE', 26, 42);
    x.font = '11px "Courier New", monospace'; x.textAlign = 'right'; x.fillText('KÖLNS SCHNELLSTES BLATT · 1 DM', W2 - 24, 32); x.fillText(new Date().toLocaleDateString('de-DE'), W2 - 24, 52); x.textAlign = 'left';
    x.fillStyle = '#111'; x.fillRect(14, 74, W2 - 28, 2);
    const words = headline.replace(/^DÄ SCHNELLE:\s*/, '').toUpperCase().split(' '); const lines = []; let cur = ''; x.font = 'bold 26px Impact, "Arial Narrow", sans-serif';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > W2 - 40 && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur);
    let y = 100; for (const ln of lines.slice(0, 3)) { x.fillText(ln, 20, y); y += 30; }
    const py = y + 4, ph = H2 - py - 66, pw = 330;
    x.fillStyle = '#111'; x.fillRect(18, py - 2, pw + 4, ph + 4);
    const finishPhoto = () => { x.fillStyle = '#111'; x.font = '10px "Courier New", monospace'; x.fillText('Foto: Klüngel-Presse · ' + trackDef.name, 20, py + ph + 13); };
    if (lastShot) { const img = new Image(); img.onload = () => { const r = Math.max(pw / img.width, ph / img.height); const sw = pw / r, sh = ph / r; x.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 20, py, pw, ph); finishPhoto(); }; img.src = lastShot; }
    else { x.fillStyle = '#556'; x.fillRect(20, py, pw, ph); x.fillStyle = '#fff'; x.font = '12px "Courier New", monospace'; x.fillText('(Foto folgt – der Fotograf trinkt noch)', 40, py + ph / 2); finishPhoto(); }
    const sx = 20 + pw + 14; x.fillStyle = '#111'; x.font = 'bold 13px "Courier New", monospace'; let sy = py + 14; const line = (t, bold) => { x.font = (bold ? 'bold ' : '') + '11px "Courier New", monospace'; x.fillText(t, sx, sy); sy += 15; };
    line('AUS DEM POLIZEIBERICHT', true); line(`Platz ${place} von ${order.length}`); line(`Zeit ${fmtTime(player.finishTime)}`); line(`Fahrer: ${PLAYABLE[sel.driver].name}`); line(`Karre: ${D.CARS[sel.car].name}`); sy += 6;
    line(`Knöllchen: ${knoellchen}`); line(`Kölsch: ${koelsch}`); line(`Deckel: ${deckel} Striche`); if (auftragDone || auftragFail) line(`Klüngel: ${auftragDone} erledigt`); if (kripoSeen) line(`Kripo: ${kripoCaught ? 'erwischt' : 'abjehängt'}`); sy += 6;
    line('WETTER', true); line(theme.night ? 'Nacht, Neon, 11°' : theme.wet ? 'Regen, nasse Ringe' : theme.dawn ? 'Morgengrauen, 8°' : theme.dusk || theme.sunset ? 'Blaue Stunde, 17°' : 'Sonne, Kölsch kalt');
    x.fillStyle = '#c1121f'; x.font = 'bold 13px "Courier New", monospace'; x.fillText('DÄ LANGE: „' + pick(['Ich hab nix jesehe.', 'Kein Kommentar. Kölsch?', 'Dat wor Klüngel, kein Verbreche.', 'Man kennt sich.', 'Ich wor an der Tür. Die janze Zeit.']) + '“', 20, py + ph + 34);
    x.fillStyle = '#111'; x.font = '9px "Courier New", monospace'; x.textAlign = 'center'; x.fillText('DÄ SCHNELLE · Klüngel-Presse Köln-Ehrenfeld · Alle Angaben ohne Jewähr, alle Namen un Blätter erfunden', W2 / 2, H2 - 14); x.textAlign = 'left';
  }
  function shareFrontPage() {
    const c = $('#resPaper'); if (!c) return; const btn = $('#paperBtn'); const done = (m) => { btn.textContent = m; setTimeout(() => { btn.textContent = '📰 TITELSEITE TEILEN'; }, 2500); };
    c.toBlob((blob) => {
      if (!blob) return; const file = new File([blob], 'dae-schnelle-koelle4d.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'DÄ SCHNELLE – KÖLLE 4D', text: lastHeadline }).then(() => done('JETEILT')).catch(() => {}); return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'dae-schnelle-koelle4d.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); done('JESPEICHERT');
    }, 'image/png');
  }

  // ---------------- attract mode: the cabinet plays itself and tells the story ----------------
  function startDemo() {
    if (phase !== 'menu') return;
    demo = true; demoT = 0; cup.on = false; demoPrevCam = camMode;
    const def = TRACKS[Math.floor(Math.random() * TRACKS.length)];
    startRace(def, () => { camMode = 3; tvCam = null; });
    document.body.classList.add('demo'); const d = $('#demo'); d.hidden = false;
    const crawl = $('#demoCrawl'); crawl.innerHTML = tuenn.vorspann.map((l, i) => `<p class="${i === 0 || i === tuenn.vorspann.length - 1 ? 'big' : ''}">${l}</p>`).join('');
    crawl.style.animation = 'none'; void crawl.offsetWidth; crawl.style.animation = '';
  }

  function tuennsTelefon() {
    if (!telefon.ready || telefon.active > 0) { sayMust(tuenn, 'Besetzt, Jung. Ich telefonier nur eimol pro Rund.', 2000); return; }
    telefon.ready = false; telefon.active = 6; telefon.used++;
    if (kripo) { endKripo('off'); sayMust(tuenn, pick(tuenn.kripo.off), 3500); } else sayMust(tuenn, pick(tuenn.tuennsTelefon), 3500);
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
    const L = track.length, S = track.samples, n = Math.max(4, Math.floor(L / (theme.koelschRich ? 110 : 230)));
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
    if (promille > 0) { promille -= dt; if (promille <= 0) sayMust(tuenn, pick(tuenn.promilleEnd), 2200); }
    const L = track.length;
    for (const p of pickups) {
      if (p.taken) continue;
      p.mesh.rotation.y += dt * 2.2; p.mesh.position.y = p.base.y + Math.sin(pickT * 3 + p.phase) * 0.22;
      let ds = player.s - p.s; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
      if (!routeFor(player) && Math.abs(ds) < 3.6 && Math.abs(player.lat - p.lat) < 2.0 && !player.air && player.crashed <= 0) {
        p.taken = true; p.mesh.visible = false; koelsch++; koelschLap++; addDeckel(1); player.turbo = Math.min(1, player.turbo + 0.3);
        if (koelschLap >= 5 && promille <= 0) { promille = 7; sayMust(tuenn, pick(tuenn.promille), 3200); }
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
    scene.add(mesh); sayMust(KRIPO, pick(tuenn.kripo.start), 3500);
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
    if (sameRoad(player, kripo) && kripoHitCool <= 0 && Math.abs(ds) < 4.8 && Math.abs(player.lat - kripo.lat) < 2.4 && !player.air && !kripo.air && player.crashed <= 0 && kripo.crashed <= 0 && pk !== 'loop' && pk !== 'ramp') {
      kripoHitCool = 2.4; player.damage = Math.min(1, player.damage + 0.14); player.v *= 0.82; player.lat += (player.lat >= kripo.lat ? 1 : -1) * 1.3; kripo.v *= 0.9; crashSound(); shake = 0.6;
      if (player.damage >= 1) { kripoCaught = true; crash(player, 'kripo'); sayMust(KRIPO, pick(tuenn.kripo.caught), 3000); endKripo('caught'); if (mission) missionEnd(false, 'caught'); return; }
      say(KRIPO, pick(tuenn.kripo.hit), 2200);
    }
    if (mission) { if (ds < -170 || ds > 170) { kripo.s = ((player.s - 100) % L + L) % L; kripo.lat = 0; kripo.v = Math.max(15, player.v * 0.9); kripo.safeS = kripo.s; } }
    else if (kripoT > 55 || ds < -140) endKripo('giveup');
  }
  let kripoEndT = -99;
  function endKripo(why) {
    kripoEndT = raceTime;
    if (!kripo) return; scene.remove(kripo.mesh); kripo = null;
    if (why === 'giveup') sayMust(KRIPO, pick(tuenn.kripo.giveup), 3000);
    if (why !== 'caught') bumpStat('escapes');
  }
  function offerWette() {
    const cands = racers.filter((r) => r.isAI && r !== player2); if (!cands.length) return;
    const r = pick(cands); wette = { rival: { name: r.driver.name, r }, n: 1 + Math.floor(Math.random() * 3), done: false, won: false };
    sayMust(tuenn, pick(tuenn.wette.offer).replace('{r}', r.driver.name).replace('{n}', String(wette.n)), 4200);
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
    if (done) { // Siegerehrung: the top three on Kölsch crates in front of the Brauhaus
      const pod = document.createElement('div'); pod.className = 'podium';
      [1, 0, 2].forEach((k) => { const e = rows[k]; if (!e) return; const d = e[0] === 'DU' ? PLAYABLE[sel.driver] : D.DRIVERS.find((x) => x.name === e[0]); const el = document.createElement('div'); el.className = 'step s' + k; el.innerHTML = `<canvas></canvas><b>${k + 1}.</b><span>${e[0] === 'DU' ? 'DU' : e[0].toUpperCase()}</span><i>${e[1]} PKT.</i>`; pod.appendChild(el); if (d) SP.portrait(d.id, el.querySelector('canvas'), 3); });
      box.appendChild(pod);
    }
    if (done) { const line = myPos === 1 ? pick(tuenn.cup.champion) : myPos <= 3 ? pick(tuenn.cup.podium) : pick(tuenn.cup.loser); $('#resTuenn').textContent = line; try { const wins = parseInt(localStorage.getItem('stuntskoelle.cupwins') || '0') || 0; if (myPos === 1) { bumpStat('cupWins'); const no = checkOrden(); if (no.length) newOrden = newOrden.concat(no); } if (myPos === 1) localStorage.setItem('stuntskoelle.cupwins', String(wins + 1)); } catch (e) { /* ignore */ } }
    else setTimeout(() => { if (phase === 'finished') say(tuenn, pick(tuenn.cup.next), 3000); }, 2500);
  }

  // ---------------- replay ----------------
  function recordFrame(dt) {
    rec.acc += dt; if (rec.acc < 0.05 || rec.frames.length > 6000) return; rec.acc = 0;
    const f = new Float32Array(racers.length * 6);
    racers.forEach((r, i) => { f[i * 6] = r.s + r.lap * track.length; f[i * 6 + 1] = r.lat; f[i * 6 + 2] = r.air ? r.y : -999; f[i * 6 + 3] = r.steerVis; f[i * 6 + 4] = r.crashed > 0 ? 1 : 0; f[i * 6 + 5] = r.shortcut; });
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
      const S = a[k * 6] + (b[k * 6] - a[k * 6]) * u; r.lap = Math.floor(S / track.length); r.s = S - r.lap * track.length;
      r.lat = a[k * 6 + 1] + (b[k * 6 + 1] - a[k * 6 + 1]) * u; const ya = a[k * 6 + 2], yb = b[k * 6 + 2]; r.air = ya > -900 && yb > -900; r.y = r.air ? ya + (yb - ya) * u : 0; r.steerVis = a[k * 6 + 3]; r.crashed = a[k * 6 + 4] > 0.5 ? 1 : 0; r.v = 30;
      r.shortcut = playbackRoute(r.s, a[k * 6 + 5], b[k * 6 + 5]);
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
  function playbackRoute(s, a, b) {
    for (const id of [a, b]) { const q = track.shortcuts[id]; if (q && s >= q.startS && s <= q.endS) return id; }
    return -1;
  }
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
    const routes = ghostData.routes || [], route = playbackRoute(s, routes[i], routes[Math.min(i + 1, T.length - 1)]);
    const f = racerFrame({ s, shortcut: route }); const B = new THREE.Vector3(f.B.x, f.B.y, f.B.z), N = new THREE.Vector3(f.N.x, f.N.y, f.N.z), Tt = new THREE.Vector3(f.T.x, f.T.y, f.T.z);
    ghost.position.set(f.p.x, f.p.y, f.p.z).addScaledVector(B, lat).addScaledVector(N, f.surfaceOffset || 0.1);
    const right = new THREE.Vector3().crossVectors(N, Tt).normalize(); _m.makeBasis(right, N, Tt); ghost.quaternion.setFromRotationMatrix(_m);
  }
  function saveGhost() {
    if (!player.bestLap || player.laps.length === 0 || rec.frames.length < 10) return;
    const old = ghostData; if (old && old.time <= player.bestLap + 0.01) return;
    // find the best lap window in the recording
    let start = 0; let bestIdx = player.laps.indexOf(player.bestLap); for (let k = 0; k < bestIdx; k++) start += player.laps[k];
    const end = start + player.bestLap; const t = [], sArr = [], l = [], routes = [];
    for (let i = 0; i < rec.frames.length; i++) { const tt = rec.t[i]; if (tt < start || tt > end) continue; const f = rec.frames[i]; t.push(Math.round((tt - start) * 100) / 100); sArr.push(Math.round((f[0] % track.length) * 10) / 10); l.push(Math.round(f[1] * 10) / 10); routes.push(f[5]); }
    if (t.length < 10) return;
    try { localStorage.setItem(ghostKey(), JSON.stringify({ time: player.bestLap, t, s: sArr, l, routes })); } catch (e) { /* ignore */ }
  }

  // ---------------- share links for Baukasten tracks ----------------
  const PIECE_CODE = { straight: 'g', lcurve: 'l', rcurve: 'r', lbank: 'L', rbank: 'R', hill: 'h', dip: 'd', loop: 'o', jump: 'j', jumphouse: 'J', cork: 'c', bridge: 'b', tunnel: 't' };
  function encodeTrack(def) { const code = def.segments.map((sg) => { const p = PIECES.find((q) => q.seg.t === sg.t && (q.seg.angle == null || Math.sign(q.seg.angle) === Math.sign(sg.angle)) && (!!q.seg.bank === !!sg.bank) && (!!q.seg.over === !!sg.over)) || PIECES[0]; return PIECE_CODE[p.id]; }).join(''); const base = TRACKS.findIndex((t) => t.theme === def.theme); return `#s=${code}&k=${Math.max(0, base)}&n=${encodeURIComponent(def.name)}`; }
  function decodeTrackHash(hash) {
    const params = new URLSearchParams(hash.replace(/^#/, '')), code = params.get('s');
    if (!code || !/^[gLlRrhdojJcbt]{4,40}$/.test(code)) return null;
    const k = parseInt(params.get('k') || '4'); const n = params.get('n') || 'Link-Streck';
    const inv = {}; for (const id in PIECE_CODE) inv[PIECE_CODE[id]] = id;
    const pieces = code.split('').map((c) => inv[c]).filter(Boolean); if (pieces.length < 4) return null;
    ed.pieces = pieces; ed.base = Number.isFinite(k) ? clamp(k, 0, TRACKS.length - 1) : 4; $('#edName').value = n.slice(0, 24);
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
    labelBtn($('#p2Btn'), twoPlayer ? '2 SPIELER: AN' : '2 SPIELER: AUS');
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
    daily = dailyDef(0); sel.track = clamp(sel.track | 0, 0, allTracks().length - 1); sel.car = clamp(sel.car | 0, 0, D.CARS.length - 1); sel.driver = clamp(sel.driver | 0, 0, PLAYABLE.length - 1);
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
    $('#startBtn').onclick = () => { cup.on = false; careerChapter = null; missionMode = false; lockLandscape(); startRace(); };
    $('#quickStartBtn').onclick = () => $('#startBtn').click();
    $('#againBtn').onclick = () => { if (careerChapter != null) { startCareer(); return; } if (missionMode) { startMission(missionDef); return; } if (cup.on) { if (cup.i >= TRACKS.length) { cup.on = false; toMenu(); return; } startRace(TRACKS[cup.i]); } else startRace(); };
    $('#missionBtn').onclick = () => { careerChapter = null; cup.on = false; lockLandscape(); startMission(activeTrackDef()); }; $('#careerBtn').onclick = () => { cup.on = false; lockLandscape(); startCareer(); }; $('#hudPrompt').onclick = () => missionAction();
    $('#cupBtn').onclick = () => { cup.on = true; careerChapter = null; missionMode = false; cup.i = 0; cup.pts = {}; startRace(TRACKS[0]); };
    $('#menuBtn').onclick = toMenu;
    $('#shareBtn').onclick = () => {
      const url = location.href.split('#')[0]; const text = `KÖLLE 4D – ${trackDef.name}: Platz ${lastPlace}, ${fmtTime(player.finishTime)}. ${lastHeadline.replace('DÄ SCHNELLE: ', '')} · Bierdeckel: ${deckel} Striche. Fahr selbst: `;
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
    $('#voiceBtn').onclick = toggleVoice; $('#voicePickBtn').onclick = nextVoice;
    $('#tiltBtn').onclick = toggleTilt; updateTiltUI(); if (!isMobile) $('#tiltBtn').hidden = true;
    voiceInit();
    for (const id of ['turboBar2']) { const el = document.getElementById(id); for (let i = 0; i < 10; i++) el.appendChild(document.createElement('i')); }
    // a track shared by link?
    const linked = decodeTrackHash(location.hash);
    if (linked) { customTracks = customTracks.filter((t) => t.id !== linked.id); customTracks.push(linked); sel.track = allTracks().length - 1; try { localStorage.setItem('stuntskoelle.custom', JSON.stringify(customTracks)); } catch (e) { /* ignore */ } renderMenu(); setTimeout(() => { $('#langerQuote').textContent = '„Ne Link-Streck: ' + linked.name + '. Jemand hät dir wat jebaut. Fahr et, Jung!“'; }, 50); }
    musicInit();
    for (const ev of ['pointerdown', 'wheel', 'touchstart']) document.addEventListener(ev, () => { idleT = 0; if (demo) toMenu(); }, { passive: true });
    $('#clubBtn').onclick = openClub; $('#clubBack').onclick = toMenu;
    $('#saveExport').onclick = () => { const c = exportSave(); $('#saveCode').value = c; $('#saveMsg').textContent = 'Code kopieren un am anderen Jerät einfügen.'; if (navigator.clipboard) navigator.clipboard.writeText(c).then(() => { $('#saveMsg').textContent = 'Code kopiert. Am anderen Jerät einfügen un ÜBERNEHMEN drücken.'; }).catch(() => {}); };
    $('#saveImport').onclick = () => { $('#saveMsg').textContent = importSave($('#saveCode').value); };
    $('#paperBtn').onclick = shareFrontPage; $('#demoBtn').onclick = startDemo; $('#hornBtn').onclick = horn; $('#tHorn').addEventListener('touchstart', (e) => { e.preventDefault(); horn(); }, { passive: false });
    document.addEventListener('touchstart', () => { if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume(); if (phase !== 'menu' && music.wanted && music.el && music.el.paused && !music.muted) musicPlay(); }, { passive: true });
    phase = 'menu';
    requestAnimationFrame(frame);
  }
  function drawBanner() {
    SP.logo($('#logo'), 560, 140);
    SP.skyline($('#skyline'), Math.max(600, window.innerWidth), 150);
    SP.portrait('langer', $('#langerFace'), 5);
    SP.portrait('langer', $('#langerFace2'), 4);
    SP.portrait('langer', $('#resFace'), 5); if ($('#loadingFace')) SP.portrait('langer', $('#loadingFace'), 6);
    if ($('#rotateArt')) SP.carSide(D.CARS[0], $('#rotateArt'));
    // arcade cabinet pixel art: button icons, joystick and buttons, blinking coin, chunky frames
    $('#cupBtn').textContent = `KÖLSCH-CUP (${TRACKS.length} STRECKEN)`; { const st = careerState(); $('#careerBtn').textContent = st.chapter >= tuenn.career.length ? 'KARRIERE: NACHTSCHICHT BEENDET · NOCHMAL' : `KARRIERE · KAPITEL ${st.chapter + 1}/${tuenn.career.length}: ${tuenn.career[st.chapter].title}`; }
    for (const b of document.querySelectorAll('#menu button[data-icon]')) labelBtn(b, b.textContent.trim());
    if ($('#joyArt')) { SP.joystick($('#joyArt'), 2); SP.joystick($('#joyArt2'), 2); }
    if ($('#coinArt')) { SP.icon('coin', $('#coinArt'), 1); SP.icon('coin', $('#coinArt2'), 1); let on = true; setInterval(() => { on = !on; for (const id of ['#coinArt', '#coinArt2']) { const c = $(id); if (c) c.style.visibility = on ? 'visible' : 'hidden'; } }, 500); }
    if (SP.frameTile) { const tile = SP.frameTile([106, 63, 160]); for (const pnl of document.querySelectorAll('#menu .panel')) { pnl.style.borderImage = `url(${tile}) 8 repeat`; pnl.style.borderWidth = '8px'; pnl.style.borderStyle = 'solid'; } }
  }
  window.STUNTS_STATS = () => renderer && { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries };
  window.STUNTS_PROPS = () => scenery ? scenery.props.map((p) => ({ type: p.userData.type, x: p.position.x, y: p.position.y, z: p.position.z, rot: p.rotation.y })) : [];
  window.STUNTS_MISSION = (t) => startMission(t != null ? allTracks()[t] : activeTrackDef()); window.STUNTS_CAREER = startCareer; window.STUNTS_ACT = missionAction;
  window.STUNTS_TELEPORT = (s, v, lat) => { if (player) { player.s = s; player.v = v || 0; player.lat = lat || 0; player.safeS = s; player.shortcut = -1; player.air = false; player.vy = 0; player.prevRoadVy = 0; player.crashed = 0; placeRacer(player, 1); } };
  window.STUNTS_WALK = (x, z) => { if (mission && mission.walker) { mission.walker.position.x = x; mission.walker.position.z = z; } }; window.STUNTS_MISSION_STATE = () => mission && { stage: mission.stage, pickS: mission.pickS, dropS: mission.dropS, timer: Math.round(mission.timer), door: mission.doorPos && [mission.doorPos.x, mission.doorPos.z], car: player.mesh.position.toArray().map(Math.round), walker: mission.walker && mission.walker.position.toArray().map((v) => Math.round(v)) };
  window.STUNTS_DAILY = dailyDef; window.STUNTS_CUP_END = () => { cup.on = true; cup.i = TRACKS.length - 1; cup.pts = { DU: 80, 'Klüngel Tom': 76, 'Schäl': 70, 'Tünnes': 60 }; }; window.STUNTS_ORDEN = () => ({ stats: getStats(), orden: getOrden() });
  window.STUNTS_KOELSCH = koelschify; window.STUNTS_DRUNK = drunkify;
  window.STUNTS_DEBUG = () => ({ phase, auftrag: auftrag && { stage: auftrag.stage, timer: Math.round(auftrag.timer), s1: Math.round(auftrag.s1), s2: Math.round(auftrag.s2), where: auftrag.where }, auftragDone, auftragFail, deckel, player: player && { pos: player.frame && [player.frame.pos.x, player.frame.pos.y, player.frame.pos.z], fwd: player.frame && [player.frame.fwd.x, player.frame.fwd.z], s: player.s, lat: player.lat, v: player.v, lap: player.lap, shortcut: player.shortcut, air: player.air, crashed: player.crashed, finished: player.finished, turbo: player.turbo, damage: player.damage, y: player.y, vy: player.vy, lastCrash: player.lastCrash }, racers: racers.length, raceTime, trackLen: track && track.length, standings: racers.length ? standings().map((r) => r.name) : [] });
  window.STUNTS_ROUTES = () => track ? track.shortcuts.map(({ samples, ...r }) => r) : [];
  window.STUNTS_DRIVE_STEPS = (n, ctl) => { for (let i = 0; i < Math.min(n, 6000); i++) { raceTime += 1 / 60; updateRacer(player, 1 / 60, ctl || (window.STUNTS_AUTOPILOT ? aiControl(player, 1 / 60) : input)); placeRacer(player, 1 / 60); recordFrame(1 / 60); } updateHUD(); return window.STUNTS_DEBUG(); };
  window.STUNTS_REPLAY_AT = (t) => { startReplay(); replay.time = t; replay.paused = true; replayStep(0); return window.STUNTS_DEBUG(); };
  window.STUNTS_SET_CAM = (m) => { camMode = m; };
  window.STUNTS_SCENE = () => scene;
  window.STUNTS_RAZZIA = () => { razzia = 8; razziaBlink = 0; sayMust(tuenn, pick(tuenn.razzia), 3500); };
  window.STUNTS_PROMILLE = () => { promille = 7; sayMust(tuenn, pick(tuenn.promille), 3200); };
  window.STUNTS_EXTRAS = () => ({ tilt: { mode: tilt.mode, raw: tilt.raw, zero: tilt.zero, val: tilt.val, steer: input.steer }, razzia, promille, koelschLap, deckel, koelsch, knoellchen, kripo: !!kripo, kripoSeen, kripoCaught, wette: wette && { rival: wette.rival.name, n: wette.n, done: wette.done, won: wette.won }, taken: pickups.filter((p) => p.taken).length, pickups: pickups.length, crashes, cup: { on: cup.on, i: cup.i, pts: cup.pts } });
  window.STUNTS_FRAME = (sPos) => { const f = TB.frameAt(track, sPos); return { p: [f.p.x, f.p.y, f.p.z], T: [f.T.x, f.T.y, f.T.z], N: [f.N.x, f.N.y, f.N.z], len: track.length, kind: f.kind }; };
  window.STUNTS_FIELD = () => racers.map((r) => ({ name: r.name, s: r.s, lap: r.lap, v: r.v, crashed: r.crashed > 0, air: r.air, ai: r.isAI, finished: !!r.finished, damage: r.damage }));
  window.STUNTS_NEAR = (r) => { const out = []; const pp = player.frame.pos; scene.traverse((o) => { if (!o.isMesh) return; const wp = new THREE.Vector3(); o.getWorldPosition(wp); if (wp.distanceTo(pp) < r) { const m = Array.isArray(o.material) ? o.material[0] : o.material; out.push({ d: Math.round(wp.distanceTo(pp)), col: m.color ? m.color.getHexString() : '-', parent: o.parent && o.parent.userData && o.parent.userData.type, vc: !!m.vertexColors, n: o.geometry.attributes.position.count }); } }); return out.slice(0, 40); };
  window.STUNTS_KOELSCH = koelschify; window.STUNTS_DRUNK = drunkify;
  window.STUNTS_FINISH = () => { for (const r of [player, player2]) if (r) { r.shortcut = -1; r.lap = trackDef.laps; r.s = track.length - 3; r.v = 30; } };
  if (typeof THREE === 'undefined') {
    document.body.innerHTML = '<div style="color:#fff;font:20px sans-serif;padding:40px">Three.js konnte nicht geladen werden. Dä Lange sagt: Internet anmachen, Jung.</div>';
  } else {
    init();
  }
})();
