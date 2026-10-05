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
  const FLIGHT_G = 2; // a jump flies on twice the gravity: the landing zone then asks for 90 to 150 km/h, not "full throttle always works"
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  // on the 1968/1975 tracks nothing from later decades: no opera renovation jokes, no LamboGina radio, no Miami palms
  const ERA_LATER = /Oper|LamboGina|Palme|Miami|KVK|Linie 16|Bahn streik|Hochwasser|Tauben/;
  const eraLines = (arr) => { if (!theme || !theme.era) return arr; const ok = arr.filter((t) => !ERA_LATER.test(t)); return ok.length ? ok : arr; };
  // pick without repeating the last few lines of the same list (heist calls, Kripo restarts)
  // the memory is cleared at every start, so within one race a list gives each of its lines once before any comes back
  const recent = new Map(); const pickNew = (arr) => { const seen = recent.get(arr) || []; const fresh = arr.filter((x) => !seen.includes(x)); const t = pick(fresh.length ? fresh : arr); seen.push(t); while (seen.length > Math.max(0, arr.length - 1)) seen.shift(); recent.set(arr, seen); return t; };
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
  let msgPrio = 0; // what the message box shows now: 0 flavour, 1 a side-street note or place story (told once), 2 a line the player needs (sayMust)
  let lastT = 0, msgTimer = 0, tvCam = null, tvTimer = 0, shake = 0, lastPos = null;
  let radioTimer = 45, storyCool = 0, eventTimer = 30, blitzers = [], knoellchen = 0, koelsch = 0, flashTimer = 0, signals = [];
  let stories = [], telefon = { ready: true, active: 0, used: 0 };
  let player2 = null, twoPlayer = false, camera2 = null;
  // Chicago am Rhein extras: beer-mat score, Kölsch pickups, the Kripo chase, the doorman's bet, the Kölsch-Cup
  let deckel = 0, pickups = [], kripo = null, kripoT = 0, kripoHitCool = 0, sirenT = 0, wette = null, crashes = 0, waterCrashes = 0, kripoCaught = false, kripoSeen = false, lastLapSeen = 1, pickT = 0;
  const cup = { on: false, i: 0, pts: {} }; const CUP_PTS = [12, 10, 8, 6, 5, 4, 3, 2, 1, 1];
  const KRIPO = { name: 'Kripo Kölle', emoji: '🚓' };
  let razzia = 0, razziaBlink = 0, promille = 0, promilleDone = false, koelschLap = 0, lastHeadline = '', lastPlace = 0;
  // Klüngel-Auftrag (courier job for dä Lange), the DÄ SCHNELLE front page photo and the arcade attract mode
  let demoPrevCam = 0, daily = null, introT = 0, hornCool = 0, newOrden = [];
  // Botengang missions (on foot and back in the car with the Kripo behind) and the Karriere (Nachtschicht)
  let mission = null, missionMode = false, missionDef = null, careerChapter = null, walkT = 0;
  let auftrag = null, auftragT = 40, auftragDone = 0, auftragFail = 0, shotWanted = false, lastShot = null, airShot = null, airBest = 0, airNow = 0, airShotT = -9, demo = false, demoT = 0, idleT = 0;
  const views = [{ pos: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), look: new THREE.Vector3(), mode: 0, tv: null, tvTimer: 0 }, { pos: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), look: new THREE.Vector3(), mode: 0, tv: null, tvTimer: 0 }];
  const input2 = { gas: 0, brake: 0, steer: 0, turbo: 0 };
  // replay recorder: a typed ring buffer for 30 min at 20 Hz; per frame and racer REC_F values (see recordFrame)
  const REC_HZ = 20, REC_CAP = 30 * 60 * REC_HZ, REC_F = 9;
  const rec = { buf: null, t: new Float64Array(REC_CAP), n: 0, head: 0, stride: REC_F, acc: 0, cars: [] };
  const replay = { on: false, time: 0, speed: 1, paused: false, camIdx: -1, cams: [], mode: 0 };
  let ghost = null, ghostData = null, ghostHidden = false;          // best-lap ghost (G hides it, the splits stay)
  // race modes (menu: MODUS, RUNDEN, KLÜNGEL): RENNEN = the field of ten; ZEITFAHREN = alone against the clock and the ghost
  // (no rivals, Blitzer, Razzia, Kripo, Auftrag or pedestrians); STADTRUNDFAHRT = no rivals or Blitzer, 60 km/h and every
  // story in track order. 1 or 3 laps. Cup, career, Botengang and the attract demo are always RENNEN over the track's laps.
  const MODES = ['RENNEN', 'ZEITFAHREN', 'STADTRUNDFAHRT'], MODE_KEY = ['race', 'tt', 'tour'], TOUR_V = 16.6; // 60 km/h
  const raceOpts = { mode: 0, laps: 3, kluengel: true };
  try { const o = JSON.parse(localStorage.getItem('stuntskoelle.mode') || 'null'); if (o) { raceOpts.mode = clamp(o.mode | 0, 0, 2); raceOpts.laps = o.laps === 1 ? 1 : 3; raceOpts.kluengel = o.kluengel !== false; } } catch (e) { /* ignore */ }
  let raceMode = 0, raceLaps = 3; // the race being driven
  const tourRide = (r) => raceMode === 2 && !!r && !r.isAI && !r.isCop; // the Stadtrundfahrt's own rules apply to the players' cars
  // LENKHILFE (steering assist): AUTO = on for LEICHT drivers, on touch and in EIN-DAUMEN mode; never in ZEITFAHREN
  const LENK = ['AUTO', 'AN', 'AUS']; let lenk = 0; try { lenk = Math.max(0, LENK.indexOf(localStorage.getItem('stuntskoelle.lenkhilfe') || 'AUTO')); } catch (e) { /* ignore */ }
  // DAUMEN (touch only): ZWEI = the buttons, EINS = gas always on, the left 45 % of the screen is a steering strip
  let thumb = 2; try { thumb = localStorage.getItem('stuntskoelle.thumb') === '1' ? 1 : 2; } catch (e) { /* ignore */ }
  const oneThumb = () => thumb === 1 && isTouch;
  function assistOn(p2) { if (raceMode === 1) return false; if (!p2 && oneThumb()) return true; if (lenk) return lenk === 1; return (PLAYABLE[sel.driver].diffN || 0) === 0 || (!p2 && isTouch); }
  // split times: four checkpoints per lap (a quarter, half, three quarters, the line), compared with the ghost or the race's best lap
  const CP = [0.25, 0.5, 0.75, 1]; let splitLog = [], splitShow = null;
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
  // a Tusch like the Sitzungskapelle plays it: three short brass chords and a long one
  function tusch() { const ch = [[262, 330, 392], [262, 330, 392], [262, 330, 392], [349, 440, 523]]; ch.forEach((c, i) => setTimeout(() => c.forEach((f) => beep(f, i === 3 ? 0.8 : 0.13, 'sawtooth', 0.05)), i * 170)); }
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
  function updateMusicUI() { const t = music.el ? '♪ ' + music.title : '♪ Chiptune (eigenen Song laden)'; $('#musicTitle').textContent = t; try { updateJuke(); } catch (e) { /* the menu is not built yet */ } } // the jukebox label follows the loaded song
  function chipStart() {
    if (!audio.ctx || music.chip || music.muted) return;
    const ctx = audio.ctx, g = ctx.createGain(); g.gain.value = 0.05; g.connect(ctx.destination);
    const bass = ctx.createOscillator(); bass.type = 'square'; const lead = ctx.createOscillator(); lead.type = 'triangle';
    const lg = ctx.createGain(); lg.gain.value = 0.6; lead.connect(lg); lg.connect(g); bass.connect(g); bass.start(); lead.start();
    const chords = [[0, 4, 7], [5, 9, 12], [7, 11, 14], [9, 12, 16]]; const root = 110; let step = 0;
    const tick = () => { const c = chords[Math.floor(step / 8) % 4]; const n = c[step % 3]; const oct = step % 2 ? 2 : 1;
      bass.frequency.setValueAtTime(root * Math.pow(2, c[0] / 12) * (step % 4 < 2 ? 1 : 0.5), ctx.currentTime);
      lead.frequency.setValueAtTime(root * 2 * Math.pow(2, n / 12) * oct, ctx.currentTime); step++; };
    music.chip = { g, timer: setInterval(tick, 150), stop: () => { bass.stop(); lead.stop(); g.disconnect(); } };
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

  // ---------------- LamboGina: the title song drives the menu (jukebox, beat, the white wedge over the skyline) ----------------
  const juke = { on: true, started: false, fx: null, ctx: null, carX: -40, lastDraw: 0, sec: '' };
  try { juke.on = localStorage.getItem('stuntskoelle.jukebox') !== 'off' && localStorage.getItem('stuntskoelle.music') !== '0'; } catch (e) { /* ignore */ }
  if (window.LamboBeat) window.LamboBeat.attach(() => ({ el: music.el, title: music.title }));
  const beatNow = () => (window.LamboBeat ? window.LamboBeat.now() : { pulse: 0, energy: 0.3, section: 'a', playing: false, song: false, beat: 0, rise: 0 });
  const SECTION_KOELSCH = { a: 'STROPH', b: 'REFRAIN', rise: 'JLEICH KÜTT ET …', drop: 'DÄ BASS!', end: 'US' };
  // in the race the song is part of the drive: dä Lange calls the hook and the riser, and in the long bass run
  // the player's turbo recharges twice as fast (only while the song really plays)
  let raceStunts = 0, bassRun = false, hookSaid = 0, dropSaid = -99, riseSaid = -99, lamboLines = 0, jeckSaid = 0; // the song talks at most four times a race, never twice in a minute
  if (window.LamboBeat) window.LamboBeat.onSection((sec) => {
    bassRun = sec === 'drop' && phase === 'race';
    if (phase !== 'race' || !tuenn.lambo) return;
    if (sec === 'drop') { if (raceTime - dropSaid > 60 && lamboLines < (theme && theme.confetti ? 1 : 4)) { dropSaid = raceTime; lamboLines++; lamboSay(tuenn.lambo.drop, 3200); } document.body.classList.add('bassrun'); bumpStat('bassRuns'); }
    else document.body.classList.remove('bassrun');
    if (sec === 'rise' && raceTime - riseSaid > 60 && lamboLines < (theme && theme.confetti ? 1 : 4)) { riseSaid = raceTime; lamboLines++; lamboSay(tuenn.lambo.rise, 2600); }
    if (sec === 'b' && raceTime - hookSaid > 60 && lamboLines < (theme && theme.confetti ? 1 : 4)) { hookSaid = raceTime; lamboLines++; lamboSay(tuenn.lambo.hook, 2400); }
  });
  // the first song line a player ever hears explains dä weiße Keil (the dream car the career unlocks); after that the usual lines
  function lamboSay(pool, ms) {
    let first = false; try { first = !!tuenn.lambo.keil && localStorage.getItem('stuntskoelle.keil') !== '1'; } catch (e) { /* ignore */ }
    if (!first) return say(tuenn, pickNew(pool), ms);
    const ok = say(tuenn, tuenn.lambo.keil.t, 5600, false, { hd: tuenn.lambo.keil.hd }); if (ok) try { localStorage.setItem('stuntskoelle.keil', '1'); } catch (e) { /* ignore */ }
    return ok;
  }
  function jukeStart() { if (!juke.on || phase !== 'menu' || music.muted || demo) return; juke.started = true; musicPlay(); updateJuke(); }
  function jukeToggle() {
    juke.on = !juke.on; try { localStorage.setItem('stuntskoelle.jukebox', juke.on ? 'on' : 'off'); } catch (e) { /* ignore */ }
    if (juke.on) jukeStart(); else if (phase === 'menu') musicStop(); updateJuke();
  }
  function updateJuke() {
    const b = $('#jukeBtn'); if (!b) return;
    const st = beatNow(), playing = st.playing;
    const title = music.el ? music.title.toUpperCase() : 'CHIPTUNE';
    b.classList.toggle('on', playing); b.classList.toggle('drop', playing && st.section === 'drop');
    b.querySelector('.jt').textContent = `${playing ? '■' : '▶'} ${title}${st.song ? ' · 130 BPM' : ''}`;
    b.querySelector('.js').textContent = playing && st.song ? SECTION_KOELSCH[st.section] || '' : juke.on ? 'KLICK = MUSIK' : 'MUSIK AUS';
  }
  // the banner lives with the song: logo pumps on the kick, skyline windows flash, an equaliser dances on the Rhine,
  // and in the hook and the bass run the white wedge (the LamboGina) races over the Hohenzollernbrücke
  function menuFx(t) {
    const cv = juke.fx; if (!cv || $('#menu').hidden) return;
    if (t - juke.lastDraw < 33) return; const dt = Math.min(0.1, (t - juke.lastDraw) / 1000); juke.lastDraw = t;
    const st = beatNow(), x = juke.ctx, W2 = cv.width, H2 = cv.height, live = st.playing;
    const beat = live ? st.pulse : 0.15 + 0.1 * Math.sin(t / 600), energy = live ? st.energy : 0.3;
    document.documentElement.style.setProperty('--beat', beat.toFixed(3));
    document.documentElement.style.setProperty('--energy', energy.toFixed(3));
    x.clearRect(0, 0, W2, H2);
    // skyline windows flash on the kick
    if (beat > 0.2) { x.fillStyle = `rgba(255,214,120,${(beat * 0.9).toFixed(2)})`; for (let i = 0; i < 40; i++) if ((i * 7 + (live ? st.beat : 0)) % 3 === 0) x.fillRect(i * 10 - 2 + (i % 3) * 2, 25 + (i * 5) % 7, 1, 1); }
    // equaliser on the river
    for (let i = 0; i < 24; i++) {
      const k = live && st.song ? (parseInt(window.LamboBeat.song.kick[(st.beat + i) % 480] || '0', 10) / 9) : 0.4;
      const h = Math.max(1, Math.round((i < 6 ? beat * 9 : k * 5 * energy + Math.abs(Math.sin(t / 180 + i * 1.7)) * 4 * energy)));
      x.fillStyle = i % 3 === 0 ? '#ff2d95' : i % 3 === 1 ? '#00e5ff' : '#ffd23f'; x.fillRect(4 + i * 16, 47 - h, 10, h);
    }
    // the white wedge: in the hook (b), the bass run (drop) and, without music, every now and then
    const go = live ? (st.section === 'b' || st.section === 'drop') : (Math.floor(t / 1000) % 24) < 5;
    if (go || juke.carX > -40) {
      juke.carX += dt * (st.section === 'drop' ? 170 : 110);
      if (juke.carX > W2 + 40) juke.carX = go ? -40 : -41;
      const cx = Math.round(juke.carX), cy = 31;
      if (juke.carX > -40) {
        for (let k = 1; k < 14; k++) { x.fillStyle = k % 2 ? 'rgba(255,45,149,0.5)' : 'rgba(0,229,255,0.45)'; x.fillRect(cx - k * 3, cy + 2 + (k % 2), 3, 1); } // neon trail
        x.fillStyle = '#f4f4f2'; x.fillRect(cx, cy + 1, 14, 2); x.fillRect(cx + 3, cy, 8, 1); x.fillRect(cx + 5, cy - 1, 4, 1); // wedge
        x.fillStyle = '#111'; x.fillRect(cx + 5, cy, 4, 1); x.fillRect(cx + 2, cy + 3, 2, 1); x.fillRect(cx + 10, cy + 3, 2, 1); // glass, wheels
        x.fillStyle = '#ff2020'; x.fillRect(cx, cy + 1, 1, 1); x.fillStyle = '#fff6b0'; x.fillRect(cx + 14, cy + 1, 2, 1); // tail and head light
      }
    }
    // the bass run: searchlights from behind the Dom
    if (live && st.section === 'drop') { x.globalAlpha = 0.25 + 0.35 * beat; x.strokeStyle = '#ffffff'; x.lineWidth = 2; for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + Math.sin(t / 700 + k * 2.1) * 0.7; x.beginPath(); x.moveTo(175, 30); x.lineTo(175 + Math.cos(a) * 60, 30 + Math.sin(a) * 60); x.stroke(); } x.globalAlpha = 1; }
    const lbl = (st.playing ? 'p' : 's') + st.section; if (lbl !== juke.sec) { juke.sec = lbl; updateJuke(); }
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
    updateVoiceUI(); if (!voice.on) toggleVoice(); else speak(pick(['Ich bin dä Lange. Kölle, Jung, dat is e Jeföhl.', 'Et hätt noch emmer jot jejange. Sagt der Türsteher.', 'Drink doch ene met, un dann fahr.']), 0.55, 0.92, true, 'Dä Lange');
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
  // gloss: the small Hochdeutsch word under a Kölsch label (SCHRIFT: JROSS / Schrift: groß), left out where both read the same
  function labelBtn(btn, text, gloss) { if (!btn) return; const name = btn.dataset.icon; btn.textContent = ''; btn.dataset.label = text; btn.dataset.gloss = gloss || ''; if (name && SP.icon) { const c = document.createElement('canvas'); c.className = 'pxi'; SP.icon(name, c, 1); btn.appendChild(c); } btn.appendChild(document.createTextNode(text)); if (gloss) { const g = document.createElement('small'); g.className = 'gl'; g.textContent = gloss; btn.appendChild(g); } }
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
    if (!voice.on || !voice.ready || audio.muted || paused) return; // the pause is silent, also for lines a timer had already queued
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
  // GESCHWÄTZ (chatter, menu): VILL = every line with today's throttle; NORMAL (desktop default) = flavour more seldom;
  // WENIJ (touch default) = only the lines the player needs and dä Lange's stories, never two lines within 10 s (a needed
  // line waits up to 8 s for its turn). In every setting stories beat flavour, and no line is said twice in one race.
  // KÖLSCH-HÜLP: a small grey Hochdeutsch line under the message, from the line's hd field (HD looks it up by text)
  let quiet = 0, chat = 1, hdOn = false, msgAge = 0, chatClock = 0, lastLineT = -99, mustQ = [];
  const CHAT = ['VILL', 'NORMAL', 'WENIJ'], CHAT_HD = ['Gerede: viel', 'Gerede: normal', 'Gerede: wenig'], CHAT_QUIET = [[12, 18], [18, 24], [10, 10]];
  const saidRace = new Set(), msgLog = []; // every line shown in this race (the harness reads it)
  const VERZ = { name: 'Dä Lange verzällt', emoji: '🎩' };
  try { hdOn = localStorage.getItem('stuntskoelle.hd') === '1'; } catch (e) { /* ignore */ }
  const HD = new Map(); // Kölsch text → Hochdeutsch help: stories, side-street notes, place lines, pause, song lines
  { const add = (t, hd) => { if (typeof t === 'string' && typeof hd === 'string' && hd) HD.set(t, hd); };
    for (const t of D.TRACKS) { for (const p of t.props || []) add(p.story, p.hd); for (const r of (t.shortcuts || []).concat(t.branches || [])) add(r.note, r.hd); }
    const walk = (o, depth) => { if (!o || typeof o !== 'object' || depth > 4) return; if (typeof o.t === 'string') add(o.t, o.hd); for (const k of Object.keys(o)) walk(o[k], depth + 1); }; walk(D.TUENN, 0); }
  const lineT = (x) => (x && typeof x === 'object' ? x.t : x); // a pool entry is a string or { t, hd }
  // PÄNZ-MODUS: for children at the keyboard – Kölsch becomes Kamelle, drinking lines are left out
  let kids = false; try { kids = localStorage.getItem('stuntskoelle.kids') === '1'; } catch (e) { /* ignore */ }
  const DRINK = /\bKölsch\b(?!e)|Kölsch-|Bier|Schabau|Promille|nüchtern|besoffe|jedrunke|drinke?\b|Theke|Köbes|Kneipe|Brauhaus|Halve Hahn|zapf/i;
  const kidsText = (t) => t.replace(/\b(e|ein|dat|ding|em|op e)\s+Kölsch\b(?!e)/gi, '$1 Limo').replace(/\bKölsch\b(?![e-])/g, 'Kamelle').replace(/Kölsch-/g, 'Kamelle-').replace(/Bier/g, 'Limo');
  function sayMust(who, text, ms, ex) { return say(who, text, ms, true, ex); } // ex.small: a greeting or start line that WENIJ lets go first when something needed waits
  // ex: { story: a place story or side-street note (beats flavour), hd: its Hochdeutsch line, tag: the place's name for the phone's one-line tag }
  function say(who, text, ms, must, ex) {
    ex = ex || {}; text = lineT(text); if (!text) return false; let hd = ex.hd != null ? ex.hd : HD.get(text) || '';
    if (kids && DRINK.test(text)) { if (!must && phase === 'race') return false; text = kidsText(text); hd = kidsText(hd); }
    const race = phase === 'race', start = race || phase === 'countdown' || phase === 'intro';
    if (race && saidRace.has(text) && (!must || chat === 2)) return false; // no line twice in one race
    if (race && !must && !ex.story && (chat === 2 || storyNear())) return false; // WENIJ: no flavour; a place just ahead keeps the box free for its story
    if (race && !must && (ex.story ? msgTimer > 0 && !(msgPrio === 0 && msgAge > 1.2) : msgTimer > 0 || quiet > 0)) return false; // a story pushes a flavour line aside once it has been read a moment
    if (start && chat === 2 && chatClock - lastLineT < 10 && !(ex.story && raceMode === 2)) { if (must) { mustQ.push({ who, text, ms, ex, at: chatClock }); if (mustQ.length > 3) { const i = mustQ.findIndex((q) => q.ex.small); mustQ.splice(Math.max(0, i), 1); } } return false; }
    if (race) quiet = CHAT_QUIET[chat][isMobile ? 1 : 0]; // on a phone the box covers the road: fewer lines
    if (phase === 'race' || phase === 'countdown' || phase === 'intro' || phase === 'finished') { const v = VOICES[who.name] || [0.8, 1]; speak(text, v[0], v[1], who === tuenn, who.name); }
    const tag = ex.tag && isMobile && chat > 0 ? ex.tag : ''; // phone: a story is a one-line place tag, a tap opens the whole text
    $('#msgWho').textContent = `${who.emoji || '🏁'} ${who.name}`;
    $('#msgText').textContent = text; $('#msgTag').textContent = tag ? `📍 ${tag} – tipp för mieh` : '';
    const hdEl = $('#msgHd'); hdEl.textContent = hdOn ? hd : ''; hdEl.hidden = !(hdOn && hd);
    $('#msg').classList.remove('open'); $('#msg').classList.toggle('tagged', !!tag); $('#msg').classList.add('show');
    msgTimer = (ms || 3500) / 1000; msgPrio = must ? 2 : ex.story ? 1 : 0; msgAge = 0;
    if (start) { lastLineT = chatClock; saidRace.add(text); msgLog.push({ t: +raceTime.toFixed(2), c: +chatClock.toFixed(2), phase, who: who.name, text, hd: hdOn ? hd : '', must: !!must, story: !!ex.story, tag }); }
    return true;
  }
  // WENIJ: a needed line that came within 10 s of the last one is said when its turn comes, if it is not older than 15 s
  // (a greeting or start line: 8 s). Real news (the Botengang brief, the Wette, the Kripo) goes before small talk, and a
  // story whose place is right here goes first of all (its window lasts only a few seconds, the waiting line can wait)
  function chatStep(dt) {
    chatClock += dt;
    if (mustQ.length) mustQ = mustQ.filter((q) => chatClock - q.at <= (q.ex.small ? 8 : 15));
    if (mustQ.length && chatClock - lastLineT >= 10 && !storyReady()) { const i = mustQ.findIndex((q) => !q.ex.small), q = mustQ.splice(Math.max(0, i), 1)[0]; say(q.who, q.text, q.ms, true, q.ex); }
  }
  // STADTRUNDFAHRT: every story, in track order, each when its place is at most 40 m ahead (or already passed) and the box is free
  // of anything but flavour; a story that is still waiting at the line is told there before the postcard comes
  function tourStory() {
    const st = stories.find((x) => !x.told); if (!st || (msgTimer > 0 && msgPrio > 0) || paused) return;
    const at = (player.lap - 1) * track.length + player.s; if (!player.finished && st.s - at > 40) return;
    const ms = isMobile && chat > 0 ? 5000 : 6500; msgTimer = 0;
    if (say(VERZ, st.text, ms, false, { story: true, hd: st.hd, tag: st.tag }) || saidRace.has(st.text)) { st.told = true; storyCool = ms / 1000; rememberStory(st.text); showLandmarkTag(st); if (st.wz) discoverWz(st.wz); }
  }
  // the tour bus slows to 30 km/h while dä Lange is still telling about a place it has passed by more than 40 m
  function tourCap(r) { if (r !== player || r.finished) return TOUR_V; const st = stories.find((x) => !x.told); return st && (r.lap - 1) * track.length + r.s - st.s > 40 ? 8.4 : TOUR_V; }
  const tourPending = () => stories.some((x) => !x.told) || msgTimer > 0.5;
  function storyReady() { if (phase !== 'race' || storyCool > 0 || !player || player.air) return false; for (const st of stories) { if (st.told) continue; const ds = -storyDs(st); if (ds > -40 && ds < 70) return calmRoad(); } return false; }
  function chatReset() { saidRace.clear(); recent.clear(); msgLog.length = 0; mustQ = []; chatClock = 0; lastLineT = -99; msgAge = 0; }
  // a place story just ahead (or just passed and still untold): flavour lines keep quiet
  function storyNear() { if (!player || !track) return false; for (const st of stories) { if (st.told) continue; const ds = storyDs(st); if (ds > -70 && ds < 140) return true; } return false; }
  function storyDs(st) { let ds = st.s - player.s; if (ds > track.length / 2) ds -= track.length; if (ds < -track.length / 2) ds += track.length; return ds; } // > 0: the place is ahead
  // the phone's tag: the place's own name (the first words of its story), else the kind of place
  const KIND_TAG = { brauhaus: 'BRAUHAUS', buedchen: 'BÜDCHEN', blitzer: 'BLITZER', polizei: 'KRIPO', kirche: 'KIRCH', haltestelle: 'HALTESTELL', park: 'PARK', taxi: 'TAXI', platz: 'PLATZ', tram: 'DE BAHN', tunnel: 'TUNNEL', loop: 'LOOPING', cork: 'KORKENZIEHER', jump: 'SPRUNG' };
  const PLACE_LINES = new Set(Object.values(D.TUENN.places || {}).flat().map(lineT));
  function storyTag(text, kind) {
    if (PLACE_LINES.has(text)) return KIND_TAG[kind] || String(kind || 'KÖLLE').toUpperCase();
    const m = text.match(/^(.{3,36}?)(?<!\bSt)(?:[.:!?,–]\s|$)/); return (m && !/^(Links|Hee|Do|Op|Ein|Fröher|Am|Sonndag)/.test(m[1]) ? m[1] : String(kind || 'KÖLLE')).toUpperCase().replace(/^(DER|DIE|DAT|DE|DÄ) /, '');
  }

  // ---------------- racers ----------------
  function routeFor(r) { return r && r.shortcut >= 0 ? track.shortcuts[r.shortcut] : null; }
  function racerFrame(r, s) {
    const route = routeFor(r); s = s == null ? r.s : s;
    if (route && s >= route.startS && s <= route.endS) return window.Shortcuts.frameAt(route, (s - route.startS) * route.length / (route.endS - route.startS));
    return TB.frameAt(track, s);
  }
  function sameRoad(a, b) { return (a.shortcut == null ? -1 : a.shortcut) === (b.shortcut == null ? -1 : b.shortcut); }
  // Real side streets: what kind of branch it is, and how tight its corners are (for the AI's braking)
  const ROUTE_KIND = { cut: 'ABKÜRZUNG', parallel: 'PARALLELSTROSS', bypass: 'UMJEHUNG' };
  const ROUTE_PERK = { koelsch: 'KÖLSCH', market: 'MARKT', parked: 'FALSCHPARKER', shakeKripo: 'KRIPO-FREI', tram: 'BAHNGLEISE', brauhaus: 'BRAUHAUS', kiosk: 'BÜDCHEN' };
  function routeLabel(q) { return `${q.street.toUpperCase()} · ${q.kind === 'alternate' ? 'PANORAMA' : ROUTE_KIND[q.type] || 'ABKÜRZUNG'}${q.surface === 'cobble' ? ' · KOPPSTEIN' : ''}`; }
  function routePerks(q) { return (q.perks || []).map((k) => ROUTE_PERK[k]).filter(Boolean).join(' · '); }
  function routeMaxCurv(q) { if (q._maxCurv == null) { let m = 0.001; for (const sm of q.samples) m = Math.max(m, Math.abs(sm.curv || 0)); q._maxCurv = m; } return q._maxCurv; }
  // does this AI driver take the next branch this lap? Taxi Willi knows every Veedel, a damaged car avoids the stunts
  function aiWantsRoute(r, q) {
    const id = r.driver && r.driver.id, h = Math.abs(Math.sin((r.lap * 7.3 + q.index * 3.1 + (r.wobblePhase || 0)) * 12.9898)) % 1;
    let p = q.type === 'cut' ? 0.35 : q.type === 'bypass' ? 0.18 : 0.12;
    if (id === 'willi') p = q.type === 'cut' ? 0.95 : 0.6;
    else if (id === 'tom') p = q.type === 'cut' ? 0.7 : 0.35;
    else if (id === 'koebes' && (q.perks || []).includes('brauhaus')) p = 0.9;
    if (q.type === 'bypass' && r.damage > 0.3) p = 0.9;
    if ((q.perks || []).includes('market')) p *= 0.7;
    return h < p;
  }
  // an obstacle on a branch (market stall, crate stack) at distance d along it, lateral lat, radius rad
  function routeObstacles(q) { if (!q._obst) q._obst = window.RouteExtras ? window.RouteExtras.obstacles(q) : []; return q._obst; }
  function routeGroups(routes) {
    const groups = [];
    for (const route of routes) {
      let group = groups.find((g) => Math.abs(g.startS - route.startS) < 0.01);
      if (!group) { group = { startS: route.startS, routes: [] }; groups.push(group); }
      group.routes.push(route);
    }
    return groups.sort((a, b) => a.startS - b.startS);
  }
  function routeDelta(route) { return `${route.saved >= 0 ? '−' : '+'}${Math.round(Math.abs(route.saved))} m`; }
  function routePassport(def) {
    let ids = [];
    try {
      const saved = JSON.parse(localStorage.getItem('stuntskoelle.routes.' + def.id) || '[]');
      if (Array.isArray(saved)) ids = saved;
    } catch (e) { /* Keep valid discoveries from the older, shared Veedel save. */ }
    const valid = new Set([...(def.shortcuts || []), ...(def.branches || [])].map((r) => r.id));
    return new Set([...ids, ...getVeedel()].filter((id) => typeof id === 'string' && valid.has(id)));
  }
  function discoverRoute(route) {
    const have = routePassport(trackDef);
    if (have.has(route.id)) return false;
    have.add(route.id);
    try {
      localStorage.setItem('stuntskoelle.routes.' + trackDef.id, JSON.stringify([...have]));
      localStorage.setItem('stuntskoelle.veedel', JSON.stringify([...new Set([...getVeedel(), ...have])]));
      // Derive the counter from distinct authored roads, never from repeat laps.
      const stats = getStats(); stats.streetsFound = TRACKS.reduce((sum, def) => sum + routePassport(def).size, 0);
      stats.streets = Math.max(stats.streets || 0, stats.streetsFound);
      localStorage.setItem('stuntskoelle.stats', JSON.stringify(stats));
    } catch (e) { /* Driving still works when browser storage is unavailable. */ }
    return true;
  }
  function advanceRacer(r, distance) {
    let route = routeFor(r);
    if (!route && distance > 0 && !r.air && !r.finished) {
      route = track.shortcuts.find((q) => (r.isCop ? r.routePlan === q.index : !r.isAI || r.branchPlan === q.index) && r.s <= q.startS && r.s + distance >= q.startS && r.lat * q.side >= 1.6 && Math.abs(r.lat) <= q.halfWidth - 0.2); // up to the street's kerb: a car still turning in (B22) gets in
      if (route) { distance -= route.startS - r.s; r.s = route.startS; r.shortcut = route.index; r.routePlan = null; r.safeS = route.resetS + 18; r.usedSide = true; if (r === player) enterRoute(route); } // respawn() subtracts 18 m
    }
    if (!route) { r.s += distance; return; }
    const scale = (route.endS - route.startS) / route.length;
    const next = r.s + distance * scale;
    if (next >= route.endS || next < route.startS) {
      const forward = next >= route.endS;
      r.s = (forward ? route.endS : route.startS) + (next - (forward ? route.endS : route.startS)) / scale;
      r.shortcut = -1; r.prevRoadVy = 0; if (r === player) noteTick();
      const discovered = forward && r === player && discoverRoute(route);
      const key = r.lap + ':' + (route.fork || route.id);
      if (forward && r === player && !r.shortcutsDone.has(key)) {
        r.shortcutsDone.add(key); addDeckel(1); bumpStat('shortcuts');
        const lines = tuenn.routes && tuenn.routes[route.type];
        const message = lines ? pick(lines).replace('{street}', route.street).replace('{m}', Math.round(Math.abs(route.saved))) : route.saved > 0 ? `${route.name}: ${Math.round(route.saved)} Meter jespart. Dat steht nit im Stadtplan, Jung.` : `${route.name}: ${Math.round(-route.saved)} Meter extra. Dä Köbes nennt dat Sightseeing.`;
        say(tuenn, message + (discovered ? ' Neuer Stempel im Veedels-Pass!' : ''), 3200);
      }
    } else { r.s = next; if (r === player && pendingNote) tellNote(); }
  }
  function getVeedel() { try { const ids = JSON.parse(localStorage.getItem('stuntskoelle.veedel') || '[]'); return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []; } catch (e) { return []; } }
  // the player turns into a side street: the Kripo follows when it is close behind, otherwise it loses you in the Veedel
  // Dä Lange's side-street notes: queued on entry, told while the player is still in that street (they push a
  // flavour line aside, never a line the player needs), marked told only once heard, and taken off the box on leaving
  let pendingNote = null, noteShown = null;
  const streetKey = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/^(da|de|der|die|d'r)\s+/, '').replace(/\balte?r?\b|\bahle?\b/g, 'ahl').replace(/rhein/g, 'rhing').replace(/strasse|stross/g, 'str').replace(/gasse/g, 'gass').replace(/\bwa+ch\b/g, 'weg');
  function noteText(q, hd) { const st = q.street || q.name || '', t = hd ? q.noteHd || '' : q.note; return t && st && !streetKey(t).startsWith(streetKey(st)) ? `${st}: ${t}` : t; } // 'Bechergass: …' needs no 'Bechergasse: ' in front
  function tellNote() {
    const q = pendingNote; if (!q || phase !== 'race') return;
    if (!player || player.shortcut !== q.index || notesTold.has(q.id) || kripo) { pendingNote = null; return; } // left the street unheard: next lap
    if (kids && DRINK.test(q.note)) { notesTold.add(q.id); pendingNote = null; return; }
    if (msgTimer > 0 && msgPrio > 0) return; // wait behind a line the player needs
    const was = msgTimer; msgTimer = 0;
    if (say(VERZ, noteText(q), 5500, false, { story: true, hd: noteText(q, true), tag: (q.street || q.name || '').toUpperCase() })) { notesTold.add(q.id); pendingNote = null; noteShown = { index: q.index, text: $('#msgText').textContent }; }
    else msgTimer = was;
  }
  function noteTick() {
    if (pendingNote) tellNote();
    if (noteShown && (!player || player.shortcut !== noteShown.index)) { if (msgTimer > 0 && msgPrio === 1 && $('#msgText').textContent === noteShown.text) { msgTimer = 0; msgPrio = 0; $('#msg').classList.remove('show', 'open'); } noteShown = null; }
  }
  function enterRoute(q) {
    // the first time per race in a real side street: Dä Lange tells what that street is (its researched note)
    if (q.note && !notesTold.has(q.id) && !kripo) { pendingNote = q; tellNote(); }
    if (!kripo) return;
    const L = track.length; let behind = player.s - kripo.s; if (behind > L / 2) behind -= L; if (behind < -L / 2) behind += L;
    if ((q.perks || []).includes('shakeKripo') || behind > 45 || behind < -10) {
      sayMust(...kripoLine(tuenn.kripo.lost || tuenn.kripo.giveup), 2800);
      if (mission) { kripo.lostT = 9; kripo.s = ((kripo.s - 60) % L + L) % L; kripo.safeS = kripo.s; kripo.shortcut = -1; kripo.routePlan = null; kripo.prevRoadVy = 0; }
      else endKripo('lost');
    } else { kripo.routePlan = q.index; say(tuenn, pickNew(tuenn.kripo.follows || ['Die Kripo kütt hinger dir her!']), 2000); }
  }
  function makeRacer(carDef, mesh, driver, isAI) {
    return {
      car: carDef, mesh, driver, isAI, name: isAI ? driver.name : 'DU',
      s: 0, lat: 0, v: 0, air: false, y: 0, vy: 0, lap: 1, safeS: 0, crashed: 0,
      finished: false, finishTime: null, laps: [], lapStart: 0, prevRoadVy: 0, wasInLoop: false,
      steerVis: 0, aiTimer: 0, aiSlow: 1, jumpStartS: 0, bestLap: null, wobblePhase: Math.random() * 10, laneBias: 0,
      turbo: 0.5, turboOn: false, damage: 0, skill: driver.skill, wobble: driver.wobble,
      shortcut: -1, shortcutsDone: new Set(), routeSeed: 0, branchPlan: -1, branchKey: '', routePlan: null,
      sp: [], cpNext: 0, bestSp: null, usedSide: false, band: 1,
      yaw: 0, steerIn: 0, assist: false, airLat: 0, zoneLeft: null // the heading against the road, the wheel, LENKHILFE, air control used, the landing zone still ahead
    };
  }
  // Back on the road after a crash, on the centre line. On the main road: where the car crashed, at least 20 m past
  // the last safe point and never behind it, moved on to the next plain stretch (not into a loop, a jump or a gap),
  // so progress never goes down and nobody is put back before the fork that just threw them off. From a side street:
  // its own reset point on the main road before the entry (a side street has no centre line on the main course).
  const SAFE_KINDS = ['straight', 'bridge', 'tunnel', 'curve', 'hill', 'dip'];
  function respawnS(r) {
    if (r.crashRoute) return ((r.safeS - 18) % track.length + track.length) % track.length;
    let s = Math.max(r.safeS + (r.resetHere ? 0 : 20), r.crashS != null ? r.crashS : -1e9);
    for (let k = 0; k < 900; k++, s += 1) { const f = TB.frameAt(track, s); if (SAFE_KINDS.includes(f.kind) && f.N.y > 0.9 && SAFE_KINDS.includes(TB.frameAt(track, s + 6).kind)) break; }
    // never past the pickup or the drop-off the player was heading for (Botengang, Klüngel-Auftrag): just before it
    const goal = r !== player ? null : mission ? (mission.onFoot ? null : mission.stage === 'drive1' ? mission.pickS : mission.stage === 'drive2' ? mission.dropS : null) : auftrag && auftrag.stage === 'pickup' ? auftrag.s1 : null;
    if (goal != null) { const c = r.crashS != null ? r.crashS : r.safeS, L = track.length, ahead = ((goal - c) % L + L) % L; if (c + ahead < s + 6) s = Math.max(c, c + ahead - 8); }
    return s; // may lie past the line: the next update counts the lap
  }
  function respawn(r) { const s = respawnS(r); r.shortcut = -1; r.branchKey = ''; r.branchPlan = -1; r.routePlan = null; r.s = s; r.lat = 0; r.v = 0; r.yaw = 0; r.steerIn = 0; r.zoneLeft = null; r.air = false; r.vy = 0; r.crashed = 0; r.prevRoadVy = 0; r.onVerge = false; if (!r.crashRoute) r.safeS = Math.min(s, track.length - 0.01); r.crashS = null; const push = !r.crashRoute && !r.resetHere; r.crashRoute = false; r.resetHere = false; if (push) pushStart(r); }
  // back on the road just before a loop or a ramp, too close to get up to speed from standing: the marshals give a push
  // start (B23), else the next crash would only skip the stunt
  function pushStart(r) {
    const sa = stunts.length && !tourRide(r) ? stuntAhead(r, 150) : null; if (!sa || sa.d <= 0) return;
    const sp = stuntSpeeds(sa.t, r.car, r.assist), want = sa.t.kind === 'jump' && isFinite(sp.max) ? (sp.min + sp.max) / 2 : sp.min * 1.15;
    if (Math.sqrt(2 * r.car.accel * 0.6 * sa.d) < want) r.v = Math.min(r.car.top, want);
  }
  // the verge (metres of shoulder beyond the road edge) at the racer's sample, on the side it is on
  function vergeAt(r, f, lat) { const route = routeFor(r), q = route ? route.samples[f.index] : track.samples[f.index]; return q && q.vg ? q.vg[lat < 0 ? 0 : 1] : route ? 2 : TB.VERGE; }
  let crashLog = [], crashAt = [], helpSaid = -99; const notesTold = new Set(); // two crashes in half a minute: Dä Lange gives a real tip
  function crash(r, kind) {
    if (r === player && auftrag && auftrag.stage === 'carry') failAuftrag('lost');
    if (r.crashed > 0) return;
    r.lastCrash = kind; r.crashS = r.s; r.crashRoute = r.shortcut >= 0; if (r === player) { crashes++; crashLog.push(raceTime); crashAt.push(r.s); while (crashLog.length && raceTime - crashLog[0] > 30) crashLog.shift(); if (crashLog.length >= 2 && raceTime - helpSaid > 25) { helpSaid = raceTime; setTimeout(() => { if (phase === 'race') sayMust(tuenn, pickNew(tuenn.help) + (isMobile ? '' : ' R = zeröck op de Stroß.'), 4200); }, 1200); } if (kind === 'water') { waterCrashes++; bumpStat('water'); } if (kind === 'roof') bumpStat('roofs'); }
    r.crashed = 2.2; r.v = 0; r.air = false; r.turboOn = false; endJump(r);
    r.damage = Math.min(1, r.damage + 0.25);
    if (!r.isAI) {
      crashSound(); shake = 1;
      const quotes = kind === 'water' ? tuenn.water : kind === 'loop' ? tuenn.loopFall : kind === 'roof' ? tuenn.roof : kind === 'short' ? tuenn.jumpShort : tuenn.crash;
      if (r.damage >= 1) { sayMust(tuenn, 'TOTALSCHADEN! ' + pickNew(tuenn.damage), 3000); r.damage = 0; r.crashed = 3.5; }
      else say(tuenn, pickNew(quotes), 3000);
      if (Math.random() < 0.6) setTimeout(() => { if (phase === 'race') { const rival = pick(racers.filter((x) => x.isAI)); if (rival && rival.driver.lines.taunt) say(rival.driver, pickNew(rival.driver.lines.taunt), 2400); } }, 3200);
    }
  }

  // Steering (B22): the wheel turns in over 150 ms; the heading against the road (yaw) follows it as fast as the tyres
  // carry (grip per car and surface, the verge included, a bit less in a fast curve and at speed)
  // and the car moves sideways at speed × sin(heading). Let go and it straightens out over about a third of a second:
  // a slide to catch, not a stop dead. LENKHILFE damps the yaw and, while you do not steer, pulls gently to the middle
  // of the lane (and back off the verge). Player, rivals, Kripo and the autopilot all drive this one model.
  const STEER_RAMP = 0.15, STEER_BACK = 0.06, YAW_MAX = 0.6, ALIGN_T = 0.35, AIR_LAT = 0.25, LANE = 2.2; // LANE: LENKHILFE holds you on the middle or at ±2.2 m, inside every side street's turn-in window
  function steerStep(r, steer, gripAcc, need, dt, roadWidth) {
    const v = Math.abs(r.v), as = r.assist;
    r.steerIn += clamp(steer - r.steerIn, -dt / (steer * r.steerIn < 0 || Math.abs(steer) < Math.abs(r.steerIn) ? STEER_BACK : STEER_RAMP), dt / (steer * r.steerIn < 0 || Math.abs(steer) < Math.abs(r.steerIn) ? STEER_BACK : STEER_RAMP));
    const grip = gripAcc * (1 - 0.15 * Math.min(1, Math.abs(need) / gripAcc)) * clamp(1 - (v - 16) * 0.012, 0.75, 1);
    const wMax = r.car.steer * Math.min(0.24 * v, grip / Math.max(1, v)) * (as ? 1 - 0.25 * clamp((v - 12) / 12, 0, 1) : 1); // yaw rate: grows with speed like a bicycle until the tyres give up; LENKHILFE calms it at speed
    r.yaw += r.steerIn * wMax * Math.sign(r.v) * dt;
    r.yaw -= r.yaw * Math.min(1, Math.max(0, 1 - Math.abs(r.steerIn) * 4) * Math.min(1, v / 5) * dt / (as ? 0.2 : ALIGN_T)); // the wheel let go (nearly): the car straightens out
    r.yaw = clamp(r.yaw, -YAW_MAX, YAW_MAX);
    let vl = r.v * Math.sin(r.yaw);
    if (as && Math.abs(steer) < 0.1) { const lane = roadWidth > 5 ? Math.round(clamp(r.lat / LANE, -1, 1)) * LANE : 0, off = Math.abs(r.lat) > roadWidth; vl += clamp((lane - r.lat) * (off ? 1.2 : 0.6), off ? -3 : -1.2, off ? 3 : 1.2); }
    return vl;
  }
  // the AI's (and the autopilot's) wheel for that model: the gap to the line it wants asks for a sideways speed, that for a
  // heading, and the wheel turns the car towards that heading; the road's outward slide is held off the same way
  function steerTo(r, wantLat, k) {
    const ahead = slideAhead(r), slide = Math.abs(ahead) > Math.abs(r.slide || 0) ? ahead : r.slide || 0; // a driver sees the bend coming: half a second ahead
    const v = Math.max(3, Math.abs(r.v)), vl = clamp((wantLat - r.lat) * (k || 1.1), -0.4 * v, 0.4 * v) - slide;
    const yawWant = Math.asin(clamp(vl / v, -0.55, 0.55)) * (r.v < 0 ? -1 : 1);
    return clamp((yawWant - r.yaw) * 5 * (r.v < 0 ? -1 : 1), -1, 1);
  }
  // the outward slide a bend half a second ahead will bring at this speed (as updateRacer reckons it, without the verge)
  function slideAhead(r) {
    if (r.air) return 0; const f = racerFrame(r, r.s + Math.max(0, r.v) * 0.5 * (routeFor(r) ? (routeFor(r).endS - routeFor(r).startS) / routeFor(r).length : 1)), q = routeFor(r);
    const grip = 24 * r.car.grip * (1 + Math.min(1, Math.abs(f.roll || 0) / (25 * Math.PI / 180)) * 0.6) * (q && q.surface === 'cobble' ? 0.85 : 1), need = f.curv * r.v * Math.abs(r.v);
    return Math.sign(need) * Math.max(0, Math.abs(need) - grip) * 0.28;
  }
  // Loops (B23): the road holds you while the speed presses you into it, v² / R ≥ g × how far it is upside down, with 20 %
  // to spare (sqrt(g·R)·1.2 at the top of that loop's radius); LENKHILFE forgives 10 %. Stalled on the wall, you fall too
  function loopFall(r, f) { const R = f.loopR || 13, k = 1.44 * (r.assist ? 0.81 : 1); return f.N.y < 0.2 && r.v * r.v < Math.max(0.15, -f.N.y) * G * R * k || r.v < 3 && f.N.y < 0.8; }
  // Jumps (B23): metres from the ramp lip at s to the end of the landing zone behind the landing ramp's foot
  function zoneAhead(s) {
    const S = track.samples, n = S.length; let i = Math.floor(((s % track.length) + track.length) % track.length / track.ds) % n, d = 0;
    while (d < 200 && ['ramp', 'gap', 'land'].includes(S[(i + 1) % n].kind)) { i++; d += track.ds; }
    return d + TB.LAND_ZONE;
  }
  function endJump(r) { if (!r.jumpLive) return; (r.jumps || (r.jumps = [])).push({ s: Math.round(r.jumpLive.s), h: r.jumpLive.peak - r.jumpLive.y0 }); if (r.jumps.length > 30) r.jumps.shift(); r.jumpLive = null; }
  function updateRacer(r, dt, ctl) {
    const car = r.car;
    if (r.crashed > 0) { r.crashed -= dt; if (r.crashed <= 0) respawn(r); return; }
    const f = racerFrame(r);
    const roadWidth = routeFor(r) ? routeFor(r).halfWidth - 0.6 : ROAD_W + 1.6;
    const roadY = f.p.y;
    // turbo
    const nitroK = 0.6 + car.nitro * 0.12;
    if (ctl.turbo && r.turbo > 0.02 && r.v > 5 && !r.air) { r.turboOn = true; r.turbo = Math.max(0, r.turbo - dt * 0.22); if (!r.isAI && !r.turboWasOn) say(tuenn, pickNew(tuenn.turbo), 1500); }
    else {
      r.turboOn = false;
      if (r.v > 15) {
        // Section callbacks do not fire when playback stops or another song is loaded.
        // Sample the live clock before awarding a player the audible bass-run bonus.
        if (!r.isAI && phase === 'race') { const beat = beatNow(); bassRun = !audio.muted && !music.muted && beat.playing && beat.song && beat.section === 'drop'; }
        r.turbo = Math.min(1, r.turbo + dt * (0.035 + (Math.abs(r.slide || 0) > 1 ? 0.06 : 0)) * nitroK * (bassRun && !r.isAI && phase === 'race' ? 2 : 1));
      }
    }
    r.turboWasOn = r.turboOn;
    const topMul = (1 - r.damage * 0.2) * (r.turboOn ? 1.18 : 1);
    if (!r.air) {
      const slope = tourRide(r) && f.kind === 'loop' ? 0 : f.T.y; // the Stadtrundfahrt rolls through a loop or a corkscrew at 60 km/h
      // on the verge (gravel, grass, sidewalk): wheels spin, heavy drag, 40 % grip; the same rules for every car
      const verge = r.onVerge = Math.abs(r.lat) > roadWidth;
      const up = tourRide(r) ? 1 : f.kind === 'ramp' ? 0 : Math.max(0, f.N.y); // the engine pushes as hard as the wheels are pressed down: no thrust up a vertical wall, a loop is driven on the speed you bring; on a ramp only the run-up counts
      let a = ctl.gas * car.accel * (r.turboOn ? 1.9 : 1) * (verge ? 0.5 : 1) * up - ctl.brake * (r.v > 0.5 ? car.brake : -car.accel * 0.4) - G * slope * 0.9;
      a -= r.v * Math.abs(r.v) * 0.004 + (ctl.gas > 0 ? 0 : 0.8) * Math.sign(r.v) + (verge ? r.v * 0.35 + 3 * Math.sign(r.v) : 0);
      r.v += a * dt;
      r.v = clamp(r.v, -8, car.top * topMul * (1.0 + (slope < 0 ? 0.15 : 0)));
      if (tourRide(r)) { const cap = tourCap(r); r.tourV = r.tourV == null ? cap : r.tourV > cap ? Math.max(cap, r.tourV - 5 * dt) : Math.min(cap, r.tourV + 3 * dt); r.v = Math.min(r.v, r.tourV); if (f.kind === 'loop') r.v = Math.max(r.v, 8); } // nobody stands upside down
      const bankAssist = Math.min(1, Math.abs(f.roll) / (25 * Math.PI / 180)) * 0.6;
      const onRoute = routeFor(r);
      const gripAcc = 24 * car.grip * (1 + bankAssist) * (onRoute && onRoute.surface === 'cobble' ? 0.85 : 1) * (verge ? 0.4 : 1); // Kopfsteinpflaster: less grip
      const need = f.curv * r.v * Math.abs(r.v);
      const centrifugal = Math.sign(need) * Math.max(0, Math.abs(need) - gripAcc) * 0.28;
      r.slide = centrifugal; r.airLat = 0;
      r.lat += (steerStep(r, ctl.steer, gripAcc, need, dt, roadWidth) + centrifugal) * dt;
      if (Math.abs(r.lat) > roadWidth + vergeAt(r, f, r.lat)) { crash(r, 'off'); return; } // past the verge: the wall, the house, the water
      if (onRoute) { // market stall and crate stacks in a Gasse: a bump that costs speed, and a word from the stall
        const d = (r.s - onRoute.startS) * onRoute.length / (onRoute.endS - onRoute.startS);
        for (const o of routeObstacles(onRoute)) if (Math.abs(d - o.d) < 1.8 && Math.abs(r.lat - o.lat) < o.r + 0.9 && !(r.bumpT > 0)) {
          r.bumpT = 1.2; r.v *= 0.45; r.lat += (r.lat >= o.lat ? 1 : -1) * 0.8; if (!r.isAI) { r.damage = Math.min(1, r.damage + 0.08); if (r.damage >= 1) crash(r, 'off'); crashSound(); shake = 0.4; say(tuenn, pickNew(tuenn.routes && tuenn.routes.bump || ['Pass op, dä Maat!']), 2000); }
        }
        if (r.bumpT > 0) r.bumpT -= dt;
      }
      if (f.kind === 'loop') { r.wasInLoop = true; if (!tourRide(r) && loopFall(r, f)) { crash(r, 'loop'); return; } }
      else if (r.wasInLoop) { r.wasInLoop = false; if (!r.isAI) say(tuenn, pickNew(theme.confetti && tuenn.loopJeck ? tuenn.loopOk.concat(tuenn.loopJeck) : tuenn.loopOk), 2500); if (r === player && !tourRide(r)) { addDeckel(1); bumpStat('loops'); raceStunts++; if (theme.confetti) tusch(); } } // the Stadtrundfahrt carries you round: no Deckel, no Orden
      advanceRacer(r, r.v * dt);
      const f2 = racerFrame(r);
      if (f2.kind === 'gap' && f.kind !== 'gap') {
        const a0 = f.rampAngle; r.air = true; r.y = Math.max(f.p.y, track.samples[f.index].p.y) + 0.1; r.vy = r.v * Math.sin(a0) + 0.5; r.zoneLeft = zoneAhead(r.s); if (tourRide(r)) r.vy = Math.max(r.vy, tourHop(r)); r.jumpStartS = r.s; // launch from the ramp lip, not from the lerp down into the gap
      } else if (f2.kind === 'gap') { r.air = true; r.y = roadY; r.vy = 0; }
      else {
        const roadVy = r.v * f2.T.y;
        if (r.prevRoadVy - roadVy > G * dt * 1.3 && r.v > 25 && f2.kind !== 'loop') { r.air = true; r.y = f2.p.y; r.vy = r.prevRoadVy; }
        r.prevRoadVy = roadVy;
      }
      if (!r.air && !routeFor(r) && Math.abs(r.lat) < ROAD_W && ['straight', 'bridge', 'tunnel', 'curve', 'hill', 'dip'].includes(f.kind) && f.N.y > 0.9) r.safeS = r.s;
    } else {
      if (!r.jumpLive) r.jumpLive = { s: r.s, y0: r.y, peak: r.y }; // the flight's height above its take-off (debug and tests)
      advanceRacer(r, r.v * dt);
      // in the air the heading stays as it left the ground; the wheel moves the car a quarter as much as it once did, a quarter metre a flight at most
      r.steerIn += clamp(ctl.steer - r.steerIn, -dt / STEER_RAMP, dt / STEER_RAMP);
      const nudge = clamp(ctl.steer * car.steer * 1.5 * 0.25 * dt, -AIR_LAT - r.airLat, AIR_LAT - r.airLat); r.airLat += nudge;
      r.lat += r.v * Math.sin(r.yaw) * dt + nudge;
      const f2 = racerFrame(r);
      if (r.zoneLeft != null) r.zoneLeft -= r.v * dt; // a jump: the flight over the gap and its landing zone keeps the jump's gravity
      const landing = r.zoneLeft != null ? r.zoneLeft < 0 : f2.kind !== 'gap' && f2.kind !== 'ramp';
      r.y += r.vy * dt; r.vy -= G * (landing ? 2.6 : r.zoneLeft != null ? FLIGHT_G : 1) * dt; r.jumpLive.peak = Math.max(r.jumpLive.peak, r.y);
      const ry = f2.p.y;
      if (f2.kind === 'gap') { if (r.y < W.WATER_Y + 0.4) { crash(r, 'water'); return; } if (f2.over && r.y < f2.over && !tourRide(r)) { crash(r, 'roof'); return; } }
      else if (f2.kind === 'land' && r.y < ry - 0.8 && !tourRide(r)) { crash(r, 'short'); return; } // too slow: into the face of the landing ramp
      else if (r.y <= ry + 0.12) {
        const zone = r.zoneLeft, hard = zone != null && zone < 0 && !tourRide(r); // past the landing zone: a hard landing
        r.air = false; r.y = ry; r.prevRoadVy = r.v * f2.T.y; r.zoneLeft = null; endJump(r);
        if (Math.abs(r.lat) > roadWidth + vergeAt(r, f2, r.lat)) { crash(r, 'off'); return; } // a landing on the verge is rough but survivable
        if (hard) { r.hardLandings = (r.hardLandings || 0) + 1; r.v *= 0.6; r.damage = Math.min(1, r.damage + 0.35); if (!r.isAI) { crashSound(); shake = 0.8; if (r.damage >= 1) { crash(r, 'off'); return; } say(tuenn, pickNew(tuenn.jumpLong), 2600); } }
        else if (zone != null) r.v *= 0.97; // in the landing zone: the ramp and the run-out take the blow
        else if (r.vy < -22) { r.v *= 0.55; r.damage = Math.min(1, r.damage + 0.08); if (r.damage >= 1 && !r.isAI) crash(r, 'off'); } else if (r.vy < -14) r.v *= 0.8;
        if (!r.isAI && r.s - r.jumpStartS > 20 && r.jumpStartS > 0 && !hard) { say(tuenn, pickNew(tuenn.jumpOk), 2500); r.jumpStartS = 0; if (r === player && !tourRide(r)) { addDeckel(1); bumpStat('jumps'); raceStunts++; if (theme.confetti) tusch(); } }
        r.vy = 0;
      }
      if (r.y - ry > 60) { crash(r, 'off'); return; }
    }
    if (r.s >= track.length) {
      r.s -= track.length; r.safeS = Math.max(0, r.safeS - track.length);
      const lapTime = raceTime - r.lapStart; r.lapStart = raceTime; r.laps.push(lapTime);
      if (r === player && !mission) lapSplit(r, lapTime);
      if (r.bestLap == null || lapTime < r.bestLap) { r.bestLap = lapTime; if (r === player && r.sp.length === 4) r.bestSp = r.sp.slice(); }
      r.lap++; if (r === player) { r.sp = []; r.cpNext = 0; }
      if (r.lap > raceLaps) { r.finished = true; r.finishTime = raceTime; r.lap = raceLaps; }
      else if (!r.isAI) { sayMust(tuenn, tuenn.lap[Math.min(tuenn.lap.length - 1, r.lap - 2 + (r.lap === raceLaps ? 1 : 0))], 2500); if (r === player) { telefon.ready = true; $('#hudTel').textContent = telLabel(); } }
    }
    if (r === player && !mission && !r.finished) splitTick(r);
    r.steerVis += (ctl.steer - r.steerVis) * Math.min(1, dt * 10);
    if (r.v > (r.vMax || 0)) r.vMax = r.v; // the top speed of the race (the Stadtrundfahrt's 60 km/h are checked against it)
  }

  // STADTRUNDFAHRT: at 60 km/h the tour still clears a jump – it takes off as steeply as the gap (or the house) asks for
  function tourHop(r) {
    let d = 0; while (d < 240 && TB.frameAt(track, r.s + d).kind === 'gap') d += 1;
    const land = TB.frameAt(track, r.s + d + 3), T = (d + 6) / Math.max(6, r.v);
    return (land.p.y - r.y + 0.5 * G * FLIGHT_G * T * T) / T; // onto the landing ramp
  }
  // split times: a checkpoint passed this lap (the line itself is counted by lapSplit)
  function splitTick(r) {
    const L = track.length;
    while (r.cpNext < 3 && r.s >= CP[r.cpNext] * L && r.s < CP[r.cpNext] * L + L / 4) { r.sp[r.cpNext] = raceTime - r.lapStart; showSplit(r.cpNext); r.cpNext++; }
  }
  function lapSplit(r, lapTime) { while (r.cpNext < 3) { r.sp[r.cpNext] = null; r.cpNext++; } r.sp[3] = lapTime; showSplit(3); }
  // what a split is compared with: a named ghost (Papa gegen Pänz) always, otherwise the faster of the own ghost and this race's best lap
  function splitRef() {
    const g = ghostData && ghostData.sp && ghostData.sp.length === 4 ? ghostData : null, mine = player.bestSp && player.bestLap != null ? { time: player.bestLap, sp: player.bestSp } : null;
    if (g && (g.name || !mine || g.time <= mine.time)) return g.sp; return mine ? mine.sp : null;
  }
  function showSplit(k) {
    const t = player.sp[k]; if (t == null) return; const ref = splitRef(), d = ref && ref[k] != null ? t - ref[k] : null;
    splitShow = { k, d, until: raceTime + 5 }; splitLog.push({ lap: player.lap, cp: k + 1, t: +t.toFixed(2), d: d == null ? null : +d.toFixed(2) });
    const el = $('#hudSplit'); if (!el) return;
    el.textContent = d == null ? `${k + 1}/4 ${fmtTime(t)}` : `${k + 1}/4 ${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(2)}`;
    el.classList.toggle('faster', d != null && d < 0); el.classList.toggle('slower', d != null && d >= 0);
  }
  // ---------------- stunts (B23) ----------------
  // every loop and jump of the main road, and the entry speeds that carry a car through it: found by sending a scratch
  // rival through it at full throttle with the same updateRacer as everyone, so the numbers are what the road asks
  let stunts = [], stuntMs = 0;
  function buildStunts() {
    stunts = []; const S = track.samples, n = S.length, kindOf = (q) => q.kind === 'loop' ? (q.cork ? 'cork' : 'loop') : q.kind === 'ramp' ? 'jump' : null; // a corkscrew and the loop behind it are two stunts
    for (let i = 0; i < n; i++) { const k = kindOf(S[i]); if (k && kindOf(S[(i - 1 + n) % n]) !== k) stunts.push({ kind: k, s: i * track.ds, v: {} }); }
    for (const t of stunts) { let j = Math.round(t.s / track.ds); while (j < 2 * n && ['loop', 'ramp', 'gap', 'land'].includes(S[j % n].kind) && (j === Math.round(t.s / track.ds) || kindOf(S[j % n]) !== 'loop' || kindOf(S[(j - 1) % n]) === 'loop')) j++; t.len = j * track.ds - t.s + (t.kind === 'jump' ? TB.LAND_ZONE : 0) + 2; }
  }
  const SIM_DRIVER = { name: '', skill: 1, wobble: 0, lines: {} };
  function stuntRun(t, car, v0, assist) { // 'low' (fell, short, stalled), 'high' (past the landing zone) or 'ok'
    const r = makeRacer(car, null, SIM_DRIVER, true), L = track.length, ctl = { gas: 1, brake: 0, steer: 0, turbo: 0 };
    Object.assign(r, { s: t.s, v: v0, safeS: t.s, turbo: 0, assist, lap: -99 }); let went = 0;
    for (let i = 0; i < 6000; i++) {
      const s0 = r.s; updateRacer(r, SIM_DT, ctl);
      if (r.crashed > 0) return 'low';
      if (r.hardLandings) return 'high';
      let d = r.s - s0; if (d < -L / 2) d += L; went += d;
      if (went > t.len && !r.air) return 'ok';
      if (r.v < 0.5 && !r.air && i > 20) return 'low';
    }
    return 'low';
  }
  function stuntSpeeds(t, car, assist) { // { min, max } entry speed in m/s (max: Infinity for a loop)
    const key = car.id + (assist ? '+' : ''); if (t.v[key]) return t.v[key];
    const run = (v) => stuntRun(t, car, v, assist), top = car.top * 1.05;
    let ok = 0; for (let v = 12; v <= top; v += 3) if (run(v) === 'ok') { ok = v; break; }
    if (!ok) return (t.v[key] = { min: top, max: top });
    let lo = 0, hi = ok; while (hi - lo > 0.25) { const m = (lo + hi) / 2; if (run(m) === 'ok') hi = m; else lo = m; }
    const out = { min: hi, max: Infinity };
    if (t.kind === 'jump') { let a = ok, b = car.top * 1.3; if (run(b) !== 'ok') { while (b - a > 0.25) { const m = (a + b) / 2; if (run(m) === 'ok') a = m; else b = m; } out.max = a; } }
    return (t.v[key] = out);
  }
  // a jump whose ramp starts less than 50 m after where this side street rejoins
  function rampAfter(q) { const L = track.length; return stunts.some((t) => t.kind === 'jump' && ((t.s - q.endS) % L + L) % L < 50); }
  // the next stunt within `within` metres ({ t, d }: d < 0 while in it); from a side street only the ones after it rejoins
  function stuntAhead(r, within) {
    const q = routeFor(r); if (!stunts.length) return null; const L = track.length; let best = null;
    for (const t of stunts) { let d = t.s - r.s; if (d < -L / 2) d += L; if (d > L / 2) d -= L; if (q && ((t.s - q.endS) % L + L) % L > L / 2) continue; // from a side street only what comes after it
      if (d <= within && d >= -t.len && (!best || d < best.d)) best = { t, d }; }
    return best;
  }
  // what a rival aims for near a stunt: into a loop with 30 % on its minimum (as far as the curve before allows), onto a
  // ramp at the speed that lands in the middle of the zone; aiSlow, the rubber band and the Razzia do not count there
  function stuntTarget(r, target, i) {
    if (r.air || routeFor(r) || !stunts.length) return target; const L = track.length; let need = 0, nearLoop = Infinity, jump = null;
    stunts.forEach((t, k) => {
      let d = t.s - r.s; if (d < -L / 2) d += L; if (d > L / 2) d -= L; if (d > 160 || d < -t.len) return;
      const sp = stuntSpeeds(t, r.car, r.assist);
      if (t.kind === 'jump') { if (!jump || d < jump.d) jump = { d, sp }; return; }
      let n = sp.min * 1.3; const nx = stunts[(k + 1) % stunts.length]; let gap = nx.s - (t.s + t.len); if (gap < -L / 2) gap += L; // a jump right behind the loop: come out fast enough for its ramp (no engine on a ramp)
      if (nx !== t && nx.kind === 'jump' && gap < 150) n = Math.max(n, stuntSpeeds(nx, r.car, r.assist).min * 1.2);
      need = Math.max(need, Math.min(r.car.top, n, d > 30 ? track.safe[i] * 1.05 : 1e9)); nearLoop = Math.min(nearLoop, d);
    });
    if (jump && jump.d < nearLoop) { const sp = jump.sp; return isFinite(sp.max) ? Math.min(sp.max * 0.93, sp.min * 0.45 + sp.max * 0.55) : Math.max(target, sp.min * 1.2); }
    return Math.max(target, need);
  }
  function aiControl(r, dt) {
    const activeRoute = routeFor(r);
    if (activeRoute) {
      const distance = (r.s - activeRoute.startS) * activeRoute.length / (activeRoute.endS - activeRoute.startS);
      let target = r.car.top * 0.8;
      // Brake before an alley bend, using real branch metres instead of main-road progress.
      for (let ahead = 0; ahead <= 75; ahead += 5) {
        const f = window.Shortcuts.frameAt(activeRoute, distance + ahead);
        const safe = Math.sqrt(24 * r.car.grip * (activeRoute.surface === 'cobble' ? 0.85 : 1) / Math.max(0.001, Math.abs(f.curv))) * 0.8;
        target = Math.min(target, Math.sqrt(safe * safe + 2 * r.car.brake * 0.55 * ahead));
      }
      let lane = 0;
      const obstacle = routeObstacles(activeRoute).find((o) => o.d > distance - 3 && o.d < distance + 35);
      if (obstacle) { lane = -Math.sign(obstacle.lat || 1) * Math.min(activeRoute.halfWidth - 1.1, obstacle.r + 1.2); target = Math.min(target, 14); }
      return { gas: r.v < target ? 1 : 0, brake: r.v > target + 2 ? 0.7 : 0, steer: steerTo(r, lane, 1.4), turbo: 0 };
    }
    r.aiTimer -= dt;
    if (r.aiTimer <= 0) { r.aiTimer = 4 + Math.random() * 8; r.aiSlow = Math.random() < r.wobble * 0.6 ? 0.55 + Math.random() * 0.3 : 1; r.laneBias = (Math.random() - 0.5) * 6; }
    const i = Math.floor(((r.s % track.length) + track.length) % track.length / track.ds) % track.samples.length;
    // the rubber band (KLÜNGEL: AN) only for LEICHT and MITTEL; SCHWER and EXPERTE race an honest field
    let band = 1; const diffN = PLAYABLE[sel.driver].diffN || 0;
    if (r.isAI && player && !player.finished && phase === 'race' && raceOpts.kluengel && diffN < 2) { const L = track.length; const gap = (r.s + r.lap * L) - (player.s + player.lap * L); const k = [0.22, 0.14][diffN]; band = clamp(1 - gap / 300 * k, 1 - k * 0.9, 1 + k * 0.5); }
    r.band = band;
    const target = stuntTarget(r, Math.min(r.car.top * r.skill * (r.isCop ? 1.05 : 0.95), track.safe[i] * (0.86 + r.skill * 0.2)) * (r.aiSlow < 1 ? r.aiSlow : 1) * (telefon.active > 0 && r !== player2 ? 0.7 : 1) * (razzia > 0 && r !== player2 ? 0.62 : 1) * band, i);
    let gas = r.v < target ? 1 : 0, brake = r.v > target + 3 ? 0.8 : 0; r.aiTarget = target;
    let wantLat = Math.sin(raceTime * 0.7 + r.wobblePhase) * r.wobble * 2 + r.laneBias * 0.5;
    { const sa = stuntAhead(r, 70); if (sa && sa.t.kind === 'jump') wantLat = clamp(r.lat, -ROAD_W / 2 - 0.5, ROAD_W / 2 + 0.5); } // straight onto a ramp: hold the lane (unless a slower car is in it), take the heading out
    // avoid the car ahead
    for (const o of racers) {
      if (o === r || o.crashed > 0 || !sameRoad(o, r)) continue;
      let ds = o.s - r.s; const L = track.length; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
      if (ds > 0 && ds < 16 && Math.abs(o.lat - r.lat) < 3) { wantLat = r.lat + (r.lat > o.lat ? 3 : -3); if (ds < 7 && o.v < r.v && !stuntAhead(r, 160)) gas = 0.3; } // never lift before or in a stunt: too slow means the water, the roof or the fall
    }
    if (r.yieldT > 0) { r.yieldT -= dt; wantLat = r.lat >= 0 ? ROAD_W - 1.5 : -ROAD_W + 1.5; gas = Math.min(gas, 0.6); }
    const fork = r.isAI && !r.isCop && track.routeGroups.find((g) => g.startS >= r.s && g.startS - r.s < 100); let forkLine = false;
    if (fork) {
      const key = r.lap + ':' + fork.startS;
      if (r.branchKey !== key) {
        // Stable choices per rival/lap: some stay on the main road, others take either arm.
        const choice = fork.routes.length === 1 ? (aiWantsRoute(r, fork.routes[0]) ? 1 : 0) : (r.routeSeed + r.lap - 1 + track.routeGroups.indexOf(fork)) % (fork.routes.length + 1);
        r.branchPlan = choice ? fork.routes[choice - 1].index : -1; if (r.branchPlan >= 0 && rampAfter(track.shortcuts[r.branchPlan])) r.branchPlan = -1; r.branchKey = key; // a side street that rejoins right before a ramp leaves no run-up for it
      }
      const approach = TB.frameAt(track, r.s);
      if (fork.startS - r.s < 90 && !r.air && ['straight', 'curve', 'tunnel', 'bridge', 'loop'].includes(approach.kind)) { // (Poller: the fork comes 23 m after a loop, so line up in it) // the car needs a few metres to turn in: line up early, brake late
        const planned = track.shortcuts[r.branchPlan];
        wantLat = planned ? planned.side * 2.2 : 0; forkLine = true;
        if (planned && r.v > 23 && fork.startS - r.s < 50) { gas = 0; brake = Math.max(brake, 0.8); }
      }
    }
    wantLat = clamp(wantLat, -ROAD_W + 1.5, ROAD_W - 1.5);
    const steer = steerTo(r, wantLat, forkLine ? 1.6 : 1.1);
    const f = TB.frameAt(track, r.s);
    const turbo = fork ? 0 : r.turbo > 0.6 && f.kind === 'straight' && r.skill > 0.88 && Math.random() < 1.2 * dt ? 1 : (r.turboOn && r.turbo > 0.05 ? 1 : 0);
    return { gas, brake, steer: clamp(steer, -1, 1), turbo };
  }

  const STUNT_KINDS = ['loop', 'ramp', 'gap', 'land'];
  function collide(a, b, dt) {
    const k = (dt || 1 / 60) * 60; // the push and the scratches per second do not depend on the step size
    if (a.crashed > 0 || b.crashed > 0 || a.air !== b.air || !sameRoad(a, b)) return;
    let ds = a.s - b.s; const L = track.length;
    if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
    const route = routeFor(a);
    if (route) ds *= route.length / (route.endS - route.startS);
    const dl = a.lat - b.lat;
    if (Math.abs(ds) < 4.6 && Math.abs(dl) < 2.3) {
      const push = (dl >= 0 ? 1 : -1) * 4;
      a.lat += push * 0.05 * k; b.lat -= push * 0.05 * k;
      if (Math.abs(ds) < 2.5) { a.lat += push * 0.08 * k; b.lat -= push * 0.08 * k; }
      else if ([a, b].some((r) => STUNT_KINDS.includes(racerFrame(r).kind) || (stuntAhead(r, 100) || {}).d > 0)) { /* in a loop, on a ramp or on the run-up to one nobody brakes the car behind: the speed is all that carries you (B23) */ }
      else if (ds > 0) { const vb = b.v; b.v = Math.min(b.v, a.v * 0.95); a.v = Math.max(a.v, vb * 0.9); }
      else { const va = a.v; a.v = Math.min(a.v, b.v * 0.95); b.v = Math.max(b.v, va * 0.9); }
      for (const r of [a, b]) if (!r.isAI) { r.damage = Math.min(1, r.damage + 0.01 * k); if (r.damage >= 1) crash(r, 'off'); } // a full damage bar is a Totalschaden, never a silent 100 %
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
    const yaw = -(r.yaw || 0) - r.steerVis * 0.05 * Math.sign(r.v || 1); // the body points where the car goes, the front wheels a little further
    let fwd = T.clone().applyAxisAngle(N, yaw);
    let up = N.clone();
    if (r.air) { const pitch = clamp(Math.atan2(r.vy, Math.max(5, r.v)), -0.6, 0.6); fwd = new THREE.Vector3(T.x, 0, T.z).normalize().applyAxisAngle(B, pitch); up = new THREE.Vector3(0, 1, 0).applyAxisAngle(B, pitch); } // B points right: a turn about it lifts the nose while the car climbs
    const right = new THREE.Vector3().crossVectors(up, fwd).normalize();
    _m.makeBasis(right, up, fwd); _q.setFromRotationMatrix(_m);
    r.mesh.position.copy(pos);
    r.mesh.quaternion.slerp(_q, Math.min(1, dt * 14));
    if (window.Cars) window.Cars.animate(r.mesh, r.v, dt, r.steerVis);
    if (r.crashed > 0) { r.mesh.rotation.z += dt * 6; r.mesh.position.y += Math.sin(r.crashed * 9) * 0.5 + 0.5; }
    r.frame = { pos, T, N, B, fwd, up }; r.drawFrame = null;
  }
  // a car on the verge throws up gravel and grit (city) or grass and soil (park) behind its rear wheels: square pixels
  const dirt = { pts: null, n: 256, k: 0, vel: null, life: null };
  function vergeDirt(dt) {
    if (!scene) return;
    if (!dirt.pts || dirt.pts.parent !== scene) {
      if (dirt.pts) { dirt.pts.geometry.dispose(); dirt.pts.material.dispose(); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(dirt.n * 3).fill(-9999), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(dirt.n * 3), 3));
      dirt.pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.34, vertexColors: true })); dirt.pts.frustumCulled = false; scene.add(dirt.pts);
      dirt.vel = new Float32Array(dirt.n * 3); dirt.life = new Float32Array(dirt.n); dirt.k = 0;
    }
    const P = dirt.pts.geometry.attributes.position.array, C = dirt.pts.geometry.attributes.color.array, V = dirt.vel; let live = false;
    const green = !theme.street || theme.street === 'park', cols = (green ? [0x4f9a35, 0x6fb444, 0x6b4a2a] : [0x9a8f80, 0x7d736a, 0xbdb19c]).map((c) => new THREE.Color(c).multiplyScalar(theme.night ? 0.45 : 1));
    for (const r of ipBodies()) {
      if (!r.onVerge || r.air || r.crashed > 0 || Math.abs(r.v) < 3 || !r.mesh || !r.mesh.visible) { r.dirtAcc = 0; continue; }
      const fr = r.drawFrame || r.frame; if (!fr) continue;
      if (r === player && Math.abs(r.v) > 8) shake = Math.max(shake, 0.12); // the shoulder rattles
      r.dirtAcc = (r.dirtAcc || 0) + dt * Math.min(90, 20 + Math.abs(r.v) * 2.5);
      for (; r.dirtAcc >= 1; r.dirtAcc--) {
        const i = dirt.k, side = Math.random() < 0.5 ? -1 : 1, c = cols[Math.floor(Math.random() * 3)]; dirt.k = (dirt.k + 1) % dirt.n;
        P[i * 3] = fr.pos.x - fr.fwd.x * 1.6 + fr.B.x * side * 0.85; P[i * 3 + 1] = fr.pos.y + 0.25; P[i * 3 + 2] = fr.pos.z - fr.fwd.z * 1.6 + fr.B.z * side * 0.85;
        const fwd = Math.abs(r.v) * (0.25 + Math.random() * 0.2), up = 2 + Math.random() * 3.5, out = side * (0.5 + Math.random() * 2.5);
        V[i * 3] = fr.fwd.x * fwd + fr.B.x * out; V[i * 3 + 1] = up; V[i * 3 + 2] = fr.fwd.z * fwd + fr.B.z * out;
        dirt.life[i] = 0.45 + Math.random() * 0.4; C[i * 3] = c.r; C[i * 3 + 1] = c.g; C[i * 3 + 2] = c.b;
      }
    }
    for (let i = 0; i < dirt.n; i++) {
      if (dirt.life[i] <= 0) continue;
      dirt.life[i] -= dt; live = true;
      if (dirt.life[i] <= 0) { P[i * 3 + 1] = -9999; continue; }
      V[i * 3 + 1] -= 14 * dt; P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt;
    }
    if (live) { dirt.pts.geometry.attributes.position.needsUpdate = true; dirt.pts.geometry.attributes.color.needsUpdate = true; }
  }

  // ---------------- line of sight for the cameras ----------------
  // A coarse layer of oriented boxes (houses, trees, landmarks, loop supports: world.js keeps one per mesh before it
  // batches them) in a 16 m grid. A box a car drives through (a gate, a bridge, a tunnel tube, the house under a jump)
  // is no wall for the cameras and is left out.
  const OCC_CELL = 16, OCC_W = 18; const occ = { n: 0, data: null, cells: new Map(), stamp: null, mark: 0 };
  const occKey = (cx, cz) => (cx + 32768) * 65536 + (cz + 32768);
  function buildOccluders() {
    const list = (scenery.occluders || []).slice(); road.traverse((o) => { if (o.userData.occluders) for (const b of o.userData.occluders) list.push(b); });
    // the road deck itself where it leaves the ground (loops, ramps, bridges): the far side of a loop hides the car
    for (let i = 0; i < track.samples.length; i += 2) {
      const q = track.samples[i]; if (q.kind !== 'loop' && q.kind !== 'ramp' && q.kind !== 'land' && q.p.y < 1.5) continue;
      const ax = [q.T, q.N, q.B], inv = []; for (const a of ax) inv.push(a.x, a.y, a.z, -(a.x * q.p.x + a.y * q.p.y + a.z * q.p.z));
      const w = ROAD_W + 0.6; list.push({ inv, min: [-1.2, -0.4, -w], max: [1.2, 0.02, w], world: [q.p.x - w - 2, q.p.y - w - 2, q.p.z - w - 2, q.p.x + w + 2, q.p.y + w + 2, q.p.z + w + 2] });
    }
    const pts = new Map(), addPt = (x, y, z) => { const k = occKey(Math.floor(x / OCC_CELL), Math.floor(z / OCC_CELL)); if (!pts.has(k)) pts.set(k, []); pts.get(k).push(x, y, z); };
    for (const q of track.samples) addPt(q.p.x + q.N.x * 1.2, q.p.y + q.N.y * 1.2, q.p.z + q.N.z * 1.2);
    for (const r of track.shortcuts || []) for (const q of r.samples) addPt(q.p.x, q.p.y + 1.2, q.p.z);
    const data = new Float32Array(list.length * OCC_W); let n = 0; occ.cells = new Map();
    const inside = (o, x, y, z) => { for (let a = 0; a < 3; a++) { const v = data[o + a * 4] * x + data[o + a * 4 + 1] * y + data[o + a * 4 + 2] * z + data[o + a * 4 + 3]; if (v < data[o + 12 + a] - 0.05 || v > data[o + 15 + a] + 0.05) return false; } return true; };
    for (const b of list) {
      const o = n * OCC_W; data.set(b.inv, o); data.set(b.min, o + 12); data.set(b.max, o + 15);
      const w = b.world, c0 = Math.floor(w[0] / OCC_CELL), c1 = Math.floor(w[3] / OCC_CELL), z0 = Math.floor(w[2] / OCC_CELL), z1 = Math.floor(w[5] / OCC_CELL);
      let road = false; for (let cx = c0; cx <= c1 && !road; cx++) for (let cz = z0; cz <= z1 && !road; cz++) { const P = pts.get(occKey(cx, cz)); if (P) for (let k = 0; k < P.length && !road; k += 3) road = inside(o, P[k], P[k + 1], P[k + 2]); }
      if (road) continue;
      for (let cx = c0; cx <= c1; cx++) for (let cz = z0; cz <= z1; cz++) { const k = occKey(cx, cz); if (!occ.cells.has(k)) occ.cells.set(k, []); occ.cells.get(k).push(n); }
      n++;
    }
    occ.n = n; occ.data = data; occ.stamp = new Uint32Array(n); occ.mark = 0;
  }
  // the first hit on the segment a → b as a fraction 0..1 of its length, -1 for a clear line
  function occHit(a, b) {
    if (!occ.n) return -1;
    const D = occ.data, cx0 = Math.floor(Math.min(a.x, b.x) / OCC_CELL), cx1 = Math.floor(Math.max(a.x, b.x) / OCC_CELL), cz0 = Math.floor(Math.min(a.z, b.z) / OCC_CELL), cz1 = Math.floor(Math.max(a.z, b.z) / OCC_CELL);
    if ((cx1 - cx0 + 1) * (cz1 - cz0 + 1) > 400) return -1; // far apart: not a camera question
    let best = 2; if (++occ.mark >= 0xffffffff) { occ.stamp.fill(0); occ.mark = 1; }
    for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
      const list = occ.cells.get(occKey(cx, cz)); if (!list) continue;
      for (const i of list) {
        if (occ.stamp[i] === occ.mark) continue; occ.stamp[i] = occ.mark; const o = i * OCC_W; let t0 = 0, t1 = Math.min(1, best);
        for (let k = 0; k < 3 && t0 <= t1; k++) {
          const r = o + k * 4, pa = D[r] * a.x + D[r + 1] * a.y + D[r + 2] * a.z + D[r + 3], pb = D[r] * b.x + D[r + 1] * b.y + D[r + 2] * b.z + D[r + 3], d = pb - pa, lo = D[o + 12 + k], hi = D[o + 15 + k];
          if (Math.abs(d) < 1e-9) { if (pa < lo || pa > hi) t0 = 2; continue; }
          let ta = (lo - pa) / d, tb = (hi - pa) / d; if (ta > tb) { const q = ta; ta = tb; tb = q; }
          if (ta > t0) t0 = ta; if (tb < t1) t1 = tb;
        }
        if (t0 <= t1 && t0 < best) best = t0;
      }
    }
    return best <= 1 ? best : -1;
  }
  const carEye = (fr, h) => fr.pos.clone().addScaledVector(fr.up || fr.N, h == null ? 1.2 : h); // the point a camera has to see
  // a trackside TV spot beside frame f: both sides, three heights, the first one that sees every point of the car's path
  // (path[0]: where the car is now). None does: the one that sees the car now and most of the rest; none sees the car:
  // a camera just behind it, pulled in front of whatever is in the way
  function tvSpot(f, side0, dist, heights, path, fr) {
    let best = null, bestN = -1;
    for (const side of [side0, -side0]) for (const h of heights) {
      const c = new THREE.Vector3(f.p.x + f.B.x * side * dist, f.p.y + h, f.p.z + f.B.z * side * dist); let n = 0;
      for (let k = 0; k < path.length; k++) if (occHit(path[k], c) < 0) n += k ? 1 : 100;
      if (n === path.length + 99) return c; if (n > bestN) { bestN = n; best = c; }
    }
    if (bestN >= 100 || !fr) return best;
    const c = path[0].clone().addScaledVector(fr.fwd || fr.T, -10).addScaledVector(fr.up || fr.N, 3.5), t = occHit(path[0], c);
    return t < 0 ? c : path[0].clone().lerp(c, Math.max(0, t - 0.5 / 10.6));
  }
  const onPath = (f, h) => new THREE.Vector3(f.p.x + (f.N ? f.N.x : 0) * h, f.p.y + (f.N ? f.N.y : 1) * h, f.p.z + (f.N ? f.N.z : 0) * h);

  // ---------------- camera (one per view) ----------------
  function updateCameraFor(view, r, dt, mode, cam) {
    cam = cam || camera;
    const fr = r && (r.drawFrame || r.frame); if (!fr) return;
    let target, look, up; const N = fr.N, T = fr.T;
    if (mode === 0 || mode === 2) {
      const dist = mode === 0 ? 11 : 20, h = mode === 0 ? 4.2 : 8;
      const here = racerFrame(r), back = racerFrame(r, r.s - dist);
      if (here.kind === 'loop' || back.kind === 'loop') { // inside a loop or cork screw: follow the ribbon, a straight tangent would put the camera through the loop's skin
        target = new THREE.Vector3(back.p.x, back.p.y, back.p.z).addScaledVector(new THREE.Vector3(back.N.x, back.N.y, back.N.z), h * 0.8);
      } else target = fr.pos.clone().addScaledVector(T, -dist).addScaledVector(N, h);
      look = fr.pos.clone().addScaledVector(T, mode === 2 && isMobile ? 12 : 6).addScaledVector(N, 1); up = N; // phone, high camera: more road ahead, the car stays above the touch row
    } else if (mode === 1) {
      target = fr.pos.clone().addScaledVector(T, -0.2).addScaledVector(N, 1.45);
      look = fr.pos.clone().addScaledVector(T, 30).addScaledVector(N, 1.0); up = N;
    } else if (racerFrame(r).kind === 'tunnel') { // no TV camera sees into a tunnel: ride along inside the tube
      target = fr.pos.clone().addScaledVector(T, -9).addScaledVector(N, 3); look = fr.pos.clone().addScaledVector(T, 6).addScaledVector(N, 1); up = N; view.tvTimer = 0;
    } else {
      view.tvTimer -= dt;
      const eye = carEye(fr); view.tvBlocked = view.tv && occHit(eye, view.tv) >= 0 ? 1 : 0; // a house, a tree or the far side of a loop moved into the shot: cut to the next camera
      if (!view.tv || view.tvRoute !== r.shortcut || view.tvTimer <= 0 || view.tv.distanceTo(fr.pos) > 140 || view.tvBlocked > 0) {
        const route = routeFor(r), at = (d) => route ? window.Shortcuts.frameAt(route, (r.s - route.startS) * route.length / (route.endS - route.startS) + d) : TB.frameAt(track, r.s + d);
        // the camera stands 60 m ahead; it must see the car now and on its way past (the next 90 m)
        view.tv = tvSpot(at(60), Math.random() < 0.5 ? -1 : 1, 22, [12 + Math.random() * 4, 18 + Math.random() * 4, 26], [eye].concat([15, 30, 45, 60, 75, 90].map((d) => onPath(at(d), 1.2))), fr); view.tvTimer = 5; view.tvRoute = r.shortcut; view.tvBlocked = 0;
      }
      target = view.tv; look = fr.pos.clone(); up = new THREE.Vector3(0, 1, 0);
    }
    const k = mode === 3 ? 1 : Math.min(1, dt * (mode === 1 ? 30 : 6));
    view.pos.lerp(target, k); view.look.lerp(look, Math.min(1, dt * 12)); view.up.lerp(up, Math.min(1, dt * 5)).normalize();
    if (mode === 0 || mode === 2) {
      if (r.air) view.pos.y = Math.max(view.pos.y, fr.pos.y + 1.6); // in the air: never below the roof, never among the wheels
      const eye = carEye(fr, 1.5), t = occHit(eye, view.pos); // a house, a tree or a loop support between car and camera: pull in to 0.5 m before it
      if (t >= 0) { const d = eye.distanceTo(view.pos), back = view.pos.clone(); view.pos.copy(eye).lerp(back, Math.max(0, t * d - 0.5) / Math.max(1e-3, d)); }
    }
    if (shake > 0 && r === player) { shake -= dt * 2; view.pos.x += (Math.random() - 0.5) * shake; view.pos.y += (Math.random() - 0.5) * shake; }
    cam.position.copy(view.pos); cam.up.copy(view.up); cam.lookAt(view.look);
    if (cam.fov !== (isMobile ? 76 : 70)) { cam.fov = isMobile ? 76 : 70; cam.updateProjectionMatrix(); }
    if (isMobile && (mode === 0 || mode === 2) && r.mesh) { // phone: downhill or in a dip the chase camera would draw the car behind the touch row; tip it down until the car sits in the upper 70 %
      cam.updateMatrixWorld(); const v = r.mesh.position.clone().project(cam), lim = -0.42, tf = Math.tan(cam.fov * Math.PI / 360);
      if (v.z < 1 && v.y < lim) cam.rotateX(Math.atan(v.y * tf) - Math.atan(lim * tf));
    }
  }
  function updateCamera(dt) {
    if (window.STUNTS_FREECAM) { const fc = window.STUNTS_FREECAM; camera.position.set(fc.pos[0], fc.pos[1], fc.pos[2]); camera.up.set(0, 1, 0); camera.lookAt(fc.look[0], fc.look[1], fc.look[2]); return; }
    if (!player || !player.frame) return;
    if (mission && mission.onFoot && mission.walker) { const w = mission.walker; const fwd = new THREE.Vector3(Math.sin(w.rotation.y), 0, Math.cos(w.rotation.y)); views[0].pos.lerp(w.position.clone().addScaledVector(fwd, -4.2).add(new THREE.Vector3(0, 3.6, 0)), Math.min(1, dt * 6)); views[0].look.lerp(w.position.clone().addScaledVector(fwd, 3).add(new THREE.Vector3(0, 1.3, 0)), Math.min(1, dt * 10)); views[0].up.set(0, 1, 0); camera.position.copy(views[0].pos); camera.up.copy(views[0].up); camera.lookAt(views[0].look); if (player.mesh) player.mesh.visible = true; return; }
    if (phase === 'intro') { // flyover: from high above the first bend down into the chase position behind the grid
      const k = Math.min(1, (introT + simAcc) / 3.8), e = k * k * (3 - 2 * k); const fr = player.drawFrame || player.frame; // simAcc: smooth between the fixed steps
      let fs = Math.min(170, track.length * 0.3); { const fk = TB.frameAt(track, fs).kind; if (fk === 'loop' || fk === 'ramp' || fk === 'gap' || fk === 'land') fs = 90; } const f = TB.frameAt(track, fs); const far = new THREE.Vector3(f.p.x, f.p.y, f.p.z).addScaledVector(new THREE.Vector3(f.N.x, f.N.y, f.N.z), 34).addScaledVector(new THREE.Vector3(f.B.x, f.B.y, f.B.z), 26);
      const near = fr.pos.clone().addScaledVector(fr.fwd, -11).addScaledVector(fr.up, 4.2);
      views[0].pos.copy(far).lerp(near, e); views[0].look.copy(fr.pos).addScaledVector(fr.fwd, 6 * e); views[0].up.set(0, 1, 0);
      camera.position.copy(views[0].pos); camera.up.copy(views[0].up); camera.lookAt(views[0].look);
    } else if (phase === 'replay') { replayCamera(views[0], player, dt); }
    else {
      updateCameraFor(views[0], player, dt, camMode, camera);
      if (player2 && camera2) updateCameraFor(views[1], player2, dt, views[1].mode, camera2);
    }
    const fr = player.drawFrame || player.frame;
    if (carLight) carLight.position.copy(fr.pos).addScaledVector(fr.up, 3).addScaledVector(fr.fwd, 6);
    if (sunLight && sunLight.castShadow) { sunLight.position.set(fr.pos.x + 120, fr.pos.y + 200, fr.pos.z + 80); sunLight.target.position.copy(fr.pos); sunLight.target.updateMatrixWorld(); }
    if (player.mesh) player.mesh.visible = !(camMode === 1 && phase !== 'replay' && !player2);
  }

  // ---------------- minimap ----------------
  let miniPath, miniScale, miniOff;
  function buildMinimap() {
    const c = $('#minimap'); const S = track.samples;
    let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
    for (const s of S.concat(...track.shortcuts.map((r) => r.samples))) { minx = Math.min(minx, s.p.x); maxx = Math.max(maxx, s.p.x); minz = Math.min(minz, s.p.z); maxz = Math.max(maxz, s.p.z); }
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
    for (const route of track.shortcuts) { x.strokeStyle = route.kind === 'alternate' ? '#6ccfff' : '#83e7b3'; x.beginPath(); route.samples.forEach((f, i) => { const px = c.width - (f.p.x * miniScale + miniOff.x), py = c.height - (f.p.z * miniScale + miniOff.z); if (i) x.lineTo(px, py); else x.moveTo(px, py); }); x.stroke(); }
    const dot = (r, col, rad) => { const f = racerFrame(r); x.beginPath(); x.arc(c.width - (f.p.x * miniScale + miniOff.x), c.height - (f.p.z * miniScale + miniOff.z), rad, 0, Math.PI * 2); x.fillStyle = col; x.fill(); x.strokeStyle = '#000'; x.lineWidth = 1; x.stroke(); };
    for (const r of racers) if (r.isAI) dot(r, '#ffd400', 2.5);
    if (kripo) dot(kripo, '#2060ff', 3.5);
    if (lmTag && lmTag.t > 0 && Math.floor(lmTag.t * 5) % 2 === 0) { const mx = c.width - (lmTag.base.x * miniScale + miniOff.x), mz = c.height - (lmTag.base.z * miniScale + miniOff.z); x.fillStyle = '#ffd23f'; x.strokeStyle = '#000'; x.lineWidth = 2; x.strokeRect(mx - 4.5, mz - 4.5, 9, 9); x.fillRect(mx - 4.5, mz - 4.5, 9, 9); } // the landmark of the story being told
    dot(player, '#ff2a2a', 4);
    if (player2) dot(player2, '#4fd6ff', 4);
  }

  // ---------------- HUD ----------------
  function progress(r) { return (r.finished ? 1e6 - r.finishTime : 0) + r.lap * track.length + r.s; }
  function standings() { return racers.slice().sort((a, b) => progress(b) - progress(a)); }
  // phones: the HUD table shows only rows with something to say (no '–' rows, no keyboard hints)
  let hudRows = null, hudQuietT = 0;
  function hudQuiet() {
    hudQuietT = 0.5; // desktop too: ZEIT, RUNDE, POS always; the rest only while it has something to say
    if (!hudRows) hudRows = Array.from(document.querySelectorAll('.hudStats > div')).map((d) => ({ d, b: d.querySelector('b') }));
    for (const r of hudRows) { const t = r.b.textContent.trim(); r.d.classList.toggle('quiet', t === '–' || t === '' || /^--/.test(t) || r.b.id === 'hudTel' && t === telLabel() && !kripo || r.b.id === 'hudBeste' && isMobile || mission && /^hud(Runde|Pos|Beste|Split)$/.test(r.b.id) || r.b.id === 'hudPos' && racers.length < 2 || raceMode === 2 && /^hud(Beste|Split)$/.test(r.b.id)); } // a Botengang has no laps or places, a lone run no places
  }
  // Zülpicher 11.11.: a clock from 11:10:45; at 11:11:00 the Session opens
  let elfDone = false;
  function elfUhrElf() {
    const sec = 11 * 3600 + 10 * 60 + 45 + (phase === 'countdown' ? 4.2 - countdown : 4.2 + raceTime), hh = Math.floor(sec / 3600), mm = Math.floor(sec / 60) % 60, ss = Math.floor(sec) % 60;
    $('#hudTrack').textContent = `🕚 ${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')} · ` + trackDef.name.toUpperCase();
    if (!elfDone && phase === 'race' && sec >= 11 * 3600 + 11 * 60) {
      elfDone = true; tusch(); setTimeout(tusch, 900); if (confetti && confetti.userData.burst) confetti.userData.burst(); bumpStat('elfUhrElf');
      sayMust({ name: 'Dä Lange', emoji: '🎉' }, 'Elf Uhr elf! Kölle – Alaaf! Kölle – Alaaf! Kölle – Alaaf! De Session es op!', 5000);
      document.body.classList.add('alaaf'); setTimeout(() => document.body.classList.remove('alaaf'), 2400);
    }
  }
  const loopHud = { inLoop: false, until: -1 }; // the fork banner right after a loop
  function updateHUD() {
    if ((hudQuietT -= 0.016) <= 0) hudQuiet();
    if (theme.elfUhrElf && careerChapter == null && !missionMode && (phase === 'race' || phase === 'countdown')) elfUhrElf();
    const activeRoute = routeFor(player);
    const here = track.samples[Math.floor(((player.s % track.length) + track.length) % track.length / track.ds) % track.samples.length]; // no 'einordnen' while upside down in a loop
    // after a loop the fork can come within a few car lengths (Poller: 23 m): the first sample out of the loop shows it, 150 m ahead, lower, for 2 s
    const inLoop = !!(here && here.kind === 'loop'); if (inLoop) loopHud.inLoop = true; else if (loopHud.inLoop) { loopHud.inLoop = false; loopHud.until = raceTime + 2; }
    const afterLoop = !inLoop && raceTime < loopHud.until;
    const aheadFork = !activeRoute && !inLoop && track.routeGroups.find((g) => g.startS - player.s > 0 && g.startS - player.s < (afterLoop ? 150 : 100));
    const shortcutHint = $('#hudShortcut'); shortcutHint.hidden = phase === 'intro' || !activeRoute && (!aheadFork || (mission && mission.onFoot));
    shortcutHint.classList.toggle('alternate', !!activeRoute && activeRoute.kind === 'alternate'); shortcutHint.classList.toggle('low', afterLoop && !activeRoute && !!aheadFork);
    if (activeRoute) shortcutHint.textContent = `${routeLabel(activeRoute)} · NOCH ${Math.round(activeRoute.length * (activeRoute.endS - player.s) / (activeRoute.endS - activeRoute.startS))} M${routePerks(activeRoute) ? ' · ' + routePerks(activeRoute) : ''}`;
    else if (aheadFork) shortcutHint.textContent = aheadFork.routes.slice().sort((a, b) => a.side - b.side).map((r) => `${r.side < 0 ? '←' : '→'} ${r.name.toUpperCase()} (${routeDelta(r)})`).join(' · ') + (isMobile ? '' : ` · ↑ HAUPTSTRECKE · IN ${Math.round(aheadFork.startS - player.s)} M EINORDNEN`);
    $('#speed').textContent = String(Math.round(Math.abs(player.v) * 3.6)).padStart(3, '0');
    { // B23: 100 m before a loop or a ramp, is the speed right for it? (not on the Stadtrundfahrt: the tour carries you)
      const sa = (phase === 'race' || phase === 'countdown') && raceMode !== 2 && !player.air && player.crashed <= 0 ? stuntAhead(player, 100.5) : null; let w = '';
      if (sa && sa.d > 0) { const sp = stuntSpeeds(sa.t, player.car, player.assist); w = player.v < sp.min ? 'ZE LANGSAM!' : player.v > sp.max ? 'ZE SCHNELL!' : ''; }
      const el = $('#speedWarn'); if (el.textContent !== w) { el.textContent = w; $('#speedo').classList.toggle('warn', !!w); if (w && phase === 'race') beep(w === 'ZE LANGSAM!' ? 520 : 1040, 0.08, 'square', 0.06); }
    }
    $('#hudRunde').textContent = `${player.lap} / ${raceLaps}`;
    if (splitShow && isMobile && raceTime > splitShow.until) { splitShow = null; $('#hudSplit').textContent = '–'; } // the phone shows a split for 5 s
    $('#hudZeit').textContent = fmtTime(raceTime);
    $('#hudBeste').textContent = fmtTime(player.bestLap);
    const pos = standings().indexOf(player) + 1;
    $('#hudPos').textContent = `${pos} / ${racers.length}`;
    $('#hudKn').textContent = knoellchen ? `${knoellchen} × 40 DM` : '–';
    $('#hudDeckel').textContent = deckel ? strokes(deckel) : '–';
    $('#hudWette').textContent = wette ? (wette.done ? (wette.won ? 'JEWONNE' : 'VERLORE') : `${wette.n}🍺 › ${wette.rival.name.toUpperCase().split(' ').pop()}`) : '–';
    if (mission) $('#hudAuftrag').textContent = missionHud(); else $('#hudAuftrag').textContent = auftrag ? (auftrag.stage === 'pickup' ? `HOLEN: ${Math.max(0, Math.round(auftrag.timer))} S` : `› ${auftrag.where} ${Math.max(0, Math.round(auftrag.timer))} S`) : auftragDone ? `${auftragDone} ERLEDIGT` : '–';
    if (kripo) $('#hudKripo').textContent = kripoHud(); else $('#hudKripo').textContent = kripoSeen ? 'ABJEHÄNGT' : knoellchen >= 2 ? 'NOCH 1 BLITZER!' : '–';
    if (player2) { $('#speed2').textContent = String(Math.round(Math.abs(player2.v) * 3.6)).padStart(3, '0'); $('#pos2').textContent = `POS ${standings().indexOf(player2) + 1}/${racers.length} · RUNDE ${player2.lap}/${raceLaps}`; const t2 = $('#turboBar2').children; for (let i = 0; i < t2.length; i++) t2[i].className = (i / t2.length) < player2.turbo ? 'on' : ''; }
    if (lastPos !== null && lastPos !== pos && phase === 'race' && raceTime > 3 && msgTimer <= 0) {
      const ais = racers.filter((r) => r.isAI && !r.isCop); if (ais.length) { const byTuenn = Math.random() < 0.5; const other = pick(ais).driver;
      if (pos < lastPos) { say(byTuenn ? tuenn : other, byTuenn ? pickNew(tuenn.overtake) : pickNew(other.lines.overtaken), 2200); addDeckel(1); }
      else say(byTuenn ? tuenn : other, byTuenn ? pickNew(tuenn.overtaken) : pickNew(other.lines.overtake), 2200); } // no rivals (two players alone): the rest of the HUD still runs
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
    { const forced = cup.on || careerChapter != null || missionMode || demo; raceMode = forced ? 0 : raceOpts.mode; raceLaps = forced ? trackDef.laps : raceOpts.laps; }
    theme = trackDef.theme; theme.kids = kids; // the scenery builds its Kamelle versions from this
    track = TB.buildTrack(trackDef);
    track.shortcuts = window.Shortcuts.buildRoutes(track);
    track.routeGroups = routeGroups(track.shortcuts);
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
    const others = missionMode || raceMode !== 0 ? [] : D.DRIVERS.filter((d) => d !== me && !(player2 && d === player2.driver)).slice(0, player2 ? 8 : 9); // a field of ten (none on a Botengang)
    others.forEach((d, i) => {
      const base = D.CARS.find((c) => c.id === d.car) || D.CARS[1];
      const cdef = Object.assign({}, base, { color: d.color, plate: 'K-' + d.name.slice(0, 2).toUpperCase() + ' ' + (i + 1) });
      const r = makeRacer(cdef, W.buildCar(cdef, theme.night), d, true);
      r.routeSeed = i;
      r.skill = clamp(d.skill * diffMul, 0.7, 1.08);
      scene.add(r.mesh); racers.push(r);
    });
    // starting grid: 2 columns, player at the back like in Stunts
    racers.forEach((r, i) => { const row = Math.floor(i / 2); r.s = 6 + (racers.length / 2 - row) * 7; r.lat = (i % 2 ? 1 : -1) * 2.8; r.safeS = r.s; });
    player.s = 6; player.lat = -2.8; if (player2) { player2.s = 6; player2.lat = 2.8; }
    player.assist = assistOn(); if (player2) player2.assist = assistOn(true); strip.id = null; strip.steer = 0; nitroTap = 0; // EIN-DAUMEN: no thumb left over from the last race
    buildStunts(); { const t0 = performance.now(); for (const r of racers) for (const t of stunts) stuntSpeeds(t, r.car, r.assist); stuntMs = performance.now() - t0; } // the speeds every car of the field needs
    const sz = pixelScale === 1 ? { w: renderer.domElement.width, h: renderer.domElement.height } : (post ? post.size() : { w: 640, h: 360 }); if (camera2) { camera2.aspect = sz.w / (sz.h / 2); camera2.updateProjectionMatrix(); camera.aspect = player2 ? sz.w / (sz.h / 2) : window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); } else { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); }
    for (const v of views) { v.pos.set(0, 5, -15); v.up.set(0, 1, 0); v.look.set(0, 0, 10); v.tv = null; }
    buildMinimap(); lastPos = null;
    recReset(); loadGhost(); buildOccluders();
    blitzers = raceMode !== 0 ? [] : scenery.props.filter((p) => p.userData.type === 'blitzer').map((p) => ({ s: p.userData.at * track.length, flash: p.userData.flash, cool: 0 })); // ZEITFAHREN and STADTRUNDFAHRT: no Blitzer, no Rotlichtblitzer
    signals = raceMode !== 0 ? [] : (scenery.signals || []).map((sg) => Object.assign({ cool: 0 }, sg));
    if (raceMode === 1) scenery.group.traverse((o) => { if (o.userData.walker) o.visible = false; }); // ZEITFAHREN: nobody on the zebra crossings
    // dä Lange "verzällt": anecdotes when you pass the places of his night tour
    stories = scenery.props.filter((p) => p.userData.story).map((p) => ({ s: (p.userData.storyAt != null ? p.userData.storyAt : p.userData.at) * track.length, wz: WZ[p.userData.wz] ? p.userData.wz : '', prop: p, text: p.userData.story, hd: p.userData.storyHd || HD.get(p.userData.story) || '', tag: p.userData.storyTag || storyTag(p.userData.story, p.userData.type), told: kids && DRINK.test(p.userData.story) })); // Pänz: a drinking story is never told, so it keeps no flavour line waiting
    if (raceMode === 2) stories.sort((a, b) => a.s - b.s); // the Stadtrundfahrt tells them in track order
    telefon = { ready: true, active: 0, used: 0 };
    knoellchen = 0; koelsch = 0; radioTimer = 45; storyCool = 0; eventTimer = 30; lmTag = null;
    const idx = TRACKS.indexOf(trackDef);
    $('#hudTrack').textContent = careerChapter != null ? `KAPITEL ${careerChapter + 1}: ${tuenn.career[careerChapter].title} · ${missionMode ? 'BOTENGANG' : 'ZIEL: ' + goalText(tuenn.career[careerChapter].goal)}` : missionMode ? `BOTENGANG · ${trackDef.name.toUpperCase()}` : `${cup.on ? 'CUP ' + (cup.i + 1) + '/' + TRACKS.length + ' · ' : idx >= 0 ? idx + 1 + '. ' : ''}${trackDef.name.toUpperCase()} (${(trackDef.tag || 'BAUKASTEN')})${raceMode ? ' · ' + MODES[raceMode] : ''}`;
    splitLog = []; splitShow = null; ghostHidden = false; { const el = $('#hudSplit'); el.textContent = '–'; el.classList.remove('faster', 'slower'); }
    deckel = 0; kripo = null; kripoSeen = false; kripoCaught = false; crashes = 0; waterCrashes = 0; wette = null; lastLapSeen = 1; kripoHitCool = 0; razzia = 0; promille = 0; promilleDone = false; koelschLap = 0; $('#flash').style.background = ''; buildPickups();
    endAuftrag(); auftragT = window.STUNTS_AUFTRAG ? 6 : 30 + Math.random() * 25; auftragDone = 0; auftragFail = 0; lastShot = null; airShot = null; airBest = 0; airNow = 0; airShotT = -9;
  }
  // records per track, mode and laps: stuntskoelle.rec.<track>.<race|tt|tour><laps> (the top five) and stuntskoelle.best.<…> (the best time)
  const boardKey = (kind, def, m, l) => `stuntskoelle.${kind}.${def.id}.${MODE_KEY[m == null ? raceMode : m]}${l == null ? raceLaps : l}`;
  function getBest(def, m, l) { try { const v = localStorage.getItem(boardKey('best', def || trackDef, m, l)); return v ? parseFloat(v) : null; } catch (e) { return null; } }
  function setBest(t) { try { localStorage.setItem(boardKey('best', trackDef), String(t)); } catch (e) { /* ignore */ } }
  function getRecords(def, m, l) { try { const a = JSON.parse(localStorage.getItem(boardKey('rec', def, m, l)) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function addRecord(def, entry) { const list = getRecords(def); list.push(entry); list.sort((a, b) => a.time - b.time); try { localStorage.setItem(boardKey('rec', def), JSON.stringify(list.slice(0, 5))); } catch (e) { /* ignore */ } }
  // a save from before the modes kept one board per track: it becomes the track's RENNEN board over its own laps (also from an old Deckel code)
  function migrateRecords() {
    try {
      const keys = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^stuntskoelle\.(rec|best)\.[^.]+$/.test(k)) keys.push(k); }
      for (const k of keys) {
        const [, kind, id] = k.split('.'), def = allTracks().find((t) => t.id === id) || { id, laps: 3 }, nk = boardKey(kind, def, 0, def.laps || 3), old = localStorage.getItem(k), cur = localStorage.getItem(nk);
        if (kind === 'best') { const a = parseFloat(old), b = parseFloat(cur); if (isFinite(a) || isFinite(b)) localStorage.setItem(nk, String(isFinite(b) && !(a < b) ? b : a)); }
        else { let list = []; try { list = [].concat(JSON.parse(old || '[]'), JSON.parse(cur || '[]')).filter((r) => r && isFinite(r.time)); } catch (e) { /* a broken board is dropped */ } const seen = new Set(); list = list.filter((r) => { const key = r.date + ':' + r.time; if (seen.has(key)) return false; seen.add(key); return true; }).sort((a, b) => a.time - b.time); localStorage.setItem(nk, JSON.stringify(list.slice(0, 5))); }
        localStorage.removeItem(k);
      }
    } catch (e) { /* the records are a bonus */ }
  }

  // ---------------- race flow ----------------
  let cdShown = -1;
  function lockLandscape() {
    if (!document.body.classList.contains('mobile')) return;
    try {
      const el = document.documentElement; const fs = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : Promise.reject();
      Promise.resolve(fs).catch(() => {}).then(() => { if (screen.orientation && screen.orientation.lock) return screen.orientation.lock('landscape'); }).catch(() => {});
    } catch (e) { /* iOS: no lock API, the rotate overlay does the job */ }
  }
  const telLabel = () => document.body.classList.contains('mobile') || isMobile ? '☎ TIPPEN' : 'K = ANRUFEN';
  function startRace(def, after) { // the scenery build blocks for a moment: show the doorman first, then build
    audioInit(); if (phase === 'loading') return; closeOnboard(); phase = 'loading';
    if (!demo && !cup.on && careerChapter == null && !missionMode) try { localStorage.setItem('stuntskoelle.last', (def || activeTrackDef()).id); } catch (e) { /* ignore */ }
    const ov = $('#loading'); ov.hidden = false; $('#loadingText').textContent = pick(tuenn.loading || ['Dä Lange kuckt dich an…']); $('#menu').hidden = true; $('#results').hidden = true;
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => { try { startRaceNow(def); if (after) after(); } finally { ov.hidden = true; } }, 20)));
  }
  let quickAgain = false, introLinePending = false;
  // the first three races: a big card with the controls during the countdown (after that it is in the pause panel)
  function showControlsCard() {
    if (careerChapter != null && tuenn.career[careerChapter] && !demo) { // career: a briefing card with the goal, readable before the start
      const c = tuenn.career[careerChapter]; $('#controlsCard').querySelector('b').textContent = `KAPITEL ${careerChapter + 1}: ${c.title}`;
      $('#controlsText').innerHTML = `ZIEL: ${c.type === 'mission' ? 'ABHOLEN UN ABLIEFERN' : goalText(c.goal)}<br><small>${c.intro}</small>`; $('#controlsCard').hidden = false; return;
    }
    $('#controlsCard').querySelector('b').innerHTML = 'SU FÄHRS DE<i class="gl">So fährst du</i>';
    if (demo) return; // the attract demo is nobody's race: it neither uses up the card nor counts as played (EINFACH LOSFAHRE)
    let n = 0; try { n = parseInt(localStorage.getItem('stuntskoelle.controlsSeen') || '0') || 0; localStorage.setItem('stuntskoelle.controlsSeen', String(n + 1)); } catch (e) { /* ignore */ }
    if (n >= (isMobile ? 1 : 3) || window.STUNTS_SIMSTEPS) return; // a phone shows it once, as a small card in the top third
    // every key with its Kölsch word and, under it, the Hochdeutsch one (JAS / Gas)
    const rows = oneThumb() ? [['◀ ▶', 'LINKS WISCHE', 'links wischen = lenken'], ['■', 'BREMS', 'Bremse'], ['N', 'TURBO', 'antippen'], ['☰', 'PAUS', 'Pause']] : isMobile ? [['▲', 'JAS', 'Gas'], ['■', 'BREMS', 'Bremse'], ['◀ ▶', 'LENKE', 'lenken'], ['N', 'TURBO'], ['☰', 'PAUS', 'Pause']] : [['↑', 'JAS', 'Gas'], ['↓', 'BREMS', 'Bremse'], ['← →', 'LENKE', 'lenken'], ['SHIFT', 'TURBO'], ['R', 'ZERÖCK OP DE STROSS', 'zurück auf die Straße'], ['P', 'PAUS', 'Pause'], ['ESC', 'MENÜ']];
    $('#controlsText').innerHTML = rows.map(([k, w, g]) => `<span class="kv">${k} ${w}${g ? `<i>${g}</i>` : ''}</span>`).join('');
    $('#controlsCard').hidden = false;
  }
  // a tap anywhere outside the buttons skips the flyover, like Enter or Space
  document.addEventListener('pointerdown', (e) => { if (phase === 'intro' && !paused && !(e.target.closest && e.target.closest('button, a, input'))) introT = 99; });
  function startRaceNow(def) {
    buildScene(def); chatReset();
    raceStunts = 0; hookSaid = 0; dropSaid = riseSaid = -99; lamboLines = 0; elfDone = false; jeckSaid = 0; crashLog = []; crashAt = []; helpSaid = -99; notesTold.clear(); pendingNote = noteShown = null;
    raceTime = 0; raceTicks = 0; simAcc = 0; loopHud.inLoop = false; loopHud.until = -1; countdown = 4.2; phase = 'intro'; introT = quickAgain ? 99 : 0; quickAgain = false; hornCool = 0; newOrden = []; perf.frames = 0; // NOCHMAL: straight to the countdown
    { const c = $('#introCard'); c.hidden = false; c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; $('#introName').textContent = trackDef.name.toUpperCase(); $('#introSub').textContent = missionMode ? 'BOTENGANG · ABHOLEN, ABLIEFERN, NIT ERWISCHE LASSE' + (careerChapter != null ? ` · KAPITEL ${careerChapter + 1}: ${tuenn.career[careerChapter].title}` : '') : `${raceMode ? MODES[raceMode] + ' · ' : ''}${(trackDef.district || 'Klüngel-Baukasten').toUpperCase()} · ${raceLaps} ${raceLaps > 1 ? 'RUNDEN' : 'RUNDE'} · ${(track.length * raceLaps / 1000).toFixed(1)} KM` + (ghostData && ghostData.name ? ` · GEGEN ${ghostData.name}` : '') + (careerChapter != null ? ` · KAPITEL ${careerChapter + 1}: ${tuenn.career[careerChapter].title} · ZIEL: ${goalText(tuenn.career[careerChapter].goal)}` : ''); } perf.since = 0; perf.wait = 3;
    musicPlay();
    $('#menu').hidden = true; $('#hud').hidden = false; $('#results').hidden = true; $('#editor').hidden = true; $('#touch').hidden = !isTouch;
    document.body.classList.add('racing'); document.body.classList.remove('resultsOpen', 'replaying');
    const { hour, dayLines } = sceneHour();
    const sceneKey = theme.dawn ? 'dawn' : theme.dusk ? 'dusk' : theme.night ? 'night' : null;
    introLinePending = !!theme.intro; // said when the race starts, however slow the flyover
    if (!theme.intro && sceneKey && tuenn.scene && tuenn.scene[sceneKey]) setTimeout(() => { if (phase === 'race' || phase === 'countdown') sayMust(tuenn, pickNew(tuenn.scene[sceneKey]), 4000, { small: true }); }, 7000);
    sayMust(tuenn, raceMode === 2 ? pickNew(tuenn.modes.tour) : ghostData && ghostData.name ? tuenn.modes.ghost.replace('{name}', ghostData.name).replace('{t}', fmtTime(ghostData.time)) : ghostData ? `Ding beste Rund (${fmtTime(ghostData.time)}) fährt als Geist mit. Fang se, Jung!` : raceMode === 1 ? pickNew(tuenn.modes.tt) : (!(demo || greeted++) || Math.random() < 0.35 ? pickNew(dayLines).replace('{h}', String(hour)) : Math.random() < 0.5 ? pickNew(tuenn.door) : pickNew(tuenn.intro)), 3800, { small: true });
    $('#hudTel').textContent = telLabel();
    if (tilt.mode > 0) { tiltListen(); setTimeout(tiltCalibrate, 1500); }
    if (isMobile) { camMode = 0; tvCam = null; }
    setTimeout(() => { const ais = racers.filter((r) => r.isAI && !r.isCop); if (phase !== 'menu' && ais.length) { const d = pick(ais).driver; sayMust(d, pickNew(d.lines.start), 2500, { small: true }); } }, 3900);
    setTimeout(() => { if (phase === 'race' && !player2 && !raceMode) offerWette(); }, 9000);
    cdShown = -1;
    if (introT >= 99) { for (const r of racers) placeRacer(r, 1 / 60); updateCamera(1 / 60); tick(SIM_DT); } // NOCHMAL: no flyover, the camera sits behind the car and the countdown runs at once
  }
  // arcade name entry: three letters on the record table, like on every cabinet in 1989
  const NE_ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ-. ';
  const nameEntry = { on: false, cur: 0, letters: ['K', 'Ö', 'L'], def: null, date: 0, key: '', rec: false, ghost: false }; // rec: a top-five time; ghost: GEIST SPEICHERN FÖR …
  function savedInitials() { try { return localStorage.getItem('stuntskoelle.initials') || ''; } catch (e) { return ''; } }
  function neRender() { document.querySelectorAll('#nameEntry .neCol span').forEach((el, i) => { el.textContent = nameEntry.letters[i] === ' ' ? '_' : nameEntry.letters[i]; el.classList.toggle('on', i === nameEntry.cur); }); }
  function offerNameEntry(def, entry) {
    const box = $('#nameEntry'); nameEntry.on = false; box.hidden = true;
    neTitle(false); nameEntry.rec = nameEntry.ghost = false;
    if (player2 || def.daily || !getRecords(def).some((r) => r.date === entry.date)) return; // only when the time made the top five
    neOpen(); nameEntry.rec = true; nameEntry.def = def; nameEntry.date = entry.date; nameEntry.key = boardKey('rec', def);
  }
  function neOpen() {
    const box = $('#nameEntry'), saved = savedInitials(); if (saved.length === 3) nameEntry.letters = saved.split('');
    nameEntry.on = true; nameEntry.cur = 0; box.hidden = false; neRender();
    box.querySelector('small').textContent = isTouch || isMobile ? '▲▼ Buchstabe · OK' : '▲▼ Buchstabe · ◀▶ Stelle · ENTER fäädisch';
  }
  function neTitle(ghostToo) { $('#nameEntry b').innerHTML = ghostToo ? (nameEntry.rec ? 'DING NAME FÖR DE TAFEL UN DER GEIST<i class="gl">dein Name für Tafel und Geist</i>' : 'GEIST SPEICHERN FÖR …<i class="gl">Geist speichern für …</i>') : 'DING NAME FÖR DE TAFEL<i class="gl">dein Name für die Tafel</i>'; }
  // GEIST SPEICHERN FÖR …: the same three letters; with a top-five time open, one OK names both
  function ghostSaveAsk() { if (!raceGhost || phase !== 'finished') return; if (!nameEntry.on) neOpen(); nameEntry.ghost = true; neTitle(true); $('#ghostSaveBtn').hidden = true; } // the button comes back with JESPEICHERT
  function neStep(i, d) { const k = NE_ABC.indexOf(nameEntry.letters[i]); nameEntry.letters[i] = NE_ABC[(Math.max(0, k) + d + NE_ABC.length) % NE_ABC.length]; nameEntry.cur = i; neRender(); }
  function neDone() {
    if (!nameEntry.on) return; nameEntry.on = false; const name = nameEntry.letters.join('').replace(/\s+$/, '') || 'DU';
    try { localStorage.setItem('stuntskoelle.initials', nameEntry.letters.join('')); } catch (e) { /* ignore */ }
    if (nameEntry.rec) { let list = []; try { list = JSON.parse(localStorage.getItem(nameEntry.key) || '[]'); } catch (e) { /* ignore */ } const r = list.find((x) => x.date === nameEntry.date); if (r) { r.name = name; try { localStorage.setItem(nameEntry.key, JSON.stringify(list)); } catch (e) { /* ignore */ } } }
    if (nameEntry.ghost) { $('#ghostSaveBtn').hidden = false; saveNamedGhost(name); }
    nameEntry.rec = nameEntry.ghost = false; $('#nameEntry').hidden = true;
  }
  document.querySelectorAll('#nameEntry .neCol button').forEach((b) => b.addEventListener('click', () => neStep(+b.dataset.i, +b.dataset.d)));
  document.querySelectorAll('#nameEntry .neCol span').forEach((el) => el.addEventListener('click', () => neStep(+el.dataset.i, 1)));
  $('#neOk').addEventListener('click', neDone);
  // 'Woröm?': two or three plain sentences on the results – why this place, where it went wrong, one tip
  function streetAt(sPos) { const seg = (track.samples[Math.floor(((sPos % track.length) + track.length) % track.length / track.ds) % track.samples.length] || {}).seg; let name = null; for (const [sg, nm] of (trackDef.signs || [])) if (sg <= seg) name = nm; return name; }
  function whyLines(place, won) {
    const out = [], g = careerChapter != null && tuenn.career[careerChapter] && tuenn.career[careerChapter].goal;
    if (g && g.place && place > g.place) out.push(`Du wors ${place}. – för et Kapitel bruchs de Platz ${g.place} oder besser.`);
    if (crashes >= 3) { const cnt = {}; for (const s0 of crashAt) { const nm = streetAt(s0); if (nm) cnt[nm] = (cnt[nm] || 0) + 1; } const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
      out.push(`Du bes ${crashes}× vun der Stroß avjekumme${top && top[1] >= 2 ? ', meist op der ' + top[0].replace(/STRASSE$/, 'STROSS') : ''}.`); out.push('Tipp: Vür der Kurv der Fooß vum Jas' + (isMobile ? '.' : ' – un R brängk dich zeröck op de Stroß.')); }
    else if (!won && place > 3) out.push('Tipp: SHIFT jitt Turbo – un dä lädt sich em Drift widder op.');
    return out;
  }
  function finishRace() {
    phase = 'finished';
    // project finishing times for cars still out on the track
    for (const r of racers) if (!r.finished) { const remaining = (raceLaps + 1) * track.length - (r.lap * track.length + r.s); r.finishTime = raceTime + remaining / Math.max(25, Math.abs(r.v) + 20); r.projected = true; }
    const order = racers.slice().sort((a, b) => a.finishTime - b.finishTime);
    const place = order.indexOf(player) + 1;
    const won = place === 1, tt = raceMode === 1, tour = raceMode === 2;
    const best = tour ? null : getBest(); const record = !tour && (best == null || player.finishTime < best);
    if (record) setBest(player.finishTime);
    raceGhost = null; if (!tour) saveGhost(); // the Stadtrundfahrt is no lap to chase
    const entry = { name: savedInitials() || PLAYABLE[sel.driver].name + ' (DU)', car: D.CARS[sel.car].name, time: player.finishTime, date: Date.now(), side: !!player.usedSide }; // side: MIT/OHNE NEBENSTROSSE
    if (!tour) { addRecord(trackDef, entry); offerNameEntry(trackDef, entry); } else { nameEntry.on = false; $('#nameEntry').hidden = true; }
    if (theme.confetti && won) tusch(); else fanfare(won); shotWanted = true;
    if (auftrag) endAuftrag();
    if (kripo) endKripo('finish');
    if (wette && !wette.done) { wette.done = true; wette.won = order.indexOf(wette.rival.r) > order.indexOf(player); if (wette.won) addDeckel(wette.n * 2); else deckel = Math.max(0, deckel - wette.n); }
    const total = deckelTotal(deckel); const rank = deckelRank(total);
    try { const hs = parseInt(localStorage.getItem('stuntskoelle.hiscore') || '0') || 0; if (deckel > hs) localStorage.setItem('stuntskoelle.hiscore', String(deckel)); } catch (e) { /* ignore */ }
    const sights = tour ? tourSights() : [];
    const headline = tour ? `DÄ SCHNELLE: STADTRUNDFAHRT MET DÄM LANGE – ${sights.length} SEHENSWÜRDIGKEITE, NULL KNÖLLCHE` : expressHeadline(place, won, record, order); lastHeadline = headline; lastPlace = place;
    if (won && theme.confetti && !raceMode) bumpStat('sessionWins'); { const anna = racers.find((r) => r.isAI && r.driver && r.driver.id === 'anna'); if (anna && order.indexOf(player) < order.indexOf(anna)) bumpStat('annaBeaten'); }
    if (knoellchen) bumpStat('knoellchen', knoellchen); else if (!player2 && !raceMode) bumpStat('cleanRaces'); /* without Blitzer a clean race proves nothing */ if (koelsch) bumpStat('koelsch', koelsch); if (record) bumpStat('records'); if (won && theme.night && !raceMode) bumpStat('nightWins'); if (trackDef.daily) bumpStat('daily'); newOrden = checkOrden();
    if (cup.on) { order.forEach((r, i) => { cup.pts[r.name] = (cup.pts[r.name] || 0) + (CUP_PTS[i] || 0); }); cup.i++; try { localStorage.setItem('stuntskoelle.cup', JSON.stringify(cup)); } catch (e) { /* ignore */ } }
    setTimeout(() => {
      if (phase === 'menu') return; // the attract mode went back to the menu meanwhile
      $('#results').classList.toggle('tt', tt); $('#results').classList.toggle('tour', tour);
      { const w = player2 || tour ? [] : whyLines(place, won); $('#resWhy').hidden = !w.length; $('#resWhy').innerHTML = w.map((x) => `<span>${x}</span>`).join(''); }
      $('#resTitle').textContent = player2 ? (order.indexOf(player) < order.indexOf(player2) ? `P1 SCHLÄGT P2! PLATZ ${place} GEGEN ${order.indexOf(player2) + 1}.` : `P2 SCHLÄGT P1! PLATZ ${order.indexOf(player2) + 1} GEGEN ${place}.`) : won ? (theme.heist ? 'JEWONNE! ICH HANN NIX JESINN.' : theme.era ? 'JEWONNE! DÄ RING JEHÖRT DIR.' : 'JEWONNE! KÖLLE ALAAF!') : place === 2 ? 'ZWEITER. FAST, JUNG.' : `PLATZ ${place}. ET KÜTT WIE ET KÜTT.`;
      if (!player2 && tt) $('#resTitle').textContent = `ZEITFAHREN: ${fmtTime(player.finishTime)}` + (record ? ' – NEUE BESTZEIT!' : best != null ? ` – ${(player.finishTime - best).toFixed(2)} S HINGER DER BESTZEIT` : '');
      if (!player2 && tour) $('#resTitle').textContent = 'STADTRUNDFAHRT – JRÖÖSS US KÖLLE!';
      { const pc = $('#resPostcard'); pc.hidden = !tour; if (tour) pc.innerHTML = `<b>JRÖÖSS US KÖLLE!</b><small>${trackDef.name.toUpperCase()} · ${raceLaps} ${raceLaps > 1 ? 'RUNDEN' : 'RUNDE'} · DÄ LANGE HÄT DIR JEZEICH:</small><ol>${sights.map((x) => `<li>${x}</li>`).join('')}</ol><i>${sights.length ? '' : 'Nix jesinn? Dann nohmol, un langsam.'}</i>`; }
      const tb = $('#resTable'); tb.innerHTML = '';
      if (tt && !player2) { // ZEITFAHREN: the track's own board, MIT or OHNE NEBENSTROSSE
        const list = getRecords(trackDef), mine = list.findIndex((r) => r.date === entry.date);
        list.forEach((r, i) => { const tr = document.createElement('tr'); if (i === mine) tr.className = 'me'; tr.innerHTML = `<td>${i + 1}.</td><td>${r.name}</td><td>${r.car} · ${r.side ? 'MIT' : 'OHNE'} NEBENSTROSSE</td><td>${fmtTime(r.time)}</td>`; tb.appendChild(tr); });
        if (mine < 0) { const tr = document.createElement('tr'); tr.className = 'me'; tr.innerHTML = `<td>–</td><td>DU</td><td>${entry.car} · ${entry.side ? 'MIT' : 'OHNE'} NEBENSTROSSE</td><td>${fmtTime(entry.time)}</td>`; tb.appendChild(tr); }
      } else order.forEach((r, i) => { const tr = document.createElement('tr'); if (r === player || r === player2) tr.className = 'me'; tr.innerHTML = `<td>${i + 1}.</td><td>${r.name}</td><td>${r.car.name}</td><td>${fmtTime(r.finishTime)}${r.projected ? '*' : ''}</td>`; tb.appendChild(tr); });
      $('#resBest').textContent = fmtTime(player.bestLap);
      if (raceMode) $('#resStats').innerHTML = `${MODES[raceMode]} · ${raceLaps} ${raceLaps > 1 ? 'RUNDEN' : 'RUNDE'} · RUNDE: <b>${player.laps.map(fmtTime).join(' · ')}</b> · ${player.usedSide ? 'MET NEBENSTROSSE' : 'OHNE NEBENSTROSSE'} · SCHADEN: <b>${Math.round(player.damage * 100)} %</b>`;
      else $('#resStats').innerHTML = (auftragDone || auftragFail ? `KLÜNGEL-AUFTRÄGE: <b>${auftragDone}</b> erledigt${auftragFail ? `, <b>${auftragFail}</b> vermasselt` : ''} · ` : '') + `KNÖLLCHEN: <b>${knoellchen}</b> (${knoellchen * 40} DM, Klüngel Tom regelt dat) · ${kids ? 'KAMELLE' : 'KÖLSCH'} UNTERWEGS: <b>${koelsch}</b> · KLÜNGEL-TELEFON: <b>${telefon.used}×</b> (schuldest ihm ${telefon.used} ${kids ? 'Kamelle' : 'Kölsch'}) · SCHADEN: <b>${Math.round(player.damage * 100)} %</b> · ${knoellchen > 2 ? 'Führerschein: op Deckel.' : knoellchen ? 'Führerschein: noch da.' : 'Kein Blitzer erwischt. Verdächtig.'}`;
      $('#resRecord').hidden = !record;
      $('#resExpress').textContent = headline.replace(/^DÄ SCHNELLE:\s*/, ''); drawFrontPage(headline, place, order);
      $('#resDeckel').innerHTML = `BIERDECKEL: <b>${strokes(deckel)}</b> (${deckel} Striche) · GESAMT: <b>${total}</b> – <b>${rank}</b>` + (wette ? ` · WETTE: <b>${wette.won ? 'JEWONNE' : 'VERLORE'}</b> (${wette.n} Kölsch ${wette.won ? 'für dich' : 'für dä Lange'})` : '') + (kripoSeen ? ` · KRIPO: <b>${kripoCaught ? 'HÄT DICH JEKRIEGT' : 'ABJEHÄNGT'}</b>` : '');
      if (wette) { const wl = pick(wette.won ? tuenn.wette.won : tuenn.wette.lost).replace('{r}', wette.rival.name).replace('{n}', String(wette.n)); $('#resTuenn').textContent = wl; }
      renderCup(order);
      { const ob = $('#resOrden'); ob.hidden = !newOrden.length; if (newOrden.length) { ob.innerHTML = ordenItems(newOrden); ob.querySelectorAll('canvas').forEach((c, i) => medalIcon(c, newOrden[i].color, 2)); } }
      if (!wette && raceMode) $('#resTuenn').textContent = tour ? pick(tuenn.modes.tourEnd) : record ? pick(tuenn.modes.ttRecord) : pick(tuenn.modes.ttSlow);
      else if (!wette) $('#resTuenn').textContent = newOrden.length ? pick(tuenn.ordenLine).replace('{name}', newOrden[0].name) : record ? pick(tuenn.record) : won ? pick(tuenn.win) : pick(tuenn.lose);
      if (careerChapter != null) { const g = tuenn.career[careerChapter].goal; applyCareerResult(g.place ? place <= g.place : g.win ? won : g.stunts ? raceStunts >= g.stunts : g.koelsch ? koelsch >= g.koelsch : g.auftrag ? auftragDone >= g.auftrag : true, place); }
      const rv = order.find((r) => r.isAI && (!won || r !== order[0])), rd = rv && rv.driver; // a lone run has no rival to speak
      $('#resRival').textContent = rd ? `${rd.name}: „${pick(won ? rd.lines.lose : rd.lines.win)}“` : '';
      { const gb = $('#ghostSaveBtn'); gb.hidden = !raceGhost || !!player2 || !!trackDef.daily; gb.disabled = false; gb.textContent = '👻 GEIST SPEICHERN FÖR …'; }
      resLayout(); $('#results').hidden = false; document.body.classList.add('resultsOpen');
    }, 1200);
  }
  // results on a phone or a 720p laptop: the title, your row and the buttons fit without scrolling. The table shows the
  // top three and you (▸ ALLE opens the rest), the stats and the Deckel fold into one line above the buttons.
  function resLayout() {
    const compact = isMobile || window.innerHeight < 800, tb = $('#resTable'); $('#results').classList.toggle('compact', compact); $('#results').scrollTop = 0;
    tb.classList.remove('all'); const old = tb.querySelector('tr.allRow'); if (old) old.remove();
    const rows = [...tb.children]; let rest = 0; rows.forEach((tr, i) => { const hide = compact && i >= 3 && !tr.classList.contains('me'); tr.classList.toggle('rest', hide); if (hide) rest++; });
    if (rest) { const tr = document.createElement('tr'); tr.className = 'allRow'; tr.innerHTML = `<td colspan="4"><button type="button">▶ ALLE ${rows.length}</button></td>`; const b = tr.querySelector('button'); b.onclick = () => { const on = tb.classList.toggle('all'); b.textContent = on ? '▲ NUR DE SPETZ' : `▶ ALLE ${rows.length}`; }; tb.appendChild(tr); }
    $('#resFacts').classList.toggle('open', !compact);
  }
  // ---------------- pause: P, Esc or ☰ while racing (also in the flyover and the countdown); the world and the sound stand still until LOSS JONN ----------------
  let paused = false;
  const racing = () => phase === 'race' || phase === 'countdown' || phase === 'intro';
  // G or GEIST in the pause: the ghost on and off; its splits stay
  function toggleGhost() { ghostHidden = !ghostHidden; if (ghost && ghostHidden) ghost.visible = false; ghostPauseLabel(); }
  function ghostPauseLabel() { const b = $('#pauseGhost'); b.hidden = !ghost; keyLabel('#pauseGhost', ghostHidden ? 'GEIST: AUS' : 'GEIST: AN', 'G'); }
  function setPause(on) {
    const was = paused; paused = !!on && racing(); $('#pause').hidden = !paused; document.body.classList.toggle('paused', paused);
    if (paused !== was) pauseAudio(paused);
    if (paused) { ghostPauseLabel(); if ('speechSynthesis' in window) speechSynthesis.cancel(); fingers.clear(); mouseKey = null; touchSync(); const pl = pick(tuenn.pause || ['Dä Lange drink e Kölsch. Mer waade.']), t = lineT(pl), h = (pl && pl.hd) || ''; $('#pauseLine').textContent = kids ? kidsText(t) : t; $('#pauseHd').textContent = kids ? kidsText(h) : h; $('#pauseHd').hidden = !(hdOn && h); $('#pauseKeysHd').hidden = !hdOn || isMobile; }
  }
  // a phone call or the pause: engine, chiptune and song fall silent and the audio clock stops; LOSS JONN (a tap or a key, as iOS wants) brings them back
  function pauseAudio(on) {
    if (music.el) { if (on) { music.held = !music.el.paused; music.el.pause(); } else if (music.held) { music.held = false; if (music.wanted && !music.muted) musicPlay(); } }
    if (!audio.ctx) return; const t = audio.ctx.currentTime;
    if (on) {
      audio.gain.gain.cancelScheduledValues(t); audio.gain.gain.setValueAtTime(audio.gain.gain.value, t); audio.gain.gain.linearRampToValueAtTime(0, t + 0.04);
      if (music.chip) { music.chip.g.gain.cancelScheduledValues(t); music.chip.g.gain.setValueAtTime(music.chip.g.gain.value, t); music.chip.g.gain.linearRampToValueAtTime(0, t + 0.04); }
      setTimeout(() => { if (paused && audio.ctx.state === 'running') audio.ctx.suspend().catch(() => {}); }, 80);
    } else {
      if (music.chip) { music.chip.g.gain.cancelScheduledValues(t); music.chip.g.gain.setValueAtTime(0.05, t); }
      if (audio.ctx.state !== 'running' && audio.ctx.state !== 'closed') audio.ctx.resume().catch(() => {}); // iOS reports 'interrupted' after a phone call
    }
  }
  // NEU STARTE in the pause and Backspace: the same race again, straight to the countdown like NOCHMAL
  function quickRestart() {
    if (!racing() || demo || phase === 'loading') return;
    setPause(false); quickAgain = true; $('#controlsCard').hidden = true; $('#countdown').hidden = true; $('#hudPrompt').hidden = true;
    if (careerChapter != null) startCareer(); else if (missionMode) startMission(missionDef); else startRace(trackDef);
  }
  function toMenu() {
    if (phase === 'loading') return; $('#loading').hidden = true; $('#controlsCard').hidden = true; setPause(false);
    if (window.Club) window.Club.close(); clearMission(); missionMode = false; careerChapter = null; $('#hudPrompt').hidden = true;
    phase = 'menu'; if (demo) { camMode = demoPrevCam; tvCam = null; } demo = false; idleT = 0; $('#demo').hidden = true; document.body.classList.remove('demo');
    $('#menu').hidden = false; $('#hud').hidden = true; $('#results').hidden = true; $('#editor').hidden = true; $('#touch').hidden = true; $('#records').hidden = true; $('#replayUI').hidden = true;
    replay.on = false; if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (isMobile && twoPlayer) toggleTwoPlayer();
    document.body.classList.remove('racing', 'resultsOpen', 'replaying');
    $('#msg').classList.remove('show');
    audioEngine(0, 0); bassRun = false; document.body.classList.remove('bassrun'); if (juke.on && juke.started && !music.muted) { musicPlay(); updateJuke(); } else musicStop();
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
    if (perf.stage === 1) { renderer.setPixelRatio(1); if (renderer.shadowMap.enabled) { renderer.shadowMap.enabled = false; if (sunLight) sunLight.castShadow = false; scene.traverse((o) => { if (o.isMesh && o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { m.needsUpdate = true; }); } }); } say({ name: 'Heinzel', emoji: '🔧' }, (isMobile ? 'Dat Handy schwitzt.' : 'Dä Rechner schwitzt.') + ' Ich hann de Schatte avjeschruuv. Läuf.', 2600); }
    else if (pixelScale === 1) { pixelScale = 2; applyPixelMode(); post.setScale(2); say({ name: 'Heinzel', emoji: '🔧' }, 'Un jetz Pixel. Wie 1990. Dofür flüssig.', 2600); }
  }
  // Fixed-timestep race: the simulation always advances in steps of 1/120 s, as many as the real time asks for (at
  // most 8 per frame, so below 15 fps the game slows down instead of tunnelling), and the cars are drawn between their
  // last two steps. Jump arcs and lap times are the same on a 30 Hz phone and a 144 Hz screen; raceTime counts the
  // steps. STUNTS_SIMSTEPS (headless tests) runs that many 1/60 s per frame instead, independent of the wall clock.
  const SIM_DT = 1 / 120, SIM_MAX = 8; let simAcc = 0, raceTicks = 0;
  const fixedPhase = () => phase === 'intro' || phase === 'countdown' || phase === 'race' || phase === 'finished';
  const ipBodies = () => kripo ? racers.concat([kripo]) : racers;
  function ipBefore() { for (const r of ipBodies()) { if (!r.mesh) continue; if (!r.ip) r.ip = { a: r.mesh.position.clone(), b: r.mesh.position.clone(), fa: new THREE.Vector3(), fb: r.frame ? r.frame.pos.clone() : new THREE.Vector3() }; r.ip.a.copy(r.ip.b); r.ip.fa.copy(r.ip.fb); } }
  function ipAfter() { for (const r of ipBodies()) if (r.ip) { r.ip.b.copy(r.mesh.position); if (r.frame) r.ip.fb.copy(r.frame.pos); } }
  function ipDraw(alpha) { // between the last two steps; a respawn or a teleport is not smeared across the map
    for (const r of ipBodies()) {
      if (!r.ip || !r.frame || r.ip.a.distanceToSquared(r.ip.b) > 64) continue;
      r.mesh.position.lerpVectors(r.ip.a, r.ip.b, alpha);
      r.drawFrame = Object.assign({}, r.frame, { pos: new THREE.Vector3().lerpVectors(r.ip.fa, r.ip.fb, alpha) });
    }
  }
  function msgStep(dt) { msgAge += dt; if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) $('#msg').classList.remove('show', 'open'); } }
  function frame(t) {
    requestAnimationFrame(frame);
    const dtReal = Math.min(0.5, (t - lastT) / 1000 || 0.016); adaptQuality(dtReal); lastDtReal = dtReal;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
    renderer.info.reset();
    if (phase === 'menu' || phase === 'editor') { simAcc = 0; tick(dt); if (phase === 'menu') menuFx(t); return; }
    if (!scene || phase === 'club') return;
    const fixed = fixedPhase(), stepping = !window.STUNTS_MANUAL_STEP && !paused;
    if (stepping && !fixed) { simAcc = 0; tick(dt); }
    else if (stepping) {
      let n;
      if (window.STUNTS_SIMSTEPS) { n = window.STUNTS_SIMSTEPS * 2; simAcc = 0; }
      else {
        simAcc += Math.min(0.25, dtReal); n = Math.floor(simAcc / SIM_DT + 1e-6);
        if (n > SIM_MAX) { if (phase === 'countdown') countdown -= (n - SIM_MAX) * SIM_DT; n = SIM_MAX; simAcc = Math.min(simAcc, (SIM_MAX + 1) * SIM_DT); } // below 15 fps the excess is dropped; a slow phone still does not stretch the countdown
        simAcc = Math.max(0, simAcc - n * SIM_DT);
      }
      for (let k = 0; k < n && fixedPhase(); k++) { ipBefore(); msgStep(SIM_DT); tick(SIM_DT, k === n - 1); ipAfter(); }
      const alpha = window.STUNTS_SIMSTEPS ? 1 : simAcc / SIM_DT;
      if (fixedPhase()) { ipDraw(alpha); if (ghost && (phase === 'race' || phase === 'finished')) updateGhost((alpha - 1) * SIM_DT); }
    }
    if (!(fixed && stepping)) msgStep(dt); // in a race the box runs on race time (the steps), also when a harness speeds it up
    if (window.STUNTS_NORENDER) return; // headless timing checks: the simulation only
    if (scenery && !paused) W.animate(t, dt, camPos, phase === 'race' || phase === 'countdown' || phase === 'finished' ? racers.map((r) => r.mesh.position).concat(kripo ? [kripo.mesh.position] : []) : null);
    if (confetti && player && player.frame) confetti.userData.update(dt, player.frame.pos);
    if (!paused && (phase === 'race' || phase === 'finished')) vergeDirt(dt);
    updateCamera(dt); placeLandmarkTag();
    const cams = (player2 && camera2 && phase !== 'menu' && phase !== 'editor') ? [camera, camera2] : camera;
    if (pixelScale === 1) renderDirect(cams); else post.render(scene, cams);
    // the paper's photo: the player's longest flight of the race (a jump or a loop), else the finish
    if (phase === 'race' && player && !player2) { if (player.air) { airNow += dt; if (airNow > Math.max(0.7, airBest + 0.25) && raceTime - airShotT > 1.5) { airBest = airNow; airShotT = raceTime; try { airShot = renderer.domElement.toDataURL('image/jpeg', 0.82); } catch (e) { /* ignore */ } } } else airNow = 0; }
    if (shotWanted) { shotWanted = false; try { lastShot = airShot || renderer.domElement.toDataURL('image/jpeg', 0.82); } catch (e) { lastShot = null; } }
  }

  // one simulation step (physics, AI, commentary); in the race always SIM_DT long. draw: the last step before a
  // render, which also refreshes the HUD, the minimap and the engine sound
  function tick(dt, draw) {
    if (draw === undefined) draw = true;
    if (phase === 'intro' || phase === 'countdown' || phase === 'race') chatStep(dt);
    if (phase === 'intro') {
      introT += dt; for (const r of racers) placeRacer(r, dt); if (draw) updateHUD();
      if (introT > 3.8) { phase = 'countdown'; $('#introCard').hidden = true; showControlsCard(); }
    } else if (phase === 'countdown') {
      countdown -= dt; // fixed steps follow the real time (see frame), so a slow phone does not stretch the countdown
      const idx = 3 - Math.ceil(countdown - 0.2); const cd = $('#countdown');
      if (countdown <= 0.2) { cd.textContent = tuenn.countdown[3]; if (cdShown !== 3) { beep(880, 0.5, 'square', 0.2); cdShown = 3; } }
      else if (idx >= 0 && idx < 3) { cd.textContent = tuenn.countdown[idx]; if (cdShown !== idx) { beep(440, 0.15); cdShown = idx; } }
      cd.hidden = false;
      if (countdown <= 0) { phase = 'race'; $('#controlsCard').hidden = true; if (introLinePending) { introLinePending = false; setTimeout(() => { if (phase === 'race') sayMust(tuenn, pickNew(theme.intro), 4200, { small: true }); }, 1500); } setTimeout(() => { cd.hidden = true; }, 700); if (theme.heist && !raceMode) setTimeout(() => { if (phase === 'race' && !kripo) { knoellchen = 3; startKripo(); sayMust(tuenn, pickNew(tuenn.heist), 3800); } }, 5000); }
      for (const r of racers) placeRacer(r, dt);
      if (draw) updateHUD();
    } else if (phase === 'race' || phase === 'finished') {
      if (phase === 'race') raceTime = ++raceTicks * SIM_DT; // counts fixed steps, never sums frame times
      if (tilt.mode > 0 && tilt.listening) readKeys();
      if (nitroTap > 0) nitroTap -= dt;
      if (oneThumb()) readKeys(); // EIN-DAUMEN: the gas is on from the green light, the nitro tap runs out
      const ctl = player.finished ? { gas: 0, brake: 0.5, steer: 0, turbo: 0 } : (window.STUNTS_AUTOPILOT || demo) ? aiControl(player, dt) : input;
      if (mission && mission.onFoot) { player.v = 0; walkStep(dt); } else updateRacer(player, dt, ctl);
      if (player2) updateRacer(player2, dt, player2.finished ? { gas: 0, brake: 0.5, steer: 0, turbo: 0 } : window.STUNTS_AUTOPILOT ? aiControl(player2, dt) : input2);
      if (phase === 'race') recordFrame(dt);
      for (const r of racers) if (r.isAI) updateRacer(r, dt, r.finished ? { gas: 0, brake: 0.3, steer: 0, turbo: 0 } : aiControl(r, dt));
      for (let i = 0; i < racers.length; i++) for (let j = i + 1; j < racers.length; j++) collide(racers[i], racers[j], dt);
      for (const r of racers) placeRacer(r, dt);
      if (phase === 'race') { updatePickups(dt); updateKripo(dt); if (mission) updateMission(dt); else if (!raceMode) updateAuftrag(dt); } // ZEITFAHREN and STADTRUNDFAHRT: no Klüngel-Auftrag
      if (demo) { demoT += dt; if (demoT > 75 || phase === 'finished') { toMenu(); return; } }
      if (lmTag) lmTag.t -= dt; // the name tag's 4 s also run out after the finish line
      if (phase === 'race') {
        radioTimer -= dt; eventTimer -= dt; storyCool -= dt; quiet -= dt; noteTick();
        if (theme.heist && !raceMode && !kripo && raceTime > 8 && raceTime - kripoEndT > 25 && !player.finished) { knoellchen = 3; startKripo(); sayMust(tuenn, pickNew(tuenn.heist), 3200); } // on the heist the Kripo never gives up for long
        if (radioTimer <= 0 && msgTimer <= 0 && raceMode !== 2) { radioTimer = 60 + Math.random() * 35; const roll = Math.random(); const radio = eraLines(tuenn.radio || []);
          if (theme.confetti && tuenn.jeck && roll < 0.5) say(tuenn, pickNew(tuenn.jeck), 3400);
          else if (roll < 0.38) say({ name: 'DÄ SCHNELLE', emoji: '📰' }, pickNew(eraLines(tuenn.express)).replace('DÄ SCHNELLE: ', ''), 3500);
          else if (roll < 0.72 && radio.length) say({ name: 'Radio Kölle', emoji: '📻' }, pickNew(radio).replace('RADIO KÖLLE: ', ''), 3800);
          else say({ name: 'Kölsches Grundgesetz', emoji: '📜' }, pickNew(tuenn.grundgesetz), 3500); }
        // Dä Lange's place stories: one is told whenever the box is free and the place is just ahead or just
        // passed (also from a side street running beside it). A story missed now comes back next lap.
        // The Verzällcher journal gets the full story of every place you pass, also when the box was busy, on a phone
        // (where the story is only a one-line tag) or in WENIJ (the 10 s gap); dä Lange tells as many as fit, a missed one next lap
        if (!demo) for (const st of stories) if (!st.logged && Math.abs(storyDs(st)) < 70) { st.logged = true; if (!(kids && DRINK.test(st.text))) rememberStory(st.text); if (st.wz) discoverWz(st.wz); } // the attract mode only logs what it tells; Pänz get no drinking stories
        if (raceMode === 2) tourStory();
        else if (storyCool <= 0 && (msgTimer <= 0 || msgPrio === 0 && msgAge > 1.2) && !player.air && calmRoad()) for (const st of stories) { if (st.told) continue; const ds = -storyDs(st); if (ds > -40 && ds < 70) { const ms = isMobile && chat > 0 ? 5000 : 6500; if (say(VERZ, st.text, ms, false, { story: true, hd: st.hd, tag: st.tag })) { st.told = true; storyCool = chat === 0 ? 9 : ms / 1000 + 1; radioTimer = Math.max(radioTimer, 20); rememberStory(st.text); showLandmarkTag(st); } break; } }
        if (telefon.active > 0) telefon.active -= dt; if (hornCool > 0) hornCool -= dt;
        if (raceMode) { /* ZEITFAHREN and STADTRUNDFAHRT: no Razzia, no random events */ }
        else if (razzia > 0) { razzia -= dt; razziaBlink += dt; if (razziaBlink > 0.45) { razziaBlink = 0; beep(Math.floor(razzia * 2) % 2 ? 700 : 940, 0.2, 'square', 0.05); const fl = $('#flash'); fl.style.background = '#2060ff'; fl.style.opacity = '0.35'; setTimeout(() => { fl.style.opacity = '0'; }, 120); } if (razzia <= 0) { $('#flash').style.background = ''; sayMust(tuenn, pickNew(tuenn.razziaEnd), 2500); } }
        else if (eventTimer <= 0 && msgTimer <= 0 && Math.random() < 0.22 && raceTime > 20 && !kripo) { eventTimer = 30 + Math.random() * 20; razzia = 8; razziaBlink = 0; sayMust(tuenn, pickNew(tuenn.razzia), 3500); }
        if (eventTimer <= 0 && msgTimer <= 0 && !raceMode) { eventTimer = 26 + Math.random() * 18; const ev = pickNew(tuenn.events); say(tuenn, ev, 3000); if (ev.includes('Kölsch')) { koelsch++; player.turbo = Math.min(1, player.turbo + 0.35); } }
        for (const b of blitzers) {
          b.cool -= dt; if (b.flash) b.flash.material.opacity = Math.max(0, b.flash.material.opacity - dt * 3);
          let ds = player.s - b.s; if (ds > track.length / 2) ds -= track.length;
          if (!routeFor(player) && ds > 0 && ds < 4 && b.cool <= 0) { b.cool = 8; if (Math.abs(player.v) * 3.6 > 120 && !player.air) { knoellchen++; if (knoellchen >= 3 && !kripo && !kripoSeen) startKripo(); if (b.flash) b.flash.material.opacity = 1; flashTimer = 0.25; beep(1400, 0.12, 'square', 0.12); say({ name: 'Blitzer Kölle', emoji: '📸' }, pickNew(eraLines(tuenn.blitzer)), 2600); } }
        }
        // Ampeln: over the stop line at red = Rotlichtblitzer (counts like a Knöllchen), at yellow a word from dä Lange
        for (const sg of signals) {
          sg.cool -= dt; let ds = player.s - sg.s; if (ds > track.length / 2) ds -= track.length;
          if (!routeFor(player) && ds > 0 && ds < 4 && sg.cool <= 0 && !player.air && player.crashed <= 0) {
            sg.cool = 6; const st = W.signalState(sg);
            if (st === 'red' || st === 'redyellow') { knoellchen++; if (knoellchen >= 3 && !kripo && !kripoSeen) startKripo(); flashTimer = 0.25; beep(1400, 0.12, 'square', 0.1); say({ name: 'Rotlichtblitzer', emoji: '🚦' }, pickNew(tuenn.rotlicht || tuenn.blitzer), 2600); }
            else if (st === 'yellow') say(tuenn, pickNew(tuenn.gelb || ['Dat wor noch jelb.']), 1800);
          }
        }
        if (flashTimer > 0) { flashTimer -= dt; $('#flash').style.opacity = String(Math.max(0, flashTimer * 3)); }
      }
      if (player2 && phase === 'race') { const first = [player, player2].filter((r) => r.finished); if (first.length === 1) { if (!first[0].waitT) first[0].waitT = raceTime; else if (raceTime - first[0].waitT > 20) { const o = first[0] === player ? player2 : player; o.finished = true; o.finishTime = raceTime + 5; o.projected = true; } } }
      if (player.finished && raceMode === 2 && phase === 'race') tourStory(); // the last stories of the tour are told at the line
      if (player.finished && (!player2 || player2.finished) && phase === 'race' && !(raceMode === 2 && tourPending() && raceTime - player.finishTime < 60)) finishRace();
      if (draw) { if (phase === 'race') updateHUD(); drawMinimap(); audioEngine(Math.abs(player.v), ctl.gas, player.turboOn); }
    } else if (phase === 'replay') {
      replayStep(dt);
    } else if (phase === 'menu' || phase === 'editor' || phase === 'club') {
      if (phase === 'menu' && !document.hidden && $('#records').hidden && $('#careerMap').hidden && !onboard.open) { idleT += dt; if (idleT > (window.STUNTS_IDLE || 50)) startDemo(); }
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
  // button labels: the key in brackets only where there is a keyboard (a phone shows NOCHMAL, not NOCHMAL (ENTER))
  function keyLabel(sel, txt, key) { const el = $(sel); if (!el) return; (el.querySelector('span') || el).textContent = isTouch || isMobile ? txt : `${txt} (${key})`; }
  const againLabel = (txt) => keyLabel('#againBtn', txt, 'ENTER');
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
    if (oneThumb()) { input.steer += strip.steer; if (!touch.brake) input.gas = 1; if (nitroTap > 0) input.turbo = 1; } // EIN-DAUMEN: always gas unless ■ is held
    if (tilt.mode > 0 && !touch.left && !touch.right && input.steer === 0) input.steer = tiltSteer();
    input.steer = clamp(input.steer, -1, 1);
  }
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    idleT = 0; if (demo) { e.preventDefault(); toMenu(); return; }
    keys[e.code] = true; readKeys();
    if (!$('#careerMap').hidden && phase === 'menu') { // the career map: Esc closes, the arrows walk the tiles, Enter on a tile plays it
      if (e.code === 'Escape') { e.preventDefault(); closeCareerMap(); $('#careerBtn').focus(); return; }
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.code]; const tiles = [...document.querySelectorAll('#cmTiles .cmTile')];
      if (d) { e.preventDefault(); const i = tiles.indexOf(document.activeElement); tiles[clamp(i < 0 ? 0 : i + d, 0, tiles.length - 1)].focus(); }
      return;
    }
    if (onboard.open) { // the door cards: → / Enter on, ← back, Esc closes; a focused button keeps its own Enter and Space
      if ((e.code === 'Enter' || e.code === 'Space') && e.target.closest && e.target.closest('#onboard button')) return;
      const k = { Escape: 0, ArrowRight: 1, Enter: 1, Space: 1, ArrowLeft: -1 }[e.code]; if (k === undefined) return; // Tab and the browser's own keys stay as they are
      e.preventDefault(); if (k === 0) closeOnboard(); else obStep(k); return;
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) && phase !== 'menu' && phase !== 'editor') e.preventDefault();
    if (phase === 'club') { if (window.Club) window.Club.key(e.code); return; }
    if (phase === 'menu') {
      if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      // Native buttons keep Enter so keyboard users can activate every existing control.
      if (e.code === 'Enter' && e.target.closest && e.target.closest('button, a')) return;
      if (e.code === 'Enter') e.preventDefault();
      if (e.code === 'Enter') startRace();
      if (e.code === 'KeyP' || e.code === 'KeyF') cyclePixel();
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
    if (phase === 'finished' && nameEntry.on) { // typing the three letters for the record table
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') neStep(nameEntry.cur, e.code === 'ArrowUp' ? 1 : -1);
      else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { nameEntry.cur = (nameEntry.cur + (e.code === 'ArrowRight' ? 1 : 2)) % 3; neRender(); }
      else if (/^Key[A-Z]$/.test(e.code)) { nameEntry.letters[nameEntry.cur] = e.code.slice(3); nameEntry.cur = Math.min(2, nameEntry.cur + 1); neRender(); }
      else if (e.code === 'Enter') neDone();
      else if (e.code === 'Escape') { neDone(); toMenu(); }
      return;
    }
    if (e.code === 'Backspace' && racing()) { e.preventDefault(); quickRestart(); return; }
    if (paused) { if (e.code === 'Escape') toMenu(); else if (e.code === 'Enter' || e.code === 'KeyP' || e.code === 'Space') setPause(false); return; }
    if ((e.code === 'KeyP' || e.code === 'Escape') && racing()) { setPause(true); return; }
    if (player2) { readKeys2(); if (e.code === 'KeyV') views[1].mode = (views[1].mode + 1) % 3; }
    if (phase === 'intro' && (e.code === 'Enter' || e.code === 'Space')) introT = 99;
    if (e.code === 'KeyH' && phase === 'race') horn();
    if (e.code === 'KeyE' && phase === 'race' && mission) missionAction();
    if (e.code === 'KeyC') { camMode = (camMode + 1) % 4; tvCam = null; }
    if (e.code === 'KeyF') cyclePixel();
    if (e.code === 'KeyM') toggleMute();
    if (e.code === 'KeyR' && phase === 'race' && player.crashed <= 0) { crash(player, 'off'); player.crashed = 0.6; player.resetHere = true; } // back onto the road where you are, no 20 m for free
    if (e.code === 'KeyK' && phase === 'race') tuennsTelefon();
    if (e.code === 'KeyG' && ghost && racing()) toggleGhost();
    if (e.code === 'Escape') toMenu();
    if (e.code === 'Enter' && phase === 'finished') $('#againBtn').onclick();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; readKeys(); if (player2) readKeys2(); });
  // touch buttons follow the thumb: every finger is tracked by its identifier, and a finger sliding from ◀ onto ▶
  // (or from ▲ onto ■) switches over without being lifted
  const TKEYS = { tLeft: 'left', tRight: 'right', tGas: 'gas', tBrake: 'brake', tNitro: 'turbo' };
  const fingers = new Map(); let mouseKey = null;
  function touchSync() { for (const k of Object.values(TKEYS)) touch[k] = false; for (const k of fingers.values()) if (k) touch[k] = true; if (mouseKey) touch[mouseKey] = true; if (oneThumb() && touch.turbo && !nitroWas) nitroTap = 1.5; nitroWas = touch.turbo; readKeys(); }
  // EIN-DAUMEN (B24): where the thumb comes down on the left strip is straight ahead; the sideways distance from there
  // steers (touchmove), full lock at about a ninth of the screen width. A tap on N fires 1.5 s of nitro
  const strip = { id: null, x0: 0, steer: 0 }; let nitroTap = 0, nitroWas = false;
  { const el = $('#tStrip'), scale = () => clamp(window.innerWidth * 0.11, 50, 110);
    const set = (x) => { strip.steer = strip.id == null ? 0 : clamp((x - strip.x0) / scale(), -1, 1); el.classList.toggle('on', strip.id != null); readKeys(); };
    el.addEventListener('touchstart', (e) => { e.preventDefault(); if (strip.id != null && ![...e.touches].some((q) => q.identifier === strip.id)) strip.id = null; /* a lift the strip never heard of (hidden by the pause) */ const t = e.changedTouches[0]; if (strip.id == null && t) { strip.id = t.identifier; strip.x0 = t.clientX; set(t.clientX); } }, { passive: false });
    el.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === strip.id) set(t.clientX); }, { passive: false });
    const lift = (e) => { for (const t of e.changedTouches) if (t.identifier === strip.id) { strip.id = null; set(0); } };
    el.addEventListener('touchend', lift); el.addEventListener('touchcancel', lift);
    el.addEventListener('mousedown', (e) => { e.preventDefault(); strip.id = 'mouse'; strip.x0 = e.clientX; set(e.clientX); }); // desktop testing
    window.addEventListener('mousemove', (e) => { if (strip.id === 'mouse') set(e.clientX); }); window.addEventListener('mouseup', () => { if (strip.id === 'mouse') { strip.id = null; set(0); } }); }
  function applyThumb() { document.body.classList.toggle('oneThumb', oneThumb()); labelBtn($('#thumbBtn'), thumb === 1 ? 'DAUMEN: EINS' : 'DAUMEN: ZWEI', thumb === 1 ? 'Einhand-Steuerung' : 'zwei Daumen'); }
  function setThumb(n) { thumb = n === 1 ? 1 : 2; try { localStorage.setItem('stuntskoelle.thumb', String(thumb)); } catch (e) { /* ignore */ } strip.id = null; strip.steer = 0; applyThumb(); applyLenk(); readKeys(); }
  function applyLenk() { labelBtn($('#lenkBtn'), 'LENKHILFE: ' + (oneThumb() && lenk !== 1 ? 'AN (EIN DAUME)' : LENK[lenk]), lenk === 1 ? 'Lenkhilfe an' : lenk === 2 ? 'Lenkhilfe aus' : 'Lenkhilfe automatisch'); }
  function setLenk(i) { lenk = clamp(i | 0, 0, LENK.length - 1); try { localStorage.setItem('stuntskoelle.lenkhilfe', LENK[lenk]); } catch (e) { /* ignore */ } applyLenk(); if (player && phase !== 'menu') { player.assist = assistOn(); if (player2) player2.assist = assistOn(true); } }
  const keyAt = (x, y) => { const el = document.elementFromPoint(x, y); const b = el && el.closest && el.closest('#touch button'); return (b && TKEYS[b.id]) || null; };
  { const pad = $('#touch');
    pad.addEventListener('touchstart', (e) => { let mine = false; for (const t of e.changedTouches) { const k = TKEYS[t.target.id] || keyAt(t.clientX, t.clientY); if (k) { fingers.set(t.identifier, k); mine = true; } } if (mine) { e.preventDefault(); touchSync(); } }, { passive: false });
    pad.addEventListener('touchmove', (e) => { e.preventDefault(); let moved = false; for (const t of e.changedTouches) { if (!fingers.has(t.identifier) && !keyAt(t.clientX, t.clientY)) continue; const k = keyAt(t.clientX, t.clientY); if (fingers.get(t.identifier) !== k) { fingers.set(t.identifier, k); moved = true; } } if (moved) touchSync(); }, { passive: false });
    const lift = (e) => { if (e.cancelable && TKEYS[e.target.id]) e.preventDefault(); for (const t of e.changedTouches) fingers.delete(t.identifier); touchSync(); };
    pad.addEventListener('touchend', lift, { passive: false }); pad.addEventListener('touchcancel', lift, { passive: false }); }
  for (const id of Object.keys(TKEYS)) { // mouse (desktop testing): press and hold
    const el = document.getElementById(id);
    el.addEventListener('mousedown', (e) => { e.preventDefault(); mouseKey = TKEYS[id]; touchSync(); });
    for (const ev of ['mouseup', 'mouseleave']) el.addEventListener(ev, () => { if (mouseKey === TKEYS[id]) { mouseKey = null; touchSync(); } });
  }

  // ---------------- menu ----------------
  const outlineCache = {};
  function trackOutline(def, canvas, w, h) {
    if (!outlineCache[def.id + def.segments.length]) outlineCache[def.id + def.segments.length] = TB.buildTrack(def);
    const tr = outlineCache[def.id + def.segments.length];
    if (!tr.shortcuts) tr.shortcuts = window.Shortcuts.buildRoutes(tr);
    const projection = SP.outline(tr.samples, canvas, w, h, '#f4f4f4', null, tr.shortcuts.flatMap((r) => r.samples)), ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#6ffc95'; ctx.lineWidth = 1.5;
    for (const route of tr.shortcuts) {
      ctx.strokeStyle = route.kind === 'alternate' ? '#6ccfff' : '#83e7b3';
      ctx.beginPath(); route.samples.forEach((q, i) => i ? ctx.lineTo(projection.px(q), projection.pz(q)) : ctx.moveTo(projection.px(q), projection.pz(q))); ctx.stroke();
    }
    ctx.setLineDash([]);
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
      if (carLocked(i)) { card.classList.add('locked'); card.querySelector('b').textContent = '🔒 ' + c.name.toUpperCase(); card.onclick = () => { const line = pick(tuenn.careerLines.locked); $('#tipp').textContent = line; let t = card.querySelector('.tease'); if (!t) { t = document.createElement('small'); t.className = 'tease'; card.appendChild(t); } t.textContent = line + ' (KARRIERE)'; card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }; } else card.onclick = () => { sel.car = i; renderMenu(); };
      cl.appendChild(card);
    });
    // tracks
    const tl = $('#trackList'), keep = { top: tl.scrollTop, left: tl.scrollLeft }; tl.innerHTML = '';
    const all = allTracks();
    all.forEach((t, i) => {
      const row = document.createElement('div'); row.className = 'trackRow' + (sel.track === i ? ' active' : '');
      const pips = [1, 2, 3, 4, 5].map((k) => `<b class="${k <= (t.diff || 1) ? 'on' : ''}"></b>`).join('');
      const best = raceOpts.mode === 2 ? null : getBest(t, raceOpts.mode, raceOpts.laps), oc = document.createElement('canvas'), tr = trackOutline(t, oc, 110, 62); // the best time of the chosen mode and laps
      row.innerHTML = `<span class="p1">${sel.track === i ? 'P1' : t.fromLink ? '🔗' : i + 1}</span><canvas class="thumb"></canvas><div class="info"><b>${t.name.toUpperCase()}</b><span class="sub">${(t.district || 'Klüngel-Baukasten').toUpperCase()}</span><span class="wp">${(t.waypoints || ['Eigene Streck']).join(' – ').toUpperCase()}</span><span class="chips">${trackChips(t).map((c) => `<i>${c}</i>`).join('')}</span><span class="pips">${pips}</span></div><div class="map"><canvas class="outline"></canvas><span class="km"></span>${best ? `<span class="best">${fmtTime(best)}</span>` : ''}</div>`;
      SP.thumb(t, row.querySelector('.thumb'), 192, 72); row.querySelector('.outline').replaceWith(oc); oc.className = 'outline';
      row.querySelector('.km').textContent = (tr.length * raceOpts.laps / 1000).toFixed(1) + ' KM';
      row.onclick = () => { sel.track = i; onTrackChange(); };
      tl.appendChild(row);
    });
    const selectedRow = tl.children[sel.track]; tl.scrollTop = keep.top; tl.scrollLeft = keep.left;
    if (selectedRow && tl.scrollWidth > tl.clientWidth + 4) { // the phone carousel scrolls sideways
      const left = selectedRow.offsetLeft - tl.offsetLeft, right = left + selectedRow.offsetWidth;
      if (left < tl.scrollLeft) tl.scrollLeft = left; else if (right > tl.scrollLeft + tl.clientWidth) tl.scrollLeft = right - tl.clientWidth;
    } else if (selectedRow && tl.clientHeight) {
      const top = selectedRow.getBoundingClientRect().top - tl.getBoundingClientRect().top + tl.scrollTop - tl.clientTop;
      const bottom = top + selectedRow.getBoundingClientRect().height;
      if (top < tl.scrollTop) tl.scrollTop = top;
      else if (bottom > tl.scrollTop + tl.clientHeight) tl.scrollTop = bottom - tl.clientHeight;
    }
    const t = all[sel.track] || TRACKS[0];
    $('#trackDesc').textContent = t.desc || 'Eigene Streck aus dem Klüngel-Baukasten.';
    const routes = outlineCache[t.id + t.segments.length].shortcuts;
    const forks = routeGroups(routes).filter((g) => g.routes.length > 1).length;
    const explored = routePassport(t);
    $('#trackRoutes').textContent = routes.length ? `VEEDELS-PASS ${explored.size}/${routes.length} · ${forks ? forks + ' DREI-WEGE-GABELUNG' + (forks > 1 ? 'EN' : '') + ' · ' : ''}GRÜN = ABKÜRZUNG · BLAU = PANORAMAROUTE · WEISS = HAUPTSTRECKE. ` + routes.map((r) => `${explored.has(r.id) ? '✓ ' : ''}${r.name} (${routeDelta(r)})`).join(' · ') + '. Vor dem Schild links/rechts einordnen; mittig bleibst du auf der Hauptstrecke.' : '';
    $('#quickTrack').textContent = t.name.toUpperCase();
    { const e = easyPick(); $('#easySub').textContent = e.first ? `${e.def.name.toUpperCase()} · ${PLAYABLE[e.driver].name.toUpperCase()} · ${PLAYABLE[e.driver].diff}` : `NOCHMAL: ${e.def.name.toUpperCase()}` + (raceOpts.mode ? ' · ' + MODES[raceOpts.mode] : '') + (raceOpts.laps === 1 ? ' · 1 RUNDE' : ''); } // the one-tap start drives the chosen MODUS and RUNDEN too
    $('#langerQuote').textContent = '„' + pick(tuenn.intro) + '“';
    $('#slogan').textContent = tuenn.slogans[Math.floor(Date.now() / 86400000) % tuenn.slogans.length];
    try { const pad = (v) => String(Math.max(0, v | 0)).padStart(6, '0'); const tot0 = parseInt(localStorage.getItem('stuntskoelle.deckel') || '0') || 0; const hs = parseInt(localStorage.getItem('stuntskoelle.hiscore') || '0') || 0; if ($('#hs1')) { $('#hs1').textContent = pad(tot0 * 100); $('#hsTop').textContent = pad(Math.max(hs * 100, 471100)); $('#hsCredit').textContent = String(1 + Math.min(98, Math.floor(tot0 / 11))).padStart(2, '0'); } } catch (e) { /* ignore */ }
    try { const tot = parseInt(localStorage.getItem('stuntskoelle.deckel') || '0') || 0; const wins = parseInt(localStorage.getItem('stuntskoelle.cupwins') || '0') || 0; const q = document.querySelector('.bannerQuote .q'); if (q && tot > 0) q.innerHTML = `DING DECKEL: ${tot} STRICHE<br>${deckelRank(tot)}${wins ? ' · ' + wins + '× CUP' : ''}<span>– der Köbes</span>`; } catch (e) { /* ignore */ }
    $('#tipp').textContent = pick(tuenn.tips);
    labelBtn($('#careerBtn'), careerLabel()); applyRaceOpts();
    try { localStorage.setItem('stuntskoelle.sel', JSON.stringify(sel)); } catch (e) { /* ignore */ }
  }
  // ---------------- MODUS · RUNDEN · KLÜNGEL · GEIST: the race settings beside JETZ FAHREN ----------------
  function saveRaceOpts() { try { localStorage.setItem('stuntskoelle.mode', JSON.stringify(raceOpts)); } catch (e) { /* ignore */ } }
  const optLabel = (id, cap, val) => { const b = $(id); b.querySelector('i').textContent = cap; b.querySelector('b').textContent = val; b.setAttribute('aria-label', cap + ': ' + val); };
  // the ghosts a track can race against: the own best lap (''), the named ones, and none ('-')
  function ghostChoices(def) { const names = Object.keys(namedGhosts(def)).sort(); return ownGhost(def) || names.length ? (ownGhost(def) ? [''] : []).concat(names, ['-']) : []; }
  function applyRaceOpts() {
    optLabel('#modeBtn', 'MODUS', MODES[raceOpts.mode]); optLabel('#lapsBtn', 'RUNDEN', String(raceOpts.laps)); optLabel('#kluengelBtn', 'KLÜNGEL', raceOpts.kluengel ? 'AN' : 'AUS');
    $('#kluengelBtn').hidden = raceOpts.mode !== 0; // the rubber band is a RENNEN thing
    const def = activeTrackDef(), ch = ghostChoices(def); $('#ghostBtn').hidden = !ch.length || raceOpts.mode === 2;
    if (ch.length) { let pk = ghostPick(def); if (!ch.includes(pk)) pk = ch[0]; optLabel('#ghostBtn', 'GEIST', pk === '-' ? 'AUS' : pk ? `GEGEN ${pk} FAHRE` : 'DING BESTE'); $('#ghostBtn').classList.toggle('vs', !!pk && pk !== '-'); }
    document.body.dataset.mode = MODE_KEY[raceOpts.mode]; $('#startBtn').textContent = `${MODES[raceOpts.mode]} STARTEN`;
  }
  function onTrackChange() { renderMenu(); }
  // the plain icons of a track for the menu: what is on it, not where
  function trackChips(t) {
    const segs = t.segments || [], has = (k) => segs.some((g) => g.t === k), out = [];
    if (has('loop')) out.push('LOOP'); if (has('jump')) out.push('SPRUNG'); if (has('corkscrew')) out.push('SCHRAUB');
    const tr = outlineCache[t.id + segs.length], forks = tr && tr.shortcuts ? routeGroups(tr.shortcuts).filter((g) => g.routes.length > 1).length : 0;
    if (forks) out.push('3 WEGE'); else if (tr && tr.shortcuts && tr.shortcuts.length) out.push('NEBENWEGE');
    if (t.theme && t.theme.night) out.push('NACHT');
    return out.slice(0, 4);
  }
  // EINFACH LOSFAHRE: one tap, no choices. The last track you raced; the very first time the Dom track with Tünnes (LEICHT)
  function easyPick() {
    let id = null, raced = false; try { id = localStorage.getItem('stuntskoelle.last'); raced = parseInt(localStorage.getItem('stuntskoelle.controlsSeen') || '0') > 0; } catch (e) { /* ignore */ }
    const all = allTracks(), j = id ? all.findIndex((t) => t.id === id) : -1, i = j >= 0 ? j : id || raced ? clamp(sel.track, 0, all.length - 1) : -1; // a save from before EINFACH LOSFAHRE, or a last track that is gone (yesterday's Streck des Tages, a deleted Baukasten track): the track picked last
    if (i >= 0) return { i, def: all[i], driver: sel.driver, first: false };
    const d = Math.max(0, all.findIndex((t) => t.id === 'dom')), tu = PLAYABLE.findIndex((p) => p.id === 'tuennes');
    return { i: d, def: all[d], driver: tu >= 0 ? tu : 0, first: true };
  }
  function easyGo() { const e = easyPick(); sel.track = e.i; sel.driver = e.driver; if (carLocked(sel.car)) sel.car = 0; cup.on = false; careerChapter = null; missionMode = false; closeCareerMap(); lockLandscape(); startRace(); }
  function setMore(on) { document.body.classList.toggle('menuMore', on); $('#moreBtn').setAttribute('aria-expanded', on ? 'true' : 'false'); $('#moreBtn').textContent = on ? '✕ WENIJER' : '☰ MEHR'; if (on) requestAnimationFrame(() => { const m = $('#menuMore'); if (m && m.scrollIntoView) m.scrollIntoView({ block: 'start', behavior: 'smooth' }); }); }

  // a story is only told where it can be read: no loop, jump or fork within the next 120 m
  function calmRoad() {
    const S = track.samples, n = S.length, i0 = Math.floor(((player.s % track.length) + track.length) % track.length / track.ds);
    for (let k = -4; k < 120 / track.ds; k++) { const q = S[((i0 + k) % n + n) % n]; if (q.kind === 'loop' || q.kind === 'ramp' || q.kind === 'gap' || q.kind === 'land') return false; }
    return !track.routeGroups.some((g) => g.startS - player.s > -10 && g.startS - player.s < 90);
  }
  // ---------------- Wahrzeichen: a name tag over the landmark while its story is told, the album under REKORDE ----------------
  // A told landmark story puts a pixel label with a thin pointer over its building for 4 s (its dot blinks on the minimap);
  // passing it (the story's 70 m) puts it in the album, stuntskoelle.wahrzeichen. stats.roman counts the twelve Romanesque.
  const WZ = D.WAHRZEICHEN || {};
  let lmTag = null; const _tagV = new THREE.Vector3();
  function showLandmarkTag(st) {
    if (!st.wz || !st.prop || player2 || demo) return;
    const p = st.prop; lmTag = { wz: st.wz, t: 4, name: WZ[st.wz].name, top: new THREE.Vector3(p.position.x, p.position.y + (p.userData.tagY || 8), p.position.z), base: p.position.clone(), anchor: new THREE.Vector3(), x: 0, y: 0, on: false };
    $('#landmarkTag span').textContent = lmTag.name;
  }
  // the pointer's tip sits on the building's axis: at its top (at most 30 m up), or lower down the axis when the top is
  // above the upper third of the screen (the HUD lives there); a building behind the camera hides the tag
  function placeLandmarkTag() {
    const el = $('#landmarkTag'); if (!el) return;
    if (!lmTag || lmTag.t <= 0 || !camera || player2 || paused || !(phase === 'race' || phase === 'finished')) { if (!el.hidden) el.hidden = true; if (lmTag && (lmTag.t <= 0 || phase !== 'race' && phase !== 'finished')) lmTag = null; return; }
    const w = window.innerWidth, h = window.innerHeight, minY = Math.max(el.offsetHeight + 40, h * 0.3);
    const proj = (t) => { _tagV.lerpVectors(lmTag.top, lmTag.base, t); lmTag.anchor.copy(_tagV); _tagV.project(camera); return (1 - _tagV.y) / 2 * h; };
    if (proj(0) < minY && proj(1) > minY) { let a = 0, b = 1; for (let k = 0; k < 10; k++) { const m = (a + b) / 2; if (proj(m) < minY) a = m; else b = m; } proj(b); }
    else proj(0);
    if (_tagV.z > 1 || _tagV.z < -1) { el.hidden = true; lmTag.on = false; return; } // behind the camera
    el.hidden = false;
    const half = el.offsetWidth / 2 + 64, x = Math.max(half, Math.min(w - half, (_tagV.x + 1) / 2 * w)), y = Math.max(minY, Math.min(h - 10, (1 - _tagV.y) / 2 * h)); // 64 px: clear of the button columns at the sides
    el.style.left = x.toFixed(1) + 'px'; el.style.top = y.toFixed(1) + 'px'; el.classList.toggle('blink', lmTag.t < 0.6); lmTag.x = x; lmTag.y = y; lmTag.on = true;
  }
  function wzFound() { try { const a = JSON.parse(localStorage.getItem('stuntskoelle.wahrzeichen') || '[]'); return Array.isArray(a) ? a.filter((id) => typeof id === 'string' && WZ[id]) : []; } catch (e) { return []; } }
  function discoverWz(id) {
    if (!WZ[id] || (trackDef && trackDef.daily)) return false; const have = wzFound(); if (have.includes(id)) return false; have.push(id);
    try { localStorage.setItem('stuntskoelle.wahrzeichen', JSON.stringify(have)); const st = getStats(); st.roman = have.filter((k) => WZ[k].roman).length; localStorage.setItem('stuntskoelle.stats', JSON.stringify(st)); } catch (e) { /* the album is a bonus */ }
    return true;
  }
  // every story Dä Lange has told, per track, to be read again under REKORDE
  function heardStories() { try { return JSON.parse(localStorage.getItem('stuntskoelle.verzaellcher') || '{}') || {}; } catch (e) { return {}; } }
  function rememberStory(text) {
    const def = trackDef; if (!def || !def.id || def.daily) return; const all = heardStories(), list = all[def.id] || (all[def.id] = []);
    if (list.includes(text)) return; list.push(text); try { localStorage.setItem('stuntskoelle.verzaellcher', JSON.stringify(all)); } catch (e) { /* ignore */ }
  }
  // ---------------- records ----------------
  function showRecords() {
    const box = $('#recordsList'); box.innerHTML = '';
    TRACKS.concat(daily ? [daily] : []).forEach((t, i) => {
      // one board per mode and laps (RENNEN and ZEITFAHREN, 3 and 1); ZEITFAHREN says MIT or OHNE NEBENSTROSSE
      const boards = []; for (const m of [0, 1]) for (const l of [t.laps || 3, 1].filter((x, k, a) => a.indexOf(x) === k)) { const recs = getRecords(t, m, l); if (recs.length) boards.push({ m, l, recs }); }
      const named = namedGhosts(t), gn = Object.keys(named).sort((a, b) => named[a].time - named[b].time);
      const div = document.createElement('div'); div.className = 'recTrack';
      div.innerHTML = `<b>${i + 1}. ${t.name.toUpperCase()}</b>` + (boards.length ? boards.map(({ m, l, recs }) => `<small class="recBoard">${MODES[m]} · ${l} ${l > 1 ? 'RUNDEN' : 'RUNDE'}</small><ol>` + recs.map((r) => `<li><span>${r.name}</span><span>${r.car}${m === 1 ? ` · ${r.side ? 'MIT' : 'OHNE'} NEBENSTROSSE` : ''}</span><span>${fmtTime(r.time)}</span></li>`).join('') + '</ol>').join('') : '<p>Noch keine Zeit. Dä Lange wartet.</p>') + (gn.length ? `<small class="recGhosts">👻 GEISTER: ${gn.map((n) => `${n} ${fmtTime(named[n].time)}`).join(' · ')}</small>` : '');
      box.appendChild(div);
    });
    { const st = getStats(), have = getOrden(); const grid = document.createElement('div'); grid.className = 'ordenGrid';
      grid.innerHTML = '<b class="ordenHead">ORDEN OP DER DECKEL · ' + have.length + ' / ' + tuenn.orden.length + '</b>' + tuenn.orden.map((o) => `<div class="orden ${have.includes(o.id) ? 'on' : ''}"><canvas></canvas><b>${kids && o.id === 'stammgast' ? 'KAMELLE-KÖNIG' : o.name}</b><small>${kids ? kidsText(o.desc) : o.desc}</small>${hdOn && o.hd ? `<small class="hdl">${kids ? kidsText(o.hd) : o.hd}</small>` : ''}<i>${Math.min(o.need, st[o.stat] || 0)} / ${o.need}</i></div>`).join('');
      grid.querySelectorAll('.orden canvas').forEach((c, i) => medalIcon(c, tuenn.orden[i].color, 3)); box.appendChild(grid); }
    { const heard = heardStories(), n = Object.values(heard).reduce((a, l) => a + l.length, 0); const v = document.createElement('div'); v.className = 'verz';
      v.innerHTML = `<b class="ordenHead">DÄ LANGE SING VERZÄLLCHER · ${n}</b>` + (n ? TRACKS.filter((t) => (heard[t.id] || []).length).map((t) => `<details><summary>${t.name.toUpperCase()} · ${heard[t.id].length}</summary>${heard[t.id].map((x) => `<p>„${x}“</p>${hdOn && HD.get(x) ? `<p class="hdl">${HD.get(x)}</p>` : ''}`).join('')}</details>`).join('') : '<p>Noch nix jehört. Fahr ens langsam an de Plätze vörbei – dä Lange verzällt jet.</p>');
      box.appendChild(v); }
    { const have = wzFound(), ids = Object.keys(WZ), rom = ids.filter((k) => WZ[k].roman), where = {}; // where to find what is still missing
      for (const t of D.TRACKS) for (const p of t.props || []) { const k = p.wz || p.type; if (p.story && WZ[k] && !where[k]) where[k] = t.name.toUpperCase(); }
      const a = document.createElement('div'); a.className = 'wzAlbum';
      a.innerHTML = `<b class="ordenHead">WAHRZEICHEN ${have.length}/${ids.length} ENTDECKT</b><small class="wzRom">ZWÖLF ROMANISCHE KIRCHE: ${rom.filter((k) => have.includes(k)).length} / ${rom.length}</small>${hdOn ? '<small class="hdl">Wahrzeichen: entdeckt, wenn du an ihnen vorbeifährst</small>' : ''}<div class="wzGrid">` +
        ids.map((k) => `<span class="wz${have.includes(k) ? ' on' : ''}${WZ[k].roman ? ' rom' : ''}">${have.includes(k) ? WZ[k].name : '? ? ?'}${have.includes(k) || !where[k] ? '' : `<i>${where[k]}</i>`}</span>`).join('') + '</div>';
      box.appendChild(a); }
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
    const heading = edHeading(), straight = ed.pieces.some((p) => p === 'straight' || p === 'bridge' || p === 'tunnel');
    const shut = ed.pieces.length >= 4 && heading === 0 && straight ? TB.closure(edDef()) : null; const ok = !!(shut && shut.closed); // only a gap under 2 m and under 5° counts as zo
    $('#edWarn').textContent = ed.pieces.length < 4 ? 'Mindestens 4 Teile, Jung.' : heading !== 0 ? `Streck jeht nit zo: noch ${360 - heading}° Kurve links (oder ${heading}° rechts) fehlen.` : !straight ? 'Mindestens eine Gerade, sonst kann der Klüngel nix schließen.' : ok ? 'Streck is zo. Fott domet!' : `Streck is noch op: NOCH ${Math.max(2, Math.round(shut.gap))} M AFF. ${edHint(shut)}`;
    $('#edWarn').className = ok ? 'ok' : 'bad';
    $('#edDrive').disabled = !ok; $('#edSave').disabled = !ok;
    const cv = $('#edPreview');
    if (ed.pieces.length >= 2) { try { const tr = TB.buildTrack(edDef()); SP.outline(ok ? tr.samples : TB.closure(edDef()).samples, cv, cv.clientWidth || 420, cv.clientHeight || 260, ok ? '#7fff00' : '#ff7b7b'); /* an open layout is drawn open: the gap shows */ $('#edLen').textContent = (tr.length / 1000).toFixed(2) + ' KM'; } catch (e) { /* ignore */ } }
    else { cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); $('#edLen').textContent = ''; }
  }
  // the missing piece for a layout that does not close: try one more GERADE in every place and name the place that
  // closes the gap, or else shrinks it most; no place helps: say where the end lies from the start
  function edHint(shut) {
    const def = edDef(); let best = null;
    for (let k = 0; k <= ed.pieces.length && ed.pieces.length < 40; k++) {
      const segs = def.segments.slice(); segs.splice(k, 0, Object.assign({}, PIECES[0].seg)); const c = TB.closure({ segments: segs, scale: 1 });
      if (!best || c.gap < best.gap - 0.5) best = { k, gap: c.gap, closed: c.closed };
    }
    const where = (k) => k === 0 ? 'janz vürre' : `noh Teil ${k} (${PIECES.find((q) => q.id === ed.pieces[k - 1]).label})`;
    if (best && best.gap < shut.gap - 1) return best.closed ? `Et fählt en GERADE ${where(best.k)}.` : `Tipp: en GERADE ${where(best.k)}, dann sin et noch ${Math.round(best.gap)} m.`;
    return Math.abs(shut.ahead) >= Math.abs(shut.left) ? `Dä Start litt ${Math.round(Math.abs(shut.ahead))} m ${shut.ahead > 0 ? 'vür' : 'hinger'} dem Engk: Gerade ${shut.ahead > 0 ? 'dobei' : 'fott'}.` : `Dä Start litt ${Math.round(Math.abs(shut.left))} m ${shut.left > 0 ? 'links' : 'räächs'} vum Engk: do fählt en Gerade quer.`;
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
    for (let attempt = 0; attempt < 160; attempt++) { // a layout the straights cannot close is thrown away: plenty of tries
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
      try { if (!TB.closure(def).closed) continue; const t = TB.buildTrack(def); if (t.length > 900 && t.length < 2600) return def; } catch (e) { /* next attempt */ } // only a truly closed round
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
  // the results' new Orden, with the Hochdeutsch line under the Kölsch when KÖLSCH-HÜLP is on
  function ordenItems(list) { return list.map((o) => `<div class="oitem"><canvas class="medal"></canvas><span>NEUER ORDEN: <b>${o.name}</b> · ${kids ? kidsText(o.desc) : o.desc}${hdOn && o.hd ? `<small class="hdl">${kids ? kidsText(o.hd) : o.hd}</small>` : ''}</span></div>`).join(''); }
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
    if (ahead) { ahead.yieldT = 2.5; if (msgTimer <= 0 && Math.random() < 0.6) say(ahead.driver, pickNew(tuenn.hupeRival), 2200); }
    else if (msgTimer <= 0 && Math.random() < 0.5) say(tuenn, pickNew(tuenn.hupe), 2200);
  }

  // ---------------- Botengang: fetch something on foot, deliver it by car, the Kripo behind you ----------------
  function goalText(g) { return g.place ? `TOP ${g.place}` : g.win ? 'SIEG' : g.stunts ? `${g.stunts} STUNTS` : g.koelsch ? `${g.koelsch} KÖLSCH` : g.auftrag ? `${g.auftrag} AUFTRAG` : 'ANKOMMEN'; }
  function startMission(def) {
    missionMode = true; missionDef = def; clearMission();
    startRace(Object.assign({}, def, { laps: 99 }), () => {
    const B = tuenn.botengang, TM = trackDef.mission || {};
    const a = roadFrameAhead(player.s, 230 + Math.random() * 150, 45);
    const WH = TM.where || B.where, WT = TM.what ? TM.what : B.what, WS = TM.what ? TM.whatShort || [] : B.whatShort, k = Math.floor(Math.random() * WT.length); // every track brings its own places (Rheinauhafen: Lieferrampe am Schokoladenmuseum …); Streck des Tages and Baukasten use the generic ones
    mission = { stage: 'drive1', pickS: a.s, side: Math.random() < 0.5 ? 1 : -1, what: WT[k], short: WS[k] || 'PAKET', pickName: pick(WH), dropName: pick(WH), timer: 0, onFoot: false, walker: null, meshes: [], farCool: 0 };
    if (mission.dropName === mission.pickName) mission.dropName = WH[(WH.indexOf(mission.pickName) + 1) % WH.length];
    const ring = dropMesh('ABHOLEN · ' + mission.pickName); ring.position.set(a.f.p.x, a.f.p.y + 0.1, a.f.p.z); ring.rotation.y = Math.atan2(-a.f.T.x, -a.f.T.z); scene.add(ring); mission.meshes.push(ring); mission.ring = ring; // the sign faces the driver coming up the road
    setTimeout(() => { if (mission && phase !== 'menu') sayMust(tuenn, placeArticles(pickNew(B.brief).replace('{pick}', mission.pickName).replace('{what}', mission.what).replace('{drop}', mission.dropName)), 5200); }, 7600);
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
      const door = dropMesh(mission.pickName); door.position.copy(mission.doorPos); door.lookAt(player.mesh.position.x, mission.doorPos.y, player.mesh.position.z); door.scale.set(0.55, 1, 0.55); scene.add(door); mission.meshes.push(door); mission.door = door;
      const pk = umschlagMesh(); pk.position.copy(mission.doorPos); pk.position.y += 0.4; scene.add(pk); mission.meshes.push(pk); mission.pkg = pk;
      scene.remove(mission.ring); sayMust(tuenn, pickNew(B.out), 3000); return;
    }
    if (mission.stage === 'walkback' && !$('#hudPrompt').hidden) { // back in: the drop-off appears, the Kripo too
      mission.onFoot = false; mission.stage = 'drive2'; prompt(null); scene.remove(mission.walker); mission.walker = null; if (mission.carRing) scene.remove(mission.carRing);
      const b = roadFrameAhead(player.s, 420 + Math.random() * 260, 30); mission.dropS = b.s; let dist = b.s - player.s; if (dist < 0) dist += track.length; mission.timer = Math.round(dist / 12) + 25;
      const ring = dropMesh('ABLIEFERN · ' + mission.dropName); ring.position.set(b.f.p.x, b.f.p.y + 0.1, b.f.p.z); ring.rotation.y = Math.atan2(-b.f.T.x, -b.f.T.z); scene.add(ring); mission.meshes.push(ring); mission.ring2 = ring;
      if (!kripo) startKripo(); sayMust(tuenn, placeArticles(pickNew(B.back).replace('{drop}', mission.dropName)), 3600);
    }
  }
  function walkStep(dt) {
    const w = mission.walker; if (!w) return; const B = tuenn.botengang; walkT += dt;
    const turn = -input.steer * 2.6 * dt; w.rotation.y += turn; const speed = (input.gas ? 5.2 : 0) - (input.brake && !oneThumb() ? 2.4 : 0); // EIN-DAUMEN walks on its own, ■ stops
    if (speed) { w.position.x += Math.sin(w.rotation.y) * speed * dt; w.position.z += Math.cos(w.rotation.y) * speed * dt; w.position.y = W.GROUND_Y + Math.abs(Math.sin(walkT * 11)) * 0.06; w.rotation.z = Math.sin(walkT * 11) * 0.04; } else { w.position.y = W.GROUND_Y; w.rotation.z = 0; }
    const car = player.mesh.position; mission.farCool -= dt;
    { // project onto the road: the walker may use the street and both sidewalks, up to 70 m from the car along it
      const L = track.length; let bestD = 1e9, bestI = 0; const i0 = Math.floor(player.s / track.ds); const S = track.samples, n = S.length;
      for (let k = -80; k <= 80; k += 2) { const q = S[((i0 + k) % n + n) % n]; const d = (q.p.x - w.position.x) ** 2 + (q.p.z - w.position.z) ** 2; if (d < bestD) { bestD = d; bestI = ((i0 + k) % n + n) % n; } }
      const q = S[bestI]; const bl = Math.hypot(q.B.x, q.B.z) || 1; const bx = q.B.x / bl, bz = q.B.z / bl; let lat = (w.position.x - q.p.x) * bx + (w.position.z - q.p.z) * bz; const along = (w.position.x - q.p.x) * q.T.x + (w.position.z - q.p.z) * q.T.z;
      const maxLat = ROAD_W + 5.6; let pushed = false; if (Math.abs(lat) > maxLat) { lat = Math.sign(lat) * maxLat; pushed = true; }
      let ds = (bestI - i0) * track.ds; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L; if (Math.abs(ds) > 70) { pushed = true; if (mission.farCool <= 0) { mission.farCool = 6; sayMust(tuenn, pickNew(B.far), 2500); } }
      if (pushed) { const sI = Math.abs(ds) > 70 ? ((i0 + Math.sign(ds) * Math.round(70 / track.ds)) % n + n) % n : bestI; const qq = S[sI]; const bl2 = Math.hypot(qq.B.x, qq.B.z) || 1; w.position.x = qq.p.x + qq.B.x / bl2 * lat + (Math.abs(ds) > 70 ? 0 : qq.T.x * along); w.position.z = qq.p.z + qq.B.z / bl2 * lat + (Math.abs(ds) > 70 ? 0 : qq.T.z * along); }
    }
    if (mission.stage === 'walk') { mission.pkg.rotation.y += dt * 2; if (w.position.distanceTo(mission.doorPos) < 2.4) { mission.stage = 'walkback'; scene.remove(mission.pkg); scene.remove(mission.door); const cr = dropMesh('DAT AUTO'); cr.position.copy(car); cr.position.y = W.GROUND_Y + 0.1; cr.lookAt(w.position.x, cr.position.y, w.position.z); scene.add(cr); mission.meshes.push(cr); mission.carRing = cr; beep(1180, 0.08, 'square', 0.12); setTimeout(() => beep(1580, 0.12, 'square', 0.12), 90); sayMust(tuenn, pickNew(B.got), 3000); } }
  }
  function missionEnd(ok, why) {
    if (!mission || phase !== 'race') return; phase = 'finished'; prompt(null); const B = tuenn.botengang; player.finished = true; player.finishTime = raceTime;
    if (kripo) endKripo('finish'); const m = mission; clearMission(); mission = null;
    const strokes = ok ? 8 : -3; addDeckel(strokes); const total = deckelTotal(deckel); if (ok) bumpStat('boten'); newOrden = checkOrden();
    const headline = (ok ? B.headlineDone : why === 'caught' ? B.headlineCaught : B.headlineLate).replace('{where}', (trackDef && trackDef.where) || 'EN KÖLLE'); lastHeadline = headline; lastPlace = ok ? 1 : 10; shotWanted = true; fanfare(ok);
    setTimeout(() => {
      if (phase === 'menu') return;
      $('#resTitle').textContent = ok ? `BOTENGANG ERLEDIGT: ${m.short} ${({ f: "BEI D'R", p: 'BEI' })[D.placeGender(m.dropName).g] || 'BEIM'} ${m.dropName}.` : why === 'caught' ? 'BOTENGANG VERMASSELT: DIE KRIPO HÄT DICH.' : 'BOTENGANG VERMASSELT: ZU SPÄT.';
      $('#resTable').innerHTML = `<tr class="me"><td>${ok ? '✓' : '✗'}</td><td>DU</td><td>${D.CARS[sel.car].name}</td><td>${fmtTime(raceTime)}</td></tr>`;
      $('#resBest').textContent = ok ? 'pünktlich' : '–'; $('#resRecord').hidden = true;
      $('#resStats').innerHTML = `PAKET: <b>${m.short}</b> (${m.what}) · VON: <b>${m.pickName}</b> · NACH: <b>${m.dropName}</b> · KRIPO: <b>${why === 'caught' ? 'HÄT DICH JEKRIEGT' : ok ? 'ABJEHÄNGT' : 'NOCH DRAN'}</b> · SCHADEN: <b>${Math.round(player.damage * 100)} %</b>`;
      $('#resExpress').textContent = headline.replace(/^DÄ SCHNELLE:\s*/, ''); drawFrontPage(headline, ok ? 1 : 10, [player]);
      $('#resDeckel').innerHTML = `BIERDECKEL: <b>${strokes > 0 ? '+' : ''}${strokes}</b> Striche · GESAMT: <b>${total}</b> – <b>${deckelRank(total)}</b>`;
      $('#resCup').hidden = true; againLabel(careerChapter != null ? (ok ? 'NÄCHSTES KAPITEL' : 'KAPITEL NOCHMAL') : 'NOCHMAL');
      { const ob = $('#resOrden'); ob.hidden = !newOrden.length; if (newOrden.length) { ob.innerHTML = ordenItems(newOrden); ob.querySelectorAll('canvas').forEach((c, i) => medalIcon(c, newOrden[i].color, 2)); } }
      $('#resTuenn').textContent = placeArticles(pick(ok ? B.done : why === 'caught' ? B.caught : B.late).replace('{drop}', m.dropName)); $('#resRival').textContent = '';
      if (careerChapter != null) applyCareerResult(ok, 1);
      resLayout(); $('#results').hidden = false; document.body.classList.add('resultsOpen');
    }, 1400);
  }

  // ---------------- Deckel mitnehmen: export and import of everything the browser remembers ----------------
  const SAVE_SKIP = /^stuntskoelle\.(ghost|sel|pixel|voice|voiceName|tilt|music)/;
  function exportSave() {
    const data = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('stuntskoelle.') && !SAVE_SKIP.test(k)) data[k] = localStorage.getItem(k); } } catch (e) { /* ignore */ }
    const json = JSON.stringify(data); const b64 = btoa(unescape(encodeURIComponent(json))); return 'K4D1.' + b64;
  }
  function importSave(code) {
    code = (code || '').trim(); if (code.startsWith('K4G1.')) return importGhost(code); // a record ghost from another device
    if (!code.startsWith('K4D1.')) return 'Dat is kein Deckel-Code.';
    let data; try { data = JSON.parse(decodeURIComponent(escape(atob(code.slice(5))))); } catch (e) { return 'Code kaputt. Nochmal kopieren.'; }
    let n = 0; try { for (const k of Object.keys(data)) if (k.startsWith('stuntskoelle.') && !SAVE_SKIP.test(k)) { localStorage.setItem(k, String(data[k])); n++; } } catch (e) { return 'Speichern jing nit.'; }
    migrateRecords(); renderMenu(); return `${n} Einträge übernommen. Der Deckel hängt jetzt hee.`;
  }

  // ---------------- Karriere: die Nachtschicht ----------------
  // progress by chapter id: { v: 2, done: { id: star bits }, cur: the chapter KARRIERE continues with ('' = Nachtschicht over) }.
  // Star bits: 1 = goal, 2 = top three (Botengang: under 50 % damage), 4 = no Knöllchen (Domschatz: the Kripo never caught you).
  // The first release saved { chapter: n } as an index into its own order (D.TUENN.careerV1): it is migrated by id, once.
  const CAREER_IDS = tuenn.career.map((c) => c.id);
  const careerIdx = (id) => CAREER_IDS.indexOf(id);
  const starCount = (bits) => (bits & 1) + (bits >> 1 & 1) + (bits >> 2 & 1);
  function careerNextOpen(st, from) { const n = CAREER_IDS.length, i0 = careerIdx(from); for (let k = 1; k <= n; k++) { const id = CAREER_IDS[(i0 + k + n) % n]; if (!st.done[id]) return id; } return ''; } // the first unfinished chapter after 'from', wrapping round
  function careerState() {
    let raw = null; try { raw = JSON.parse(localStorage.getItem('stuntskoelle.career') || 'null'); } catch (e) { raw = null; }
    if (raw && raw.v === 2 && raw.done && typeof raw.done === 'object') { const st = { v: 2, done: {}, cur: '' }; for (const id of CAREER_IDS) if (raw.done[id]) st.done[id] = raw.done[id] | 1; st.cur = CAREER_IDS.includes(raw.cur) && !st.done[raw.cur] ? raw.cur : careerNextOpen(st, raw.cur || ''); return st; }
    const old = tuenn.careerV1 || CAREER_IDS, n = raw && Number.isFinite(+raw.chapter) ? clamp(Math.floor(+raw.chapter), 0, old.length) : 0, st = { v: 2, done: {}, cur: '' };
    old.forEach((id, i) => { if (CAREER_IDS.includes(id) && (i < n || (raw && raw.done === true))) st.done[id] = 1; });
    st.cur = n < old.length && CAREER_IDS.includes(old[n]) && !st.done[old[n]] ? old[n] : careerNextOpen(st, '');
    if (raw) careerSave(st); return st;
  }
  function careerSave(st) { try { localStorage.setItem('stuntskoelle.career', JSON.stringify(st)); } catch (e) { /* ignore */ } }
  // a chapter is open when it is done, the current one, or not after the furthest chapter reached
  function careerOpen(st, i) { let far = careerIdx(st.cur); CAREER_IDS.forEach((id, k) => { if (st.done[id]) far = Math.max(far, k + 1); }); return !!st.done[CAREER_IDS[i]] || i <= Math.max(0, far); }
  function careerOver(st) { return CAREER_IDS.every((id) => st.done[id]); }
  function carLocked(i) { if (D.CARS[i].id !== 'countach') return false; try { return localStorage.getItem('stuntskoelle.countach') !== '1' && !careerOver(careerState()); } catch (e) { return true; } }
  let careerAgain = null; // the chapter NOCHMAL / NÄCHSTES KAPITEL plays
  function startCareer(i) {
    const st = careerState(); let ch = Number.isInteger(i) ? clamp(i, 0, CAREER_IDS.length - 1) : Math.max(0, careerIdx(st.cur));
    if (!careerOpen(st, ch)) ch = Math.max(0, careerIdx(st.cur));
    closeCareerMap(); careerChapter = ch; careerAgain = ch; cup.on = false; const c = tuenn.career[ch]; const def = TRACKS.find((t) => t.id === c.track) || TRACKS[0];
    if (c.type === 'mission') startMission(def); else { missionMode = false; startRace(def); }
    setTimeout(() => { if (careerChapter === ch && phase !== 'menu') sayMust(tuenn, `Kapitel ${ch + 1}, ${c.title}. ${c.intro}`, 5200); }, c.type === 'mission' ? 13500 : 7600);
  }
  // the three stars of a finished chapter (goal, top three or an undamaged parcel, a clean licence)
  function careerStars(ok, place) { if (!ok) return 0; const c = tuenn.career[careerChapter]; return 1 | ((c.type === 'mission' ? player.damage < 0.5 : place <= 3) ? 2 : 0) | ((theme.heist ? !kripoCaught : !knoellchen) ? 4 : 0); }
  function applyCareerResult(ok, place) {
    const ch = careerChapter, c = tuenn.career[ch]; const st = careerState();
    if (ok) {
      const bits = careerStars(true, place), was = st.done[c.id] || 0; st.done[c.id] = was | bits;
      if (!st.cur || st.cur === c.id) st.cur = careerNextOpen(st, c.id);
      careerSave(st);
      const finale = ch + 1 >= tuenn.career.length; careerAgain = finale ? 0 : ch + 1;
      if (finale) { try { localStorage.setItem('stuntskoelle.countach', '1'); } catch (e) { /* ignore */ } bumpStat('career'); const no = checkOrden(); if (no.length) { newOrden = newOrden.concat(no); const ob = $('#resOrden'); ob.hidden = false; ob.innerHTML = ordenItems(newOrden); ob.querySelectorAll('canvas').forEach((cv, i) => medalIcon(cv, newOrden[i].color, 2)); } }
      const stars = `${starCount(bits)} VUN 3 STÄÄNE`;
      $('#resTitle').textContent = (finale ? `NACHTSCHICHT BEENDET! ${stars}. ` : `KAPITEL ${ch + 1} JESCHAFFT (${stars}): ${c.title}. `) + $('#resTitle').textContent;
      $('#resTuenn').textContent = c.outro + (c.epilogue ? ' … ' + c.epilogue : '') + (finale ? ' Die Contessa steht im Menü, Jung.' : '');
      againLabel(finale ? 'NOCHMAL VON VORNE' : 'NÄCHSTES KAPITEL');
    } else { careerAgain = ch; $('#resTitle').textContent = `KAPITEL ${ch + 1} NIT JESCHAFFT (ZIEL: ${goalText(c.goal)}). ` + $('#resTitle').textContent; $('#resTuenn').textContent = pick(tuenn.careerLines.fail); againLabel('KAPITEL NOCHMAL'); }
  }
  // KARRIERE: the map of the Nachtschicht, twelve tiles in Session order; any finished chapter can be driven again
  function careerLabel() { const st = careerState(), n = Object.keys(st.done).length, stars = Object.values(st.done).reduce((a, b) => a + starCount(b), 0); return careerOver(st) ? `KARRIERE · ALLE ${CAREER_IDS.length} JESCHAFFT · ${stars}/${CAREER_IDS.length * 3} STÄÄNE` : `KARRIERE · ${n}/${CAREER_IDS.length} JESCHAFFT · ${stars} STÄÄNE`; }
  function openCareerMap() {
    if (phase !== 'menu') return; const st = careerState(), L = tuenn.careerLines, cur = careerIdx(st.cur);
    $('#cmTiles').innerHTML = tuenn.career.map((c, i) => {
      const bits = st.done[c.id] || 0, open = careerOpen(st, i), state = bits ? 'done' : i === cur ? 'cur' : open ? 'open' : 'locked', def = TRACKS.find((t) => t.id === c.track) || TRACKS[0];
      const stars = [1, 2, 4].map((b) => `<i class="${bits & b ? 'on' : ''}"></i>`).join(''), sym = { done: '✓', cur: '▶', open: '▪', locked: '🔒' }[state];
      return `<button class="cmTile ${state}" data-i="${i}" data-id="${c.id}"${open ? '' : ' aria-disabled="true"'}><span class="cmNo">${i + 1}</span><b>${c.title}</b><span class="cmTrack">${def.name.toUpperCase()}${c.type === 'mission' ? ' · BOTENGANG' : ''}</span><span class="cmGoal"><em>ZIEL: </em>${goalText(c.goal)}</span><span class="cmStars" title="${starCount(bits)} vun 3 Stääne">${stars}</span><span class="cmState ${state}">${sym}<em> ${L['map' + state[0].toUpperCase() + state.slice(1)]}</em></span>${bits && c.epilogue ? `<small class="cmEpi">${c.epilogue}</small>` : ''}</button>`;
    }).join('');
    $('#cmTiles').querySelectorAll('.cmTile').forEach((t) => { t.onclick = () => { const i = +t.dataset.i; if (careerOpen(careerState(), i)) { lockLandscape(); startCareer(i); } else { $('#cmNote').textContent = pick(L.mapLockedLine); t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake'); } }; });
    const over = careerOver(st); $('#cmGo').textContent = over ? L.mapAgain : `${L.mapGo} ${cur + 1}: ${tuenn.career[cur].title}`; $('#cmNote').textContent = L.mapLegend;
    $('#careerMap').hidden = false; idleT = 0; try { (document.querySelector('#cmTiles .cmTile.cur') || $('#cmGo')).focus({ preventScroll: false }); } catch (e) { /* ignore */ }
  }
  function closeCareerMap() { $('#careerMap').hidden = true; }

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
    const sw = Math.min(10, Math.max(5, name.length * 0.3)); // long place names get a wider board, not smaller letters
    const sign = W.textPlane(name, '#ffffff', '#c1121f', sw, 1.4, true, { border: '#ffd23f', sizeK: 0.5 }); sign.position.y = 4.0; g.add(sign);
    const back = new THREE.Mesh(new THREE.BoxGeometry(sw, 1.4, 0.08), new THREE.MeshBasicMaterial({ color: 0x3a1018 })); back.position.set(0, 4.0, -0.06); g.add(back); // the back is blank: no mirrored text
    for (const x of [-sw / 2 + 0.3, sw / 2 - 0.3]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6), new THREE.MeshBasicMaterial({ color: 0x555555 })); post.position.set(x, 1.7, -0.06); g.add(post); }
    return g;
  }
  function roadFrameAhead(fromS, dist, clear) { // a flat, ordinary piece of road at least `dist` ahead of fromS; `clear` = no stunt within that many metres
    const S = track.samples, L = track.length, n = S.length; let i = Math.floor(((fromS + dist) % L) / track.ds), tries = 0;
    const okAt = (k) => { const q = S[((k % n) + n) % n]; return ['straight', 'curve', 'bridge'].includes(q.kind) && Math.abs(q.p.y) < 1.5; };
    const clearAt = (k) => { if (!clear) return true; const r = Math.round(clear / track.ds); for (let j = -r; j <= r; j += 4) { const q = S[(((k + j) % n) + n) % n]; if (q.kind === 'loop' || q.kind === 'ramp' || q.kind === 'gap' || q.kind === 'land' || q.kind === 'tunnel' || q.p.y > 3) return false; } return true; };
    while (tries++ < 400 && !(okAt(i) && clearAt(i))) i += 3;
    i %= n; return { s: i * track.ds, f: TB.frameAt(track, i * track.ds) };
  }
  // Kripo lines: the police speak for themselves only when they really speak; the rest is Dä Lange telling it
  function kripoLine(list) { const t = pickNew(list); return [/^(Hier spricht|„)/.test(t) ? KRIPO : tuenn, t]; }
  // Klüngel jobs: the place names come with the right article (dat Büdche, de Pfandleihe, dä Spielclub),
  // and a {what} that ends up at the start of a sentence gets its capital letter
  function placeArticles(text) {
    const g = (name) => D.placeGender(name).g; // the noun list lives in data.js (TUENN.placeGender)
    const NAME = "([A-ZÄÖÜ][A-ZÄÖÜ0-9É&,' -]*[A-ZÄÖÜ0-9É])";
    return text
      .replace(new RegExp('\\b([Zz])um ' + NAME, 'g'), (m, z, n) => z + (g(n) === 'f' ? 'ur ' : g(n) === 'p' ? 'u ' : 'um ') + n) // also 'Zum {drop}' at the start of a sentence
      .replace(new RegExp('\\b(Der|Dä) ' + NAME, 'g'), (m, a, n) => ({ m: 'Dä ', n: 'Dat ', f: 'De ', p: 'De ' })[g(n)] + n)
      .replace(new RegExp('\\bAm ' + NAME, 'g'), (m, n) => (g(n) === 'f' || g(n) === 'p' ? "Bei d'r " : 'Am ') + n)
      .replace(/([.!?:] )([a-zäöü])/g, (m, a, b) => a + b.toUpperCase());
  }
  function startAuftrag() {
    const A = tuenn.auftrag; const what = pick(A.what), where = pick(A.where);
    const a = roadFrameAhead(player.s, 90 + Math.random() * 60), b = roadFrameAhead(a.s, 280 + Math.random() * 220);
    const lat = window.STUNTS_AUFTRAG ? 0 : (Math.random() - 0.5) * 5;
    const m1 = umschlagMesh(); const base = new THREE.Vector3(a.f.p.x, a.f.p.y, a.f.p.z).addScaledVector(new THREE.Vector3(a.f.B.x, a.f.B.y, a.f.B.z), lat).addScaledVector(new THREE.Vector3(a.f.N.x, a.f.N.y, a.f.N.z), 0.5); m1.position.copy(base); scene.add(m1);
    const m2 = dropMesh(where); m2.position.set(b.f.p.x, b.f.p.y + 0.1, b.f.p.z); m2.rotation.y = Math.atan2(-b.f.T.x, -b.f.T.z); m2.visible = false; scene.add(m2);
    let dist = b.s - a.s; if (dist < 0) dist += track.length;
    auftrag = { stage: 'pickup', s1: a.s, lat, s2: b.s, m1, m2, base, what, where, timer: 40, carryTime: Math.round(dist / 13) + 10, phase: Math.random() * 6 };
    sayMust(tuenn, placeArticles(pickNew(A.start).replace('{what}', what).replace('{where}', where)), 4200);
  }
  function endAuftrag() { if (!auftrag) return; scene.remove(auftrag.m1); scene.remove(auftrag.m2); auftrag = null; }
  function failAuftrag(why) {
    const A = tuenn.auftrag; auftragFail++; deckel = Math.max(0, deckel - 2);
    sayMust(tuenn, placeArticles(pickNew(why === 'lost' ? A.lost : A.late).replace('{what}', auftrag.what).replace('{where}', auftrag.where)), 3600);
    beep(220, 0.3, 'sawtooth', 0.12); endAuftrag(); auftragT = 45 + Math.random() * 25;
  }
  function updateAuftrag(dt) {
    const L = track.length;
    if (!auftrag) {
      if (player.finished || kripo || razzia > 0 || careerChapter === 0 || (trackDef && trackDef.theme && trackDef.theme.heist)) return; // the Domschatz-Raub has enough in the boot already
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
        sayMust(tuenn, placeArticles(pickNew(tuenn.auftrag.pick).replace('{where}', auftrag.where)), 3000);
      } else if (auftrag.timer <= 0) { endAuftrag(); auftragT = 40 + Math.random() * 20; }
    } else {
      const k = 1 + Math.sin(raceTime * 5) * 0.08; auftrag.m2.scale.set(k, 1, k);
      let ds = player.s - auftrag.s2; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
      if (!routeFor(player) && Math.abs(ds) < 4 && !player.air && player.crashed <= 0) {
        auftragDone++; addDeckel(5); player.turbo = 1; bumpStat('jobs'); beep(1180, 0.08, 'square', 0.12); setTimeout(() => beep(1580, 0.1, 'square', 0.12), 80); setTimeout(() => beep(2100, 0.16, 'square', 0.12), 160);
        sayMust(tuenn, placeArticles(pickNew(tuenn.auftrag.done).replace('{where}', auftrag.where)), 3800); endAuftrag(); auftragT = 45 + Math.random() * 25;
      } else if (auftrag.timer <= 0) failAuftrag('late');
    }
  }

  // the time of day comes from the scene, not from the player's clock: dawn = morning, dusk = evening, night = night.
  // The real hour is named only when it fits the scene; otherwise an hour that does. The first race opens with it (the attract demo does not count).
  let greeted = 0;
  function sceneHour() {
    const slot = theme.dawn ? 'morning' : theme.dusk || theme.sunset ? 'evening' : theme.night ? 'night' : 'day';
    const h = new Date().getHours(), clock = h >= 22 || h < 5 ? 'night' : h < 10 ? 'morning' : h < 17 ? 'day' : 'evening';
    const hour = theme.elfUhrElf ? 11 : clock === slot ? h : { morning: 6, day: 14, evening: 19, night: 2 }[slot];
    return { slot, hour, dayLines: tuenn.daytime[slot] };
  }
  // the paper's date: era tracks print today's day in their year, the others leave the year out (the paper costs 1 DM)
  const WEEKDAY = ['SONNDACH', 'MONDACH', 'DINSDACH', 'METTWOCH', 'DONNERSDACH', 'FRIDDACH', 'SAMSDACH'];
  function paperDate(now) {
    now = now || new Date(); const d = theme.elfUhrElf ? new Date(now.getFullYear(), 10, 11) : new Date(theme.era || now.getFullYear(), now.getMonth(), now.getDate());
    return `${WEEKDAY[d.getDay()]}, ${d.getDate()}.${d.getMonth() + 1}.${theme.era ? d.getFullYear() : ''}`;
  }
  // ---------------- DÄ SCHNELLE front page: the finish photo as tomorrow's paper ----------------
  function drawFrontPage(headline, place, order) {
    const c = $('#resPaper'); if (!c) return; const W2 = 560, H2 = 400; c.width = W2; c.height = H2; const x = c.getContext('2d');
    x.fillStyle = '#f3ecd8'; x.fillRect(0, 0, W2, H2);
    x.fillStyle = '#e6dcc2'; for (let i = 0; i < 40; i++) x.fillRect(Math.random() * W2, Math.random() * H2, 2, 1);
    x.fillStyle = '#c1121f'; x.fillRect(14, 14, W2 - 28, 54);
    x.fillStyle = '#fff'; x.font = 'bold 40px Impact, "Arial Narrow", sans-serif'; x.textBaseline = 'middle'; x.fillText('DÄ SCHNELLE', 26, 42);
    x.font = '11px "Courier New", monospace'; x.textAlign = 'right'; x.fillText('KÖLNS SCHNELLSTES BLATT · 1 DM', W2 - 24, 32); x.fillText(paperDate(), W2 - 24, 52); x.textAlign = 'left';
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
    { x.fillStyle = '#c1121f'; const q = 'DÄ LANGE: „' + pick(['Ich hann nix jesinn.', 'Kein Kommentar. Kölsch?', 'Dat wor Klüngel, kein Verbreche.', 'Man kennt sich.', 'Ich wor an d\'r Dür. De janze Zick.']) + '“'; let fs = 13; do { x.font = `bold ${fs}px "Courier New", monospace`; fs--; } while (x.measureText(q).width > pw && fs > 8); x.fillText(q, 20, py + ph + 34); } // stays under the photo, clear of the WETTER column
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
    const era = TRACKS.filter((t) => t.theme && t.theme.era); // the crawl tells of the Ringe in 1968: show the Ring at night, not the zoo
    const def = era.length ? era[Math.floor(Math.random() * era.length)] : TRACKS[Math.floor(Math.random() * TRACKS.length)];
    startRace(def, () => { camMode = 3; tvCam = null; });
    document.body.classList.add('demo'); const d = $('#demo'); d.hidden = false;
    const crawl = $('#demoCrawl'); crawl.innerHTML = tuenn.vorspann.map((l, i) => `<p class="${i === 0 || i === tuenn.vorspann.length - 1 ? 'big' : ''}">${l}</p>`).join('');
    crawl.style.animation = 'none'; void crawl.offsetWidth; crawl.style.animation = '';
  }

  function tuennsTelefon() {
    if (!telefon.ready || telefon.active > 0) { sayMust(tuenn, 'Besetzt, Jung. Ich telefonier nur eimol pro Rund.', 2000); return; }
    telefon.ready = false; telefon.active = 6; telefon.used++;
    if (kripo) { endKripo('off'); sayMust(tuenn, pickNew(tuenn.kripo.off), 3500); } else sayMust(tuenn, pickNew(tuenn.tuennsTelefon), 3500);
    beep(660, 0.12, 'triangle', 0.15); setTimeout(() => beep(880, 0.12, 'triangle', 0.15), 150);
    $('#hudTel').textContent = 'BESETZT'; setTimeout(() => { $('#hudTel').textContent = telefon.ready ? telLabel() : 'NÄCHSTE RUND'; }, 6000);
  }
  // ---------------- Chicago am Rhein extras ----------------
  function strokes(n) { let out = ''; for (let i = 0; i < n; i++) out += (i % 5 === 4) ? '/ ' : '|'; return out.trim(); }
  function addDeckel(n) { deckel += n; }
  function deckelTotal(add) { let t = 0; try { t = parseInt(localStorage.getItem('stuntskoelle.deckel') || '0') || 0; } catch (e) { /* ignore */ } t += add; try { localStorage.setItem('stuntskoelle.deckel', String(t)); } catch (e) { /* ignore */ } return t; }
  function deckelRank(total) { let r = tuenn.ranks[0][1]; for (const [min, name] of tuenn.ranks) if (total >= min) r = name; return r; }
  function koelschMesh() {
    const g = new THREE.Group();
    if (kids) { // a red-white bag of Kamelle instead of a glass
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.4), new THREE.MeshBasicMaterial({ color: 0xc1121f })); bag.position.y = 0.45; g.add(bag);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.14, 0.42), new THREE.MeshBasicMaterial({ color: 0xffffff })); band.position.y = 0.55; g.add(band);
      const knot = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.25, 6), new THREE.MeshBasicMaterial({ color: 0xffd400 })); knot.position.y = 0.92; g.add(knot);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffe080, transparent: true, opacity: 0.7 })); halo.rotation.x = Math.PI / 2; halo.position.y = 0.05; g.add(halo);
      return g;
    }
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
    // Kölsch waits in the side streets that are known for it (a Brauhaus on the corner, a Büdchen)
    for (const q of track.shortcuts) for (const k of (window.RouteExtras ? window.RouteExtras.koelsch(q) : [])) {
      const f = window.Shortcuts.frameAt(q, k.d); const mesh = koelschMesh();
      const base = new THREE.Vector3(f.p.x + f.B.x * k.lat, f.p.y + 0.9 + (f.surfaceOffset || 0.1), f.p.z + f.B.z * k.lat);
      mesh.position.copy(base); scene.add(mesh); pickups.push({ route: q.index, d: k.d, lat: k.lat, mesh, base, taken: false, phase: Math.random() * 6 });
    }
  }
  function updatePickups(dt) {
    pickT += dt;
    if (player.lap !== lastLapSeen) { lastLapSeen = player.lap; koelschLap = 0; for (const p of pickups) { p.taken = false; p.mesh.visible = true; } }
    if (promille > 0) { promille -= dt; }
    const L = track.length;
    for (const p of pickups) {
      if (p.taken) continue;
      p.mesh.rotation.y += dt * 2.2; p.mesh.position.y = p.base.y + Math.sin(pickT * 3 + p.phase) * 0.22;
      let ds, onIt;
      if (p.route != null) { const q = routeFor(player); onIt = !!q && q.index === p.route; ds = onIt ? (player.s - q.startS) * q.length / (q.endS - q.startS) - p.d : 99; }
      else { ds = player.s - p.s; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L; onIt = !routeFor(player); }
      if (onIt && Math.abs(ds) < 3.6 && Math.abs(player.lat - p.lat) < 2.0 && !player.air && player.crashed <= 0) {
        p.taken = true; p.mesh.visible = false; koelsch++; koelschLap++; addDeckel(1); player.turbo = Math.min(1, player.turbo + 0.3);
        if (koelschLap >= 5 && promille <= 0 && !promilleDone) { promilleDone = true; promille = 7; addDeckel(3); player.turbo = 1; sayMust(tuenn, pickNew(tuenn.promille), 3200); }
        beep(1180, 0.07, 'square', 0.1); setTimeout(() => beep(1580, 0.1, 'square', 0.1), 70);
        if (msgTimer <= 0.4) say(D.DRIVERS.find((d) => d.id === 'koebes'), pickNew(tuenn.koelschPick), 1600);
      }
    }
  }
  function startKripo() {
    if (raceMode) return; // ZEITFAHREN and STADTRUNDFAHRT: no Kripo
    if (careerChapter === 0 && !mission && !theme.heist) return; // chapter 1 is for learning to drive, not for police chases
    kripoSeen = true; kripoT = 0; kripoHitCool = 3;
    const base = D.CARS.find((c) => c.id === 'special') || D.CARS[0];
    const cdef = Object.assign({}, base, { name: 'Streifewage', color: 0xf4f4f0, stripe: 0x2d6a3a, shape: 'sedan', plate: 'K-3110', top: Math.max(base.top, player.car.top) * 1.08, accel: base.accel * 1.25, grip: Math.max(base.grip, player.car.grip) * 1.15 });
    const mesh = W.buildCar(cdef, theme.night);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.34), new THREE.MeshBasicMaterial({ color: 0x2060ff })); bar.position.set(0, 1.55, -0.2); mesh.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.34), new THREE.MeshBasicMaterial({ color: 0xffffff })); bar2.position.set(0, 1.55, -0.2); bar2.visible = false; mesh.add(bar2);
    const sign = W.textPlane('POLIZEI', '#f4f4f0', '#2d6a3a', 1.4, 0.28, false, { sizeK: 0.6 }); sign.position.set(0.9, 0.75, -0.2); sign.rotation.y = Math.PI / 2; mesh.add(sign);
    const sign2 = sign.clone(); sign2.position.x = -0.9; sign2.rotation.y = -Math.PI / 2; mesh.add(sign2);
    kripo = makeRacer(cdef, mesh, { name: 'Kripo Kölle', skill: 1.05, wobble: 0, lines: {} }, true); kripo.isCop = true; kripo.bar = bar; kripo.bar2 = bar2;
    kripo.s = ((player.s - 75) % track.length + track.length) % track.length; kripo.lat = 0; kripo.v = Math.max(15, player.v * 0.8); kripo.safeS = kripo.s; kripo.turbo = 1;
    scene.add(mesh); sayMust(...kripoLine(tuenn.kripo.start), 3500);
  }
  function copControl(r) {
    const L = track.length; let ds = player.s - r.s; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
    const rq = routeFor(r);
    if (rq) return aiControl(r, 1 / 60); // look ahead in physical branch metres, including cobbles and market obstacles
    if (r.lostT > 0) r.lostT -= 1 / 60;
    if (r.routePlan != null) { const q = track.shortcuts[r.routePlan]; let d = q ? q.startS - r.s : -1; if (d < 0) d += L; if (!q || d > 200 || routeFor(player) == null && d > 60) r.routePlan = null;
      else { const vIn = Math.sqrt(24 * r.car.grip / routeMaxCurv(q)) * 0.85; const steer = steerTo(r, q.side * Math.min(2.4, q.halfWidth - 1.1)); return { gas: r.v < vIn + d * 0.3 ? 1 : 0, brake: r.v > vIn + d * 0.35 ? 0.8 : 0, steer, turbo: 0 }; } }
    const i = Math.floor(((r.s % L) + L) % L / track.ds) % track.samples.length;
    const safe = track.safe[i] * 1.12;
    const target = stuntTarget(r, (ds > 5 ? Math.min(safe, r.car.top) : Math.max(0, Math.abs(player.v) - 1)) * (r.lostT > 0 ? 0.5 : 1), i); // lost you in the Veedel: searching
    const gas = r.v < target ? 1 : 0, brake = r.v > target + 3 ? 0.8 : 0;
    const wantLat = clamp(player.lat, -ROAD_W + 1.2, ROAD_W - 1.2);
    const steer = steerTo(r, wantLat);
    return { gas, brake, steer, turbo: ds > 40 && r.turbo > 0.1 ? 1 : 0 };
  }
  function updateKripo(dt) {
    if (!kripo) return;
    kripoT += dt; kripoHitCool -= dt; sirenT += dt;
    updateRacer(kripo, dt, copControl(kripo)); placeRacer(kripo, dt);
    const blink = Math.floor(kripoT * 5) % 2 === 0; kripo.bar.visible = blink; kripo.bar2.visible = !blink;
    const L = track.length; let ds = player.s - kripo.s; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
    if (sirenT > 0.5) { sirenT = 0; if (Math.abs(ds) < 160) beep(Math.floor(kripoT * 2) % 2 ? 720 : 960, 0.22, 'square', Math.max(0.02, 0.07 - Math.abs(ds) * 0.0003)); }
    const pk = racerFrame(player).kind, sharedRoute = sameRoad(player, kripo) && routeFor(player);
    const collisionDistance = sharedRoute ? ds * sharedRoute.length / (sharedRoute.endS - sharedRoute.startS) : ds;
    if (sameRoad(player, kripo) && kripoHitCool <= 0 && Math.abs(collisionDistance) < 4.8 && Math.abs(player.lat - kripo.lat) < 2.4 && !player.air && !kripo.air && player.crashed <= 0 && kripo.crashed <= 0 && pk !== 'loop' && pk !== 'ramp' && pk !== 'land') {
      kripoHitCool = 2.4; player.damage = Math.min(1, player.damage + 0.14); player.v *= 0.82; player.lat += (player.lat >= kripo.lat ? 1 : -1) * 1.3; kripo.v *= 0.9; crashSound(); shake = 0.6;
      if (player.damage >= 1) { kripoCaught = true; crash(player, 'kripo'); sayMust(...kripoLine(tuenn.kripo.caught), 3000); endKripo('caught'); if (mission) missionEnd(false, 'caught'); return; }
      say(...kripoLine(tuenn.kripo.hit), 2200);
    }
    if (mission) { if (ds < -170 || ds > 170) { kripo.s = ((player.s - 100) % L + L) % L; kripo.lat = 0; kripo.v = Math.max(15, player.v * 0.9); kripo.safeS = kripo.s; kripo.shortcut = -1; kripo.routePlan = null; kripo.prevRoadVy = 0; } }
    else if (kripoT > 55 || ds < -140) endKripo('giveup');
  }
  // the Kripo row tells the truth: how far behind (signed track gap), already past you, or lost in the Veedel (lostT)
  function kripoHud() {
    if (!kripo) return '–'; if (kripo.lostT > 0) return 'ABJEHÄNGT';
    const L = track.length; let ds = player.s - kripo.s; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
    const m = Math.round(ds / 5) * 5; return ds < 0 ? 'VÜR DIR' : isMobile ? `HINTER ${m} M` : `HINTER DIR (${m} M)`; // the phone's HUD slot is narrow: keep the metres, drop the words
  }
  let kripoEndT = -99;
  function endKripo(why) {
    kripoEndT = raceTime;
    if (!kripo) return; scene.remove(kripo.mesh); kripo = null;
    if (why === 'giveup') sayMust(...kripoLine(tuenn.kripo.giveup), 3000);
    if (why === 'lost') bumpStat('veedelEscapes');
    if (why !== 'caught') bumpStat('escapes');
  }
  function offerWette() {
    const cands = racers.filter((r) => r.isAI && r !== player2); if (!cands.length) return;
    const r = pick(cands); wette = { rival: { name: r.driver.name, r }, n: 1 + Math.floor(Math.random() * 3), done: false, won: false };
    sayMust(tuenn, pickNew(tuenn.wette.offer).replace('{r}', r.driver.name).replace('{n}', String(wette.n)), 4200);
  }
  // the sights of a Stadtrundfahrt for the postcard: every place whose story was told, in track order
  function tourSights() { const out = []; for (const st of stories) if (st.told && !PLACE_LINES.has(st.text) && !(kids && DRINK.test(st.text))) { /* the places, not a loop or a Blitzer */ const n = st.wz && WZ[st.wz] ? WZ[st.wz].name : st.tag; if (n && !out.includes(n)) out.push(n); } return out; }
  // racing a named ghost: PAPA SCHLÄT PÄNZ ÖM 0,8 SEKUNDE
  function ghostHeadline() {
    if (!ghostData || !ghostData.name || player2 || player.bestLap == null) return null;
    const me = (savedInitials() || '').trim() || 'DU', g = ghostData.name, d = player.bestLap - ghostData.time, sec = Math.abs(d).toFixed(1).replace('.', ','), unit = 'SEKUNDE';
    if (me === g) return d < 0 ? `DÄ SCHNELLE: ${me} SCHLÄT SINGE EIJENE GEIST ÖM ${sec} ${unit}` : `DÄ SCHNELLE: DÄ GEIST VUN ${g} ES ${sec} ${unit} FLÖCKER`;
    return d < 0 ? `DÄ SCHNELLE: ${me === 'DU' ? 'DU SCHLÄS' : me + ' SCHLÄT'} ${g} ÖM ${sec} ${unit}` : `DÄ SCHNELLE: ${g} SCHLÄT ${me === 'DU' ? 'DICH' : me} ÖM ${sec} ${unit}`;
  }
  function expressHeadline(place, won, record, order) {
    const gh = ghostHeadline(); if (gh) return gh;
    const E = tuenn.express2; const car = D.CARS[sel.car].name.toUpperCase(); const fill = (t) => t.replace('{car}', car).replace('{where}', trackDef.where || 'EN KÖLLE').replace('{track}', trackDef.name.toUpperCase()).replace('{n}', String(knoellchen)).replace('{p}', String(place));
    if (record && won) return fill(E.record);
    if (raceMode === 1 && E.tt) return fill(E.tt); // ZEITFAHREN: nobody to beat but the clock
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
    const box = $('#resCup');
    if (!cup.on) { box.hidden = true; againLabel('NOCHMAL'); return; }
    const rows = Object.entries(cup.pts).sort((a, b) => b[1] - a[1]); const myPos = rows.findIndex((e) => e[0] === 'DU') + 1; const done = cup.i >= TRACKS.length;
    box.hidden = false;
    box.innerHTML = `<b>🍺 KÖLSCH-CUP · ${done ? 'ENDSTAND' : 'NACH ' + cup.i + ' VON ' + TRACKS.length + ' STRECKEN'}</b><table>` + rows.slice(0, 5).map((e, i) => `<tr class="${e[0] === 'DU' ? 'me' : ''}"><td>${i + 1}.</td><td>${e[0]}</td><td>${e[1]} Pkt.</td></tr>`).join('') + (myPos > 5 ? `<tr class="me"><td>${myPos}.</td><td>DU</td><td>${cup.pts.DU || 0} Pkt.</td></tr>` : '') + '</table>';
    againLabel(done ? 'CUP BEENDEN' : `NÄCHSTE STRECKE: ${TRACKS[cup.i].name.toUpperCase()}`);
    if (done) { // Siegerehrung: the top three on Kölsch crates in front of the Brauhaus
      const pod = document.createElement('div'); pod.className = 'podium';
      [1, 0, 2].forEach((k) => { const e = rows[k]; if (!e) return; const d = e[0] === 'DU' ? PLAYABLE[sel.driver] : D.DRIVERS.find((x) => x.name === e[0]); const el = document.createElement('div'); el.className = 'step s' + k; el.innerHTML = `<canvas></canvas><b>${k + 1}.</b><span>${e[0] === 'DU' ? 'DU' : e[0].toUpperCase()}</span><i>${e[1]} PKT.</i>`; pod.appendChild(el); if (d) SP.portrait(d.id, el.querySelector('canvas'), 3); });
      box.appendChild(pod);
    }
    if (done) { const line = myPos === 1 ? pick(tuenn.cup.champion) : myPos <= 3 ? pick(tuenn.cup.podium) : pick(tuenn.cup.loser); $('#resTuenn').textContent = line; try { const wins = parseInt(localStorage.getItem('stuntskoelle.cupwins') || '0') || 0; if (myPos === 1) { bumpStat('cupWins'); const no = checkOrden(); if (no.length) newOrden = newOrden.concat(no); } if (myPos === 1) localStorage.setItem('stuntskoelle.cupwins', String(wins + 1)); } catch (e) { /* ignore */ } }
    else setTimeout(() => { if (phase === 'finished') say(tuenn, pickNew(tuenn.cup.next), 3000); }, 2500);
  }

  // ---------------- replay ----------------
  function recReset() {
    rec.stride = racers.length * REC_F; if (!rec.buf || rec.buf.length < REC_CAP * rec.stride) rec.buf = new Float32Array(REC_CAP * rec.stride);
    rec.n = 0; rec.head = 0; rec.acc = 0; rec.cars = racers.map((r) => r.car && r.car.id);
  }
  const recAt = (i) => ((rec.head + i) % REC_CAP) * rec.stride; // offset of the i-th oldest frame
  const recT = (i) => rec.t[(rec.head + i) % REC_CAP];
  function recordFrame(dt) {
    rec.acc += dt; if (rec.acc < 1 / REC_HZ - 1e-9) return; rec.acc = Math.min(rec.acc - 1 / REC_HZ, 1 / REC_HZ); // keeps the remainder: 20 frames per second, not 17
    if (!rec.buf) recReset();
    const slot = (rec.head + rec.n) % REC_CAP; if (rec.n < REC_CAP) rec.n++; else rec.head = (rec.head + 1) % REC_CAP; // past 30 min the oldest frame goes
    const f = rec.buf, o = slot * rec.stride; rec.t[slot] = raceTime;
    // per racer: distance incl. laps, lateral, height in the air (-999 on the road), steering, crashed, side street, speed, vertical speed, heading
    racers.forEach((r, i) => { const k = o + i * REC_F; f[k] = r.s + r.lap * track.length; f[k + 1] = r.lat; f[k + 2] = r.air ? r.y : -999; f[k + 3] = r.steerVis; f[k + 4] = r.crashed > 0 ? 1 : 0; f[k + 5] = r.shortcut; f[k + 6] = r.v; f[k + 7] = r.vy || 0; f[k + 8] = r.yaw || 0; });
  }
  function buildReplayCams() { // a camera every 90 m, used while the car is 20 m before it to 100 m past it: it must see that stretch
    replay.cams = [];
    for (let s = 40; s < track.length; s += 90) { const f = TB.frameAt(track, s); const side = (Math.floor(s / 90) % 2) ? 1 : -1; const path = [-20, 10, 40, 70, 100].map((d) => onPath(TB.frameAt(track, s + d), 1.2)); replay.cams.push({ s, pos: tvSpot(f, side, 18, [5 + (s % 3) * 3, 11, 17], path) }); }
  }
  function startReplay() {
    if (rec.n < 10) return;
    phase = 'replay'; replay.on = true; document.body.classList.add('replaying'); document.body.classList.remove('resultsOpen'); replay.time = 0; replay.paused = false; replay.speed = 1; replay.camIdx = -1; replay.mode = 0; replay.alt = null; replay.routeKey = null;
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
    if (Math.abs(replay.time - (replay.shown == null ? replay.time : replay.shown)) > 1) { views[0].tv = null; replay.alt = null; } replay.shown = replay.time; // a jump in time: a new TV camera
    const last = recT(rec.n - 1), first = recT(0);
    if (replay.time >= last) { replay.time = last; replay.paused = true; }
    if (replay.time < first) replay.time = first;
    // locate frame
    let lo = 0, hi = rec.n - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (recT(mid) < replay.time) lo = mid + 1; else hi = mid; } const i = Math.max(0, lo - 1), j = Math.min(i + 1, rec.n - 1);
    const F = rec.buf, a = recAt(i), b = recAt(j), u = i === j ? 0 : clamp((replay.time - recT(i)) / Math.max(1e-3, recT(j) - recT(i)), 0, 1);
    racers.forEach((r, k) => {
      const A = a + k * REC_F, B = b + k * REC_F, mix = (q) => F[A + q] + (F[B + q] - F[A + q]) * u;
      const S = mix(0); r.lap = Math.floor(S / track.length); r.s = S - r.lap * track.length;
      r.lat = mix(1); const ya = F[A + 2], yb = F[B + 2]; r.air = ya > -900 && yb > -900; r.y = r.air ? mix(2) : 0; r.vy = r.air ? mix(7) : 0; r.steerVis = F[A + 3]; r.yaw = mix(8); r.crashed = F[A + 4] > 0.5 ? 1 : 0; r.v = mix(6); // the recorded speed, not a fixed 108 km/h
      r.shortcut = playbackRoute(r.s, F[A + 5], F[B + 5]);
      placeRacer(r, dt); if (r.crashed) r.mesh.rotation.z += dt * 6;
    });
    raceTime = replay.time; drawMinimap();
    $('#replayTime').textContent = fmtTime(replay.time) + ' / ' + fmtTime(last); $('#replayBar').style.width = (100 * (replay.time - first) / Math.max(1e-3, last - first)) + '%';
    $('#replayState').textContent = replay.paused ? '❚❚ PAUSE' : replay.speed > 1 ? '▶▶ ' + replay.speed + '×' : '▶ REPLAY';
    $('#speed').textContent = String(Math.round(Math.abs(player.v) * 3.6)).padStart(3, '0');
  }
  function replayCamera(view, r, dt) {
    if (replay.mode !== 0) { updateCameraFor(view, r, dt, replay.mode); return; }
    const route = routeFor(r);
    if (route) {
      // Scenic streets can sit far outside the main-road TV cameras.
      const metres = (r.s - route.startS) * route.length / (route.endS - route.startS);
      const m0 = Math.floor(metres / 60) * 60 + 20, key = r.shortcut + ':' + m0;
      if (replay.routeKey !== key) { replay.routeKey = key; replay.routeCam = tvSpot(window.Shortcuts.frameAt(route, m0), 1, 18, [12, 18, 7], [-20, 0, 20, 40].map((d) => onPath(window.Shortcuts.frameAt(route, m0 + d), 1.2))); }
      replayShot(r, replay.routeCam, 60); return;
    }
    if (racerFrame(r).kind === 'tunnel') { const b = racerFrame(r, r.s - 10); replayShot(r, new THREE.Vector3(b.p.x + b.B.x * r.lat + b.N.x * 3.5, b.p.y + b.N.y * 3.5, b.p.z + b.B.z * r.lat + b.N.z * 3.5), 60); return; } // inside the tube
    // Stunts-style trackside TV: nearest camera the car just passed, looking at the car
    const pos = r.s; let best = replay.camIdx;
    if (best < 0 || replay.cams[best].s > pos + 20 || pos - replay.cams[best].s > 100) { best = 0; for (let i = 0; i < replay.cams.length; i++) if (replay.cams[i].s <= pos + 20) best = i; }
    replay.camIdx = best; replayShot(r, replay.cams[best].pos);
  }
  // look at the car from pos; something in between (a loop's far side, a house the path bends behind): a spare camera
  // beside the car until the line is clear again
  function replayShot(r, pos, fov) {
    const eye = carEye(r.frame);
    if (occHit(eye, pos) >= 0 || (replay.alt && replay.time < replay.altT)) { if (!replay.alt || occHit(eye, replay.alt) >= 0) { const f = racerFrame(r, r.s + 25); replay.alt = tvSpot(f, r.lat >= 0 ? 1 : -1, 16, [6, 11, 17], [eye, onPath(f, 1.2)], r.frame); replay.altT = replay.time + 1.5; } pos = replay.alt; } else replay.alt = null; // the spare stays 1.5 s: a lamp post sweeping through the line is no reason to cut back and forth
    camera.position.copy(pos); camera.up.set(0, 1, 0); camera.lookAt(r.frame.pos);
    camera.fov = fov || clamp(70 - camera.position.distanceTo(r.frame.pos) * 0.35, 28, 70); camera.updateProjectionMatrix();
  }

  // ---------------- ghost of your best lap ----------------
  function playbackRoute(s, a, b) {
    for (const id of [a, b]) { const q = track.shortcuts[id]; if (q && s >= q.startS && s <= q.endS) return id; }
    return -1;
  }
  // the own best-lap ghost of a track (stuntskoelle.ghost.<id>), the named ones (stuntskoelle.ghosts.<id>: { PAP: ghost, … })
  // and which one a track races against (stuntskoelle.ghostPick: { <id>: '' own | name | '-' none })
  function ghostKey() { return `stuntskoelle.ghost.${trackDef.id}`; }
  const readJson = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const ownGhost = (def) => { const g = readJson(`stuntskoelle.ghost.${def.id}`, null); return g && g.t && g.t.length > 10 ? g : null; };
  const namedGhosts = (def) => { const m = readJson(`stuntskoelle.ghosts.${def.id}`, {}); return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; };
  const ghostPick = (def) => { const m = readJson('stuntskoelle.ghostPick', {}); return (m && typeof m[def.id] === 'string') ? m[def.id] : ''; };
  function setGhostPick(def, pk) { const m = readJson('stuntskoelle.ghostPick', {}) || {}; m[def.id] = pk; try { localStorage.setItem('stuntskoelle.ghostPick', JSON.stringify(m)); } catch (e) { /* ignore */ } }
  // the time a ghost passed each checkpoint (from its samples; the line is its lap time)
  function ghostSplits(g) {
    const L = track.length, out = CP.slice(0, 3).map((f) => { const c = f * L; for (let i = 1; i < g.s.length; i++) if (g.s[i - 1] < c && g.s[i] >= c && g.s[i] - g.s[i - 1] < L / 2) return g.t[i - 1] + (g.t[i] - g.t[i - 1]) * (c - g.s[i - 1]) / Math.max(1e-6, g.s[i] - g.s[i - 1]); return null; });
    out.push(g.time); return out;
  }
  function loadGhost() {
    ghostData = null; if (ghost) { scene.remove(ghost); ghost = null; }
    let pk = ghostPick(trackDef); const ch = ghostChoices(trackDef); if (ch.length && !ch.includes(pk)) pk = ch[0]; // as the menu shows it
    if (pk === '-' || raceMode === 2) return; // GEIST: AUS; the Stadtrundfahrt races nobody
    const named = pk ? namedGhosts(trackDef)[pk] : null;
    const ng = named && (named.t ? named : unpackGhost(named)); // stored packed (an older save: the samples)
    ghostData = ng && ng.t && ng.t.length > 10 ? Object.assign({}, ng, { name: pk }) : ownGhost(trackDef);
    if (ghostData && !pk) delete ghostData.name;
    // side streets are stored by number: remap them by their id, so a ghost survives a changed street catalogue;
    // an old ghost without ids that used a side street cannot be trusted any more and is dropped
    if (ghostData && (ghostData.routes || []).some((r) => r != null && r >= 0)) {
      const now = (track.shortcuts || []).map((r) => r.id);
      if (!ghostData.routeIds) ghostData = null;
      else ghostData.routes = ghostData.routes.map((r) => r != null && r >= 0 ? now.indexOf(ghostData.routeIds[r]) : r);
    }
    if (!ghostData) return;
    ghostData.sp = ghostSplits(ghostData);
    const car = D.CARS.find((c) => c.id === ghostData.car) || (player && player.car) || D.CARS[0]; // the car that drove the lap, in ghost colours
    ghost = W.buildCar(Object.assign({}, car, { color: 0xdde6ff, stripe: 0x9fb4ff, plate: ghostData.name ? 'K-' + ghostData.name : 'GEIST' }), false);
    const big = raceMode === 1; // ZEITFAHREN: a big, bright ghost, the only other car on the road
    ghost.traverse((o) => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; const cl = ms.map((m) => { const c = m.clone(); c.transparent = true; c.opacity = big ? 0.6 : 0.35; c.depthWrite = false; return c; }); o.material = Array.isArray(o.material) ? cl : cl[0]; } });
    if (big) ghost.scale.setScalar(1.12);
    scene.add(ghost);
  }
  function updateGhost(ahead) { // ahead: the ghost is drawn between two steps, like the cars
    if (!ghostData || !ghost) return;
    const t = raceTime + (ahead || 0) - player.lapStart; const T = ghostData.t; if (t > T[T.length - 1]) { ghost.visible = false; return; }
    ghost.visible = phase === 'race' && !ghostHidden;
    let lo = 0, hi = T.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (T[mid] < t) lo = mid + 1; else hi = mid; } const i = Math.max(0, lo - 1); const u = clamp((t - T[i]) / Math.max(1e-3, T[i + 1] - T[i]), 0, 1);
    const s = ghostData.s[i] + (ghostData.s[Math.min(i + 1, T.length - 1)] - ghostData.s[i]) * u, lat = ghostData.l[i] + (ghostData.l[Math.min(i + 1, T.length - 1)] - ghostData.l[i]) * u;
    const routes = ghostData.routes || [], route = playbackRoute(s, routes[i], routes[Math.min(i + 1, T.length - 1)]);
    const f = racerFrame({ s, shortcut: route }); const B = new THREE.Vector3(f.B.x, f.B.y, f.B.z), N = new THREE.Vector3(f.N.x, f.N.y, f.N.z), Tt = new THREE.Vector3(f.T.x, f.T.y, f.T.z);
    ghost.position.set(f.p.x, f.p.y, f.p.z).addScaledVector(B, lat).addScaledVector(N, f.surfaceOffset || 0.1);
    const Y = ghostData.y, j = Math.min(i + 1, T.length - 1), ya = Y && Y[i], yb = Y && Y[j];
    if (ya != null && yb != null) { // in the air at the recorded height, nose along the flight
      ghost.position.y = ya + (yb - ya) * u + 0.1; const pitch = clamp(Math.atan2((yb - ya) / Math.max(1e-3, T[j] - T[i]), 25), -0.6, 0.6);
      const fwd = new THREE.Vector3(Tt.x, 0, Tt.z).normalize().applyAxisAngle(B, pitch), up = new THREE.Vector3(0, 1, 0).applyAxisAngle(B, pitch); _m.makeBasis(new THREE.Vector3().crossVectors(up, fwd).normalize(), up, fwd); ghost.quaternion.setFromRotationMatrix(_m); return;
    }
    const right = new THREE.Vector3().crossVectors(N, Tt).normalize(); _m.makeBasis(right, N, Tt); ghost.quaternion.setFromRotationMatrix(_m);
  }
  // the race's best lap out of the recording (the player is racer 0), as a ghost
  function bestLapGhost() {
    if (!player.bestLap || player.laps.length === 0 || rec.n < 10) return null;
    let start = 0; const bestIdx = player.laps.indexOf(player.bestLap); for (let k = 0; k < bestIdx; k++) start += player.laps[k];
    const end = start + player.bestLap; const t = [], sArr = [], l = [], routes = [], y = [];
    for (let i = 0; i < rec.n; i++) { const tt = recT(i); if (tt < start || tt > end) continue; const o = recAt(i), F = rec.buf; t.push(Math.round((tt - start) * 100) / 100); sArr.push(Math.round((F[o] % track.length) * 10) / 10); l.push(Math.round(F[o + 1] * 10) / 10); routes.push(F[o + 5]); y.push(F[o + 2] > -900 ? Math.round(F[o + 2] * 10) / 10 : null); }
    if (t.length < 10) return null;
    return { time: player.bestLap, car: player.car && player.car.id, t, s: sArr, l, y, routes, routeIds: (track.shortcuts || []).map((r) => r.id) };
  }
  let raceGhost = null; // this race's best lap, for GEIST SPEICHERN FÖR …
  function saveGhost() {
    const g = raceGhost = bestLapGhost(); if (!g) return;
    const old = ownGhost(trackDef); if (old && old.time <= g.time + 0.01) return;
    try { localStorage.setItem(ghostKey(), JSON.stringify(g)); } catch (e) { /* ignore */ }
  }
  // GEIST SPEICHERN FÖR …: the race's best lap under three letters, packed small (a lap is a few KB, so eight names fit); a name keeps its faster lap
  function saveNamedGhost(name) {
    const btn = $('#ghostSaveBtn'); if (!raceGhost || !trackDef || trackDef.daily) return false; name = ghostName(name);
    const all = namedGhosts(trackDef), had = all[name];
    if (had && had.time <= raceGhost.time + 0.01) { btn.textContent = `👻 ${name} HÄT SCHON ${fmtTime(had.time)}`; return false; }
    all[name] = packGhost(raceGhost, trackDef.id, name); const names = Object.keys(all).sort((a, b) => all[a].time - all[b].time); for (const k of names.slice(8)) delete all[k]; // eight names per track
    try { localStorage.setItem(`stuntskoelle.ghosts.${trackDef.id}`, JSON.stringify(all)); } catch (e) { btn.textContent = '👻 DO ES KEI PLATZ MIH'; return false; }
    btn.textContent = `👻 JESPEICHERT: ${name}`; btn.disabled = true; return true;
  }
  // a ghost's name: up to three letters of the name entry with at least one letter in it (so it never reads as GEIST: AUS)
  function ghostName(raw) { const n = String(raw || '').toUpperCase().split('').filter((ch) => NE_ABC.includes(ch)).join('').trim().slice(0, 3).trim(); return /[A-ZÄÖÜ]/.test(n) ? n : 'DU'; }
  // a ghost packed small, for the named ghosts and the K4G1 code: 10 samples a second, metres in decimetres as steps, the flights as runs, the side streets as ranges
  function packGhost(g, id, name) {
    const hz = 10, n = Math.floor(g.time * hz) + 1, s = [], l = [], a = [], r = []; let i = 0, ps = 0, run = null, rr = null;
    for (let k = 0; k < n; k++) {
      const t = k / hz; while (i < g.t.length - 2 && g.t[i + 1] < t) i++; const j = Math.min(i + 1, g.t.length - 1), u = clamp((t - g.t[i]) / Math.max(1e-3, g.t[j] - g.t[i]), 0, 1);
      const sv = Math.round((g.s[i] + (g.s[j] - g.s[i]) * u) * 10); s.push(sv - ps); ps = sv; l.push(Math.round((g.l[i] + (g.l[j] - g.l[i]) * u) * 10));
      const ya = g.y && g.y[i], yb = g.y && g.y[j]; if (ya != null && yb != null) { if (!run) a.push(run = [k]); run.push(Math.round((ya + (yb - ya) * u) * 10)); } else run = null;
      const ro = (g.routes || [])[u < 0.5 ? i : j]; const rid = ro != null && ro >= 0 ? ro : -1; if (!rr || rr[2] !== rid) { rr = [k, k, rid]; if (rid >= 0) r.push(rr); } else rr[1] = k;
    }
    return { v: 1, id, name, time: g.time, car: g.car, hz, s, l, a, r, ids: g.routeIds || [] };
  }
  // back to samples; anything broken (a code from elsewhere) gives null
  function unpackGhost(c) {
    if (!c || typeof c !== 'object' || !Array.isArray(c.s) || c.s.length < 10 || !Array.isArray(c.l) || !(+c.hz > 0) || !(+c.time > 0)) return null;
    const hz = +c.hz, t = [], s = [], l = [], y = [], routes = []; let acc = 0;
    c.s.forEach((d, k) => { acc += +d || 0; t.push(Math.round(k / hz * 100) / 100); s.push(acc / 10); l.push((+c.l[k] || 0) / 10); y.push(null); routes.push(-1); });
    for (const run of Array.isArray(c.a) ? c.a : []) if (Array.isArray(run)) for (let k = 1; k < run.length; k++) { const at = (run[0] | 0) + k - 1; if (at >= 0 && at < y.length && isFinite(run[k])) y[at] = run[k] / 10; }
    for (const q of Array.isArray(c.r) ? c.r : []) if (Array.isArray(q)) for (let k = Math.max(0, q[0] | 0); k <= (q[1] | 0) && k < routes.length; k++) routes[k] = q[2] | 0;
    return { time: +c.time, car: String(c.car || ''), t, s, l, y, routes, routeIds: Array.isArray(c.ids) ? c.ids.map(String) : [] };
  }
  // a record ghost as a code (K4G1.…) for the Deckel box, so a lap fits a message
  function exportGhost(def) {
    const g = ownGhost(def); if (!g) return null;
    return 'K4G1.' + btoa(unescape(encodeURIComponent(JSON.stringify(packGhost(g, def.id, ghostName(savedInitials()))))));
  }
  function importGhost(code) {
    let c; try { c = JSON.parse(decodeURIComponent(escape(atob(code.slice(5))))); } catch (e) { return 'Code kaputt. Nochmal kopieren.'; }
    const def = c && allTracks().find((t) => t.id === c.id), g = unpackGhost(c); if (!def || !g) return 'Dä Geist kennt hee kei Streck.';
    const name = ghostName(c.name), all = namedGhosts(def); all[name] = packGhost(g, def.id, name);
    try { localStorage.setItem(`stuntskoelle.ghosts.${def.id}`, JSON.stringify(all)); } catch (e) { return 'Speichern jing nit.'; }
    setGhostPick(def, name); renderMenu();
    return `Dä Geist vun ${name} (${fmtTime(g.time)}) op ${def.name} es do. Em Menü: GEGEN ${name} FAHRE.`;
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
    daily = dailyDef(0); migrateRecords(); sel.track = clamp(sel.track | 0, 0, allTracks().length - 1); sel.car = clamp(sel.car | 0, 0, D.CARS.length - 1); sel.driver = clamp(sel.driver | 0, 0, PLAYABLE.length - 1);
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
    $('#modeBtn').onclick = () => { raceOpts.mode = (raceOpts.mode + 1) % MODES.length; saveRaceOpts(); renderMenu(); };
    $('#lapsBtn').onclick = () => { raceOpts.laps = raceOpts.laps === 3 ? 1 : 3; saveRaceOpts(); renderMenu(); };
    $('#kluengelBtn').onclick = () => { raceOpts.kluengel = !raceOpts.kluengel; saveRaceOpts(); applyRaceOpts(); };
    $('#ghostBtn').onclick = () => { const def = activeTrackDef(), ch = ghostChoices(def); if (!ch.length) return; const i = Math.max(0, ch.indexOf(ghostPick(def))); setGhostPick(def, ch[(i + 1) % ch.length]); applyRaceOpts(); };
    $('#ghostSaveBtn').onclick = ghostSaveAsk;
    $('#ghostExport').onclick = () => { const def = activeTrackDef(), c = exportGhost(def); if (!c) { $('#saveMsg').textContent = `Op ${def.name} häs de noch kei Rund jefahre.`; return; } $('#saveCode').value = c; $('#saveMsg').textContent = `Dä Geist vun ${def.name} als Code. Am andere Jerät ÜBERNEHMEN drücke.`; if (navigator.clipboard) navigator.clipboard.writeText(c).catch(() => {}); };
    $('#easyBtn').onclick = easyGo; $('#moreBtn').onclick = () => setMore(!document.body.classList.contains('menuMore'));
    $('#trackMore').addEventListener('toggle', () => document.body.classList.toggle('trackDetails', $('#trackMore').open));
    keyLabel('#againBtn', 'NOCHMAL', 'ENTER'); keyLabel('#menuBtn', 'MENÜ', 'ESC'); keyLabel('#pauseGo', 'LOSS JONN', 'ENTER'); keyLabel('#pauseRestart', 'NEU STARTE', 'BACKSPACE'); keyLabel('#pauseQuit', 'MENÜ', 'ESC');
    $('#againBtn').onclick = () => { quickAgain = true; if (careerChapter != null) { startCareer(careerAgain); return; } if (missionMode) { startMission(missionDef); return; } if (cup.on) { if (cup.i >= TRACKS.length) { cup.on = false; toMenu(); return; } startRace(TRACKS[cup.i]); } else startRace(); };
    $('#missionBtn').onclick = () => { careerChapter = null; cup.on = false; lockLandscape(); startMission(activeTrackDef()); }; $('#careerBtn').onclick = openCareerMap; $('#cmGo').onclick = () => { lockLandscape(); startCareer(); }; $('#cmClose').onclick = closeCareerMap; $('#hudPrompt').onclick = () => missionAction();
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
    $('#pauseBtn').onclick = () => { if (racing()) setPause(!paused); else toMenu(); };
    $('#resFacts').onclick = () => { if ($('#results').classList.contains('compact')) $('#resFacts').classList.toggle('open'); };
    $('#msg').onclick = () => { const m = $('#msg'); if (!document.body.classList.contains('mobile') || !m.classList.contains('show')) return; if (m.classList.toggle('open')) msgTimer = Math.max(msgTimer, m.classList.contains('tagged') ? 12 : 6); }; // phone: the one-line ticker opens on a tap
    { const mini = document.querySelector('.hudMini'); if (isMobile) mini.title = 'Kaat (tippen: jrößer)'; try { mini.classList.toggle('open', localStorage.getItem('stuntskoelle.minimap') === 'open'); } catch (e) { /* ignore */ } // phone: the map is folded to a thumbnail until tapped
      mini.onclick = () => { if (!document.body.classList.contains('mobile')) return; const on = mini.classList.toggle('open'); try { localStorage.setItem('stuntskoelle.minimap', on ? 'open' : 'folded'); } catch (e) { /* ignore */ } }; }
    $('#pauseGo').onclick = () => setPause(false); $('#pauseRestart').onclick = quickRestart; $('#pauseQuit').onclick = toMenu; $('#pauseGhost').onclick = toggleGhost;
    document.addEventListener('visibilitychange', () => { if (document.hidden && racing() && !demo) setPause(true); }); // phone call, app switch: also in the flyover and the countdown
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
    const applyKids = () => { document.body.classList.toggle('kids', kids); labelBtn($('#kidsBtn'), kids ? 'PÄNZ-MODUS: AN' : 'PÄNZ-MODUS: AUS', kids ? 'Kinder-Modus: an' : 'Kinder-Modus: aus'); const cl = document.querySelector('.coinLine span'); if (cl) cl.textContent = kids ? 'INSERT COIN · 1 KAMELL = 1 CREDIT' : 'INSERT COIN · 1 KÖLSCH = 1 CREDIT'; };
    applyKids(); $('#kidsBtn').onclick = () => { kids = !kids; try { localStorage.setItem('stuntskoelle.kids', kids ? '1' : '0'); } catch (e) { /* ignore */ } applyKids(); };
    // JROSSE SCHRIFT: everything you read gets bigger (menu, messages, HUD, signs, results), for older eyes
    const applyFont = (on) => { document.body.classList.toggle('bigtext', on); labelBtn($('#fontBtn'), on ? 'SCHRIFT: JROSS' : 'SCHRIFT: NORMAL', on ? 'Schrift: groß' : ''); };
    { let on = false; try { on = localStorage.getItem('stuntskoelle.bigtext') === '1'; } catch (e) { /* ignore */ } applyFont(on);
      $('#fontBtn').onclick = () => { on = !on; try { localStorage.setItem('stuntskoelle.bigtext', on ? '1' : '0'); } catch (e) { /* ignore */ } applyFont(on); }; }
    $('#tiltBtn').onclick = toggleTilt; updateTiltUI(); if (!isMobile) $('#tiltBtn').hidden = true;
    // LENKHILFE (AUTO, AN, AUS) and, on touch, DAUMEN: EINS / ZWEI
    applyThumb(); applyLenk(); $('#lenkBtn').onclick = () => setLenk((lenk + 1) % LENK.length); if (!isTouch) $('#thumbBtn').hidden = true;
    $('#thumbBtn').onclick = () => { setThumb(thumb === 1 ? 2 : 1); try { localStorage.setItem('stuntskoelle.controlsSeen', '0'); } catch (e) { /* ignore */ } if (thumb === 1) say(tuenn, tuenn.oneThumb, 3500); }; // the next race shows the controls card for the new mode once
    // GESCHWÄTZ (NORMAL on a desktop, WENIJ on touch until the player picks one) and KÖLSCH-HÜLP
    try { const v = localStorage.getItem('stuntskoelle.chatter'); chat = CHAT.includes(v) ? CHAT.indexOf(v) : isTouch ? 2 : 1; } catch (e) { chat = isTouch ? 2 : 1; }
    applyChat(); $('#chatBtn').onclick = () => setChat((chat + 1) % CHAT.length, true);
    applyHd(); $('#hdBtn').onclick = () => setHd(!hdOn);
    labelBtn($('#editorBtn'), 'KLÜNGEL-BAUKASTEN', 'Streckeneditor'); labelBtn($('#onboardBtn'), 'NEU EN KÖLLE?', 'Neu in Köln?'); $('#onboardBtn').onclick = openOnboard;
    // one plain line per setting: the button's title, and the hint line under the buttons on hover, focus or a tap
    $('#setHint').textContent = isTouch ? 'Tipp op ne Knopp: hee steiht, wat hä mäht.' : 'Met der Muus op ne Knopp: hee steiht, wat hä mäht.';
    for (const id of Object.keys(tuenn.hints || {})) { const b = document.getElementById(id); if (!b) continue; b.title = tuenn.hints[id]; for (const ev of ['mouseenter', 'focus', 'click']) b.addEventListener(ev, () => { $('#setHint').textContent = tuenn.hints[id]; }); }
    $('#obNext').onclick = () => obStep(1); $('#obPrev').onclick = () => obStep(-1); $('#obSkip').onclick = closeOnboard;
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
    document.addEventListener('touchstart', () => { if (paused) return; if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume(); if (phase !== 'menu' && music.wanted && music.el && music.el.paused && !music.muted) musicPlay(); }, { passive: true });
    phase = 'menu';
    juke.fx = $('#lamboFx'); if (juke.fx) { juke.fx.width = 384; juke.fx.height = 48; juke.ctx = juke.fx.getContext('2d'); }
    if ($('#jukeBtn')) $('#jukeBtn').onclick = (e) => { e.stopPropagation(); if (!juke.started && juke.on) jukeStart(); else jukeToggle(); };
    const firstTouch = () => { if (!juke.started) jukeStart(); };
    document.addEventListener('pointerdown', firstTouch, { once: true }); document.addEventListener('keydown', firstTouch, { once: true });
    updateJuke();
    // first start: Dä Lange's door cards. A browser driven by a test harness (navigator.webdriver) skips them unless
    // window.STUNTS_ONBOARD = true; STUNTS_ONBOARD = false hides them for a real browser too
    if (!onboardSeen() && (window.STUNTS_ONBOARD === true || (!navigator.webdriver && window.STUNTS_ONBOARD !== false))) openOnboard();
    requestAnimationFrame(frame);
  }
  // ---------------- settings: GESCHWÄTZ and KÖLSCH-HÜLP ----------------
  function applyChat() { labelBtn($('#chatBtn'), 'GESCHWÄTZ: ' + CHAT[chat], CHAT_HD[chat]); }
  function setChat(i, save) { chat = clamp(i | 0, 0, CHAT.length - 1); if (save) try { localStorage.setItem('stuntskoelle.chatter', CHAT[chat]); } catch (e) { /* ignore */ } applyChat(); }
  function applyHd() { document.body.classList.toggle('hdhelp', hdOn); labelBtn($('#hdBtn'), hdOn ? 'KÖLSCH-HÜLP: AN' : 'KÖLSCH-HÜLP: AUS', hdOn ? 'Hochdeutsch-Hilfe: an' : 'Hochdeutsch-Hilfe: aus'); if (!hdOn) $('#msgHd').hidden = true; $('#pauseKeysHd').hidden = !hdOn || isMobile; }
  function setHd(on) { hdOn = !!on; try { localStorage.setItem('stuntskoelle.hd', hdOn ? '1' : '0'); } catch (e) { /* ignore */ } applyHd(); }
  // ---------------- 'Neu en Kölle?': Dä Lange's four door cards (first start, and NEU EN KÖLLE? in the menu) ----------------
  const onboard = { i: 0, open: false };
  function onboardSeen() { try { return localStorage.getItem('stuntskoelle.onboarded') === '1'; } catch (e) { return true; } }
  function openOnboard() {
    const O = tuenn.onboard; if (!O || phase !== 'menu') return;
    $('#obTitle').innerHTML = `${O.title}<i class="gl">${O.titleHd}</i>`; $('#obHello').textContent = O.hello; $('#obHelloHd').textContent = O.helloHd;
    $('#obCards').innerHTML = O.cards.map((c, i) => { const k = kids && c.tKids, tch = !k && isTouch && c.tTouch;
      return `<section class="obCard" data-i="${i}"><h3><span>${i + 1}/${O.cards.length}</span>${k ? c.titleKids : c.title}<i class="gl">${k ? c.titleKidsHd : c.titleHd}</i></h3><p>${k ? c.tKids : tch ? c.tTouch : c.t}</p><p class="hdl">${k ? c.hdKids : tch ? c.hdTouch : c.hd}</p></section>`; }).join('');
    SP.portrait('langer', $('#obFace'), 4);
    onboard.i = 0; onboard.open = true; idleT = 0; $('#onboard').hidden = false; obShow(); try { $('#obNext').focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  function obShow() {
    const cards = [...document.querySelectorAll('#onboard .obCard')], last = onboard.i >= cards.length - 1;
    cards.forEach((c, i) => c.classList.toggle('on', i === onboard.i)); $('#obDots').textContent = cards.map((c, i) => (i === onboard.i ? '■' : '□')).join(' ');
    $('#obPrev').disabled = onboard.i === 0; $('#obNext').querySelector('span').textContent = last ? 'LOSS JONN ▶' : 'WIGGER ▶'; $('#obNext').querySelector('i').textContent = last ? 'los geht’s' : 'weiter';
  }
  function obStep(d) { const n = document.querySelectorAll('#onboard .obCard').length; if (onboard.i + d >= n) { closeOnboard(); return; } onboard.i = clamp(onboard.i + d, 0, n - 1); obShow(); }
  function closeOnboard() { if (!onboard.open && $('#onboard').hidden) return; onboard.open = false; $('#onboard').hidden = true; try { localStorage.setItem('stuntskoelle.onboarded', '1'); } catch (e) { /* ignore */ } }
  function drawBanner() {
    SP.logo($('#logo'), 560, 140);
    SP.skyline($('#skyline'), Math.max(600, window.innerWidth), 150);
    SP.portrait('langer', $('#langerFace'), 5);
    SP.portrait('langer', $('#langerFace2'), 4);
    SP.portrait('langer', $('#resFace'), 5); if ($('#loadingFace')) SP.portrait('langer', $('#loadingFace'), 6);
    if ($('#rotateArt')) SP.carSide(D.CARS[0], $('#rotateArt'));
    // arcade cabinet pixel art: button icons, joystick and buttons, blinking coin, chunky frames
    $('#cupBtn').textContent = `KÖLSCH-CUP (${TRACKS.length} STRECKEN)`; $('#careerBtn').textContent = careerLabel();
    for (const b of document.querySelectorAll('#menu button[data-icon]')) { const gl = b.querySelector('.gl'); labelBtn(b, gl ? b.dataset.label : b.textContent.trim(), gl ? b.dataset.gloss : ''); } // a glossed label keeps its Hochdeutsch word
    if ($('#joyArt')) { SP.joystick($('#joyArt'), 2); SP.joystick($('#joyArt2'), 2); }
    if ($('#coinArt')) { SP.icon('coin', $('#coinArt'), 1); SP.icon('coin', $('#coinArt2'), 1); let on = true; setInterval(() => { on = !on; for (const id of ['#coinArt', '#coinArt2']) { const c = $(id); if (c) c.style.visibility = on ? 'visible' : 'hidden'; } }, 500); }
    if (SP.frameTile) { const tile = SP.frameTile([106, 63, 160]); for (const pnl of document.querySelectorAll('#menu .panel')) { pnl.style.borderImage = `url(${tile}) 8 repeat`; pnl.style.borderWidth = '8px'; pnl.style.borderStyle = 'solid'; } }
  }
  window.STUNTS_STATS = () => renderer && { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries };
  window.STUNTS_PROPS = () => scenery ? scenery.props.map((p) => ({ type: p.userData.type, wz: p.userData.wz || '', story: !!p.userData.story, parent: !!p.parent, x: p.position.x, y: p.position.y, z: p.position.z, rot: p.rotation.y })) : [];
  window.STUNTS_MISSION = (t) => startMission(t != null ? allTracks()[t] : activeTrackDef()); window.STUNTS_CAREER = startCareer; window.STUNTS_CAREER_STATE = careerState; window.STUNTS_ACT = missionAction;
  window.STUNTS_TELEPORT = (s, v, lat) => { if (player) { player.s = s; player.v = v || 0; player.lat = lat || 0; player.safeS = s; player.shortcut = -1; player.air = false; player.vy = 0; player.prevRoadVy = 0; player.crashed = 0; player.jumpLive = null; player.yaw = 0; player.steerIn = 0; player.zoneLeft = null; player.airLat = 0; placeRacer(player, 1); } };
  window.STUNTS_WALK = (x, z) => { if (mission && mission.walker) { mission.walker.position.x = x; mission.walker.position.z = z; } }; window.STUNTS_MISSION_STATE = () => mission && { stage: mission.stage, pickS: mission.pickS, dropS: mission.dropS, timer: Math.round(mission.timer), door: mission.doorPos && [mission.doorPos.x, mission.doorPos.z], car: player.mesh.position.toArray().map(Math.round), walker: mission.walker && mission.walker.position.toArray().map((v) => Math.round(v)) };
  window.STUNTS_DAILY = dailyDef; window.STUNTS_CUP_END = () => { cup.on = true; cup.i = TRACKS.length - 1; cup.pts = { DU: 80, 'Klüngel Tom': 76, 'Schäl': 70, 'Tünnes': 60 }; }; window.STUNTS_ORDEN = () => ({ stats: getStats(), orden: getOrden() });
  window.STUNTS_KOELSCH = koelschify; window.STUNTS_DRUNK = drunkify;
  window.STUNTS_DEBUG = () => ({ phase, paused, countdown, input: Object.assign({}, input), auftrag: auftrag && { stage: auftrag.stage, timer: Math.round(auftrag.timer), s1: Math.round(auftrag.s1), s2: Math.round(auftrag.s2), where: auftrag.where }, auftragDone, auftragFail, deckel, player: player && { pos: player.frame && [player.frame.pos.x, player.frame.pos.y, player.frame.pos.z], fwd: player.frame && [player.frame.fwd.x, player.frame.fwd.z], s: player.s, lat: player.lat, v: player.v, lap: player.lap, shortcut: player.shortcut, air: player.air, crashed: player.crashed, finished: player.finished, turbo: player.turbo, damage: player.damage, y: player.y, vy: player.vy, lastCrash: player.lastCrash, onVerge: !!player.onVerge, vMax: player.vMax || 0, laps: player.laps.slice(), jumps: (player.jumps || []).slice(), yaw: player.yaw, steerIn: player.steerIn, assist: player.assist, hardLandings: player.hardLandings || 0 }, racers: racers.length, raceTime, trackLen: track && track.length, standings: racers.length ? standings().map((r) => r.name) : [] });
  window.STUNTS_RACERS_RAW = () => racers; // the live racer objects (debugging)
  window.STUNTS_AI_CTL = () => player && aiControl(player, SIM_DT); // what the autopilot would do now (a test adds its own noise)
  window.STUNTS_STUNTS = () => ({ ms: stuntMs, list: stunts.map((t) => Object.assign({ kind: t.kind, s: t.s, len: t.len }, player ? stuntSpeeds(t, player.car, player.assist) : {})) }); // entry speeds in m/s for the player's car
  window.STUNTS_LENK = (m) => { if (m != null) setLenk(typeof m === 'string' ? LENK.indexOf(m) : m); return { mode: LENK[lenk], on: !!(player && player.assist) }; };
  window.STUNTS_THUMB = (n) => { if (n != null) setThumb(n); return { thumb, one: oneThumb(), steer: strip.steer, gas: input.gas }; };
  window.STUNTS_ROUTES = () => track ? track.shortcuts.map(({ samples, ...r }) => r) : [];
  window.STUNTS_DRIVE_STEPS = (n, ctl) => { for (let i = 0; i < Math.min(n, 6000) * 2; i++) { raceTime = ++raceTicks * SIM_DT; if (nitroTap > 0) nitroTap -= SIM_DT; if (!ctl && oneThumb()) readKeys(); updateRacer(player, SIM_DT, ctl || (window.STUNTS_AUTOPILOT ? aiControl(player, SIM_DT) : input)); placeRacer(player, SIM_DT); recordFrame(SIM_DT); } updateHUD(); return window.STUNTS_DEBUG(); }; // n steps of 1/60 s, each as two fixed steps
  window.STUNTS_REPLAY_AT = (t) => { startReplay(); replay.time = t; replay.paused = true; replayStep(0); return window.STUNTS_DEBUG(); };
  // cameras and the recorder: n frames of driving with the camera following (no render), a replay at t with `settle` frames of run-up in replay camera mode m,
  // the recorded frame nearest to t (the player), the ghost placed at lap time t, the camera itself and the size of the line-of-sight layer
  window.STUNTS_CAM_STEPS = (n) => { for (let i = 0; i < n; i++) { window.STUNTS_DRIVE_STEPS(1); updateCamera(1 / 60); } return { pos: camera.position.toArray(), mode: camMode }; };
  window.STUNTS_REPLAY_CAM = (t, m, settle) => { if (phase !== 'replay') startReplay(); replay.mode = m || 0; replay.paused = false; replay.speed = 1; replay.time = Math.max(0, t - (settle || 0) / 60); replayStep(0); for (let i = 0; i < (settle || 0); i++) { replayStep(1 / 60); updateCamera(1 / 60); } replay.paused = true; replayStep(0); updateCamera(1 / 60); return { time: replay.time, pos: camera.position.toArray(), speedo: $('#speed').textContent, label: $('#replayTime').textContent }; };
  window.STUNTS_REC = (t) => { if (!rec.n) return null; let i = 0; for (let k = 1; k < rec.n; k++) if (Math.abs(recT(k) - t) < Math.abs(recT(i) - t)) i = k; const o = recAt(i); return { t: recT(i), v: rec.buf[o + 6], y: rec.buf[o + 2] > -900 ? rec.buf[o + 2] : null, n: rec.n, first: recT(0), last: recT(rec.n - 1), cars: rec.cars.slice() }; };
  window.STUNTS_GHOST = (t) => { if (!ghost) return null; if (t != null) updateGhost(t - (raceTime - player.lapStart)); return { pos: ghost.position.toArray(), visible: ghost.visible, n: ghostData.t.length, time: ghostData.time, car: ghostData.car, name: ghostData.name || '', opacity: (() => { let o = null; ghost.traverse((m) => { if (o == null && m.isMesh) o = (Array.isArray(m.material) ? m.material[0] : m.material).opacity; }); return o; })() }; };
  window.STUNTS_CAM = () => camera; window.STUNTS_OCC = (a, b) => a ? occHit(new THREE.Vector3(...a), new THREE.Vector3(...b)) : { boxes: occ.n, cells: occ.cells.size }; /* with two points: the layer's first hit on that line */ window.STUNTS_STATIC = () => [road, scenery && scenery.group].filter(Boolean);
  window.STUNTS_SET_CAM = (m) => { camMode = m; };
  // the message box: every line shown this race, the chatter setting (VILL / NORMAL / WENIJ or 0-2), the Hochdeutsch help, the place stories and the journal
  window.STUNTS_MSGLOG = () => msgLog.slice(); window.STUNTS_CHAT = (m) => { if (m != null) setChat(typeof m === 'string' ? CHAT.indexOf(m) : m, false); return CHAT[chat]; };
  window.STUNTS_HD = (on) => { if (on != null) setHd(on); return hdOn; }; window.STUNTS_JOURNAL = () => heardStories();
  window.STUNTS_STORIES = () => stories.map((st) => ({ s: st.s, text: st.text, hd: st.hd, tag: st.tag, told: st.told, logged: !!st.logged, wz: st.wz, type: st.prop ? st.prop.userData.type : '', at: st.prop ? st.prop.userData.at * track.length : null, x: st.prop ? st.prop.position.x : null, z: st.prop ? st.prop.position.z : null, placed: !!(st.prop && st.prop.parent) }));
  window.STUNTS_LANDMARK_TAG = () => lmTag && { name: lmTag.name, wz: lmTag.wz, t: lmTag.t, on: lmTag.on, x: lmTag.x, y: lmTag.y, anchor: lmTag.anchor.toArray() }; window.STUNTS_WAHRZEICHEN = () => wzFound(); // the tag over a told landmark, the album
  window.STUNTS_AUDIO = () => ({ state: audio.ctx ? audio.ctx.state : 'none', engine: audio.gain ? audio.gain.gain.value : 0, chip: music.chip ? music.chip.g.gain.value : null, song: music.el ? !music.el.paused : false, paused });
  window.STUNTS_CAR_SCREEN = () => { if (!player || !player.mesh || !camera) return null; const v = player.mesh.position.clone().project(camera); return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight, mode: camMode }; }; // where the player's car is drawn, in CSS pixels
  window.STUNTS_SCENE = () => scene; window.STUNTS_SAY = (text, ms, must) => { quiet = 0; msgTimer = 0; return say(tuenn, text, ms || 3000, !!must); }; // a flavour line, as the radio or a rival would say it (must: a line the player needs)
  window.STUNTS_RAZZIA = () => { razzia = 8; razziaBlink = 0; sayMust(tuenn, pickNew(tuenn.razzia), 3500); };
  window.STUNTS_PROMILLE = () => { promille = 7; sayMust(tuenn, pickNew(tuenn.promille), 3200); };
  window.STUNTS_EXTRAS = () => ({ tilt: { mode: tilt.mode, raw: tilt.raw, zero: tilt.zero, val: tilt.val, steer: input.steer }, razzia, promille, koelschLap, deckel, koelsch, knoellchen, kripo: !!kripo, kripoSeen, kripoCaught, wette: wette && { rival: wette.rival.name, n: wette.n, done: wette.done, won: wette.won }, taken: pickups.filter((p) => p.taken).length, pickups: pickups.length, crashes, cup: { on: cup.on, i: cup.i, pts: cup.pts } });
  window.STUNTS_FRAME = (sPos) => { const f = TB.frameAt(track, sPos); return { p: [f.p.x, f.p.y, f.p.z], T: [f.T.x, f.T.y, f.T.z], N: [f.N.x, f.N.y, f.N.z], len: track.length, kind: f.kind, verge: (track.samples[f.index].vg || []).slice(), edge: ROAD_W + 1.6 }; };
  window.STUNTS_FIELD = () => racers.map((r) => ({ name: r.name, s: r.s, lap: r.lap, v: r.v, crashed: r.crashed > 0, air: r.air, ai: r.isAI, finished: !!r.finished, damage: r.damage, shortcut: r.shortcut, route: r.shortcut, plan: r.isCop ? r.routePlan : r.branchPlan, routeId: routeFor(r) ? routeFor(r).id : null, branchPlan: r.branchPlan, band: r.band, lastCrash: r.lastCrash || '', hard: r.hardLandings || 0 }));
  window.STUNTS_FIELD_SETUP = (s, v) => { racers.forEach((r, i) => { r.s = r.isAI ? s - i * 7 : 6; r.v = r.isAI ? v : 0; r.lat = 0; r.shortcut = -1; r.branchPlan = -1; r.routePlan = null; r.branchKey = ''; r.safeS = r.s; r.air = false; r.vy = 0; r.prevRoadVy = 0; r.crashed = 0; r.finished = false; r.yaw = 0; r.steerIn = 0; r.zoneLeft = null; placeRacer(r, 1); }); return window.STUNTS_FIELD(); };
  window.STUNTS_FIELD_STEPS = (n) => { for (let i = 0; i < Math.min(n, 6000) * 2; i++) { raceTime = ++raceTicks * SIM_DT; for (const r of racers) if (r.isAI && !r.finished) { updateRacer(r, SIM_DT, aiControl(r, SIM_DT)); placeRacer(r, SIM_DT); } for (let a = 0; a < racers.length; a++) for (let b = a + 1; b < racers.length; b++) collide(racers[a], racers[b], SIM_DT); } return window.STUNTS_FIELD(); };
  window.STUNTS_NEAR = (r) => { const out = []; const pp = player.frame.pos; scene.traverse((o) => { if (!o.isMesh) return; const wp = new THREE.Vector3(); o.getWorldPosition(wp); if (wp.distanceTo(pp) < r) { const m = Array.isArray(o.material) ? o.material[0] : o.material; out.push({ d: Math.round(wp.distanceTo(pp)), col: m.color ? m.color.getHexString() : '-', parent: o.parent && o.parent.userData && o.parent.userData.type, vc: !!m.vertexColors, n: o.geometry.attributes.position.count }); } }); return out.slice(0, 40); };
  window.STUNTS_KOELSCH = koelschify; window.STUNTS_DRUNK = drunkify;
  // race modes and ghosts: set MODUS / RUNDEN / KLÜNGEL (any left out stays), the split times of this race, the ghosts of a track
  window.STUNTS_MODE = (mode, laps, kluengel) => { if (mode != null) raceOpts.mode = typeof mode === 'string' ? Math.max(0, MODES.indexOf(mode)) : clamp(mode | 0, 0, 2); if (laps != null) raceOpts.laps = laps === 1 ? 1 : 3; if (kluengel != null) raceOpts.kluengel = !!kluengel; saveRaceOpts(); if (phase === 'menu') renderMenu(); return { mode: MODES[raceOpts.mode], laps: raceOpts.laps, kluengel: raceOpts.kluengel, raceMode: MODES[raceMode], raceLaps, blitzers: blitzers.length, signals: signals.length, kripo: !!kripo, kripoSeen, auftrag: !!auftrag, razzia, walkersShown: scenery ? (() => { let n = 0; scenery.group.traverse((o) => { if (o.userData.walker && o.visible) n++; }); return n; })() : null, racers: racers.length }; };
  window.STUNTS_SPLITS = () => ({ log: splitLog.slice(), hud: $('#hudSplit').textContent, ref: player && splitRef(), ghost: ghostData && { name: ghostData.name || '', time: ghostData.time, car: ghostData.car, sp: ghostData.sp } });
  window.STUNTS_GHOSTS = (id) => { const def = allTracks().find((t) => t.id === id) || activeTrackDef(); return { own: !!ownGhost(def), named: Object.keys(namedGhosts(def)), pick: ghostPick(def), choices: ghostChoices(def), code: (exportGhost(def) || '').length }; };
  window.STUNTS_EXPORT_GHOST = (id) => exportGhost(allTracks().find((t) => t.id === id) || activeTrackDef()); window.STUNTS_IMPORT = (code) => importSave(code);
  window.STUNTS_FINISH = () => { for (const r of [player, player2]) if (r) { r.shortcut = -1; r.lap = raceLaps; r.s = track.length - 3; r.v = 30; } };
  if (typeof THREE === 'undefined') {
    document.body.innerHTML = '<div style="color:#fff;font:20px sans-serif;padding:40px">Three.js konnte nicht geladen werden. Dä Lange sagt: Internet anmachen, Jung.</div>';
  } else {
    init();
  }
})();
