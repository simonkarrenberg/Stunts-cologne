/* ============================================================
   STUNTS KÖLLE 4D — Game: physics, AI, camera, HUD, audio, UI
   ============================================================ */
(function () {
  'use strict';
  const TB = window.TrackBuilder, W = window.World, D = window.GameData;
  const $ = (s) => document.querySelector(s);
  const ROAD_W = W.ROAD_W;
  const G = 9.81;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtTime = (t) => { if (t == null || !isFinite(t)) return '--:--.--'; const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s.toFixed(2).padStart(5, '0')}`; };

  // ---------------- state ----------------
  const sel = { track: 0, car: 0, rival: 0 };
  let renderer, scene, camera, track, theme, road, scenery, confetti, sunLight, hemi, carLight, post, pixelScale = 3;
  let player, rival, raceTime = 0, countdown = 0, phase = 'menu'; // menu | countdown | race | finished
  let camMode = 0, camPos = new THREE.Vector3(), camUp = new THREE.Vector3(0, 1, 0), camLook = new THREE.Vector3();
  let lastT = 0, msgTimer = 0, tvCam = null, tvTimer = 0;
  const input = { gas: 0, brake: 0, steer: 0 };
  const keys = {};

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
  function audioEngine(v, gas) {
    if (!audio.ctx) return;
    const rpm = 40 + v * 4.2 + gas * 12;
    audio.engine[0].frequency.setTargetAtTime(rpm, audio.ctx.currentTime, 0.05);
    audio.engine[1].frequency.setTargetAtTime(rpm * 0.5, audio.ctx.currentTime, 0.05);
    audio.filter.frequency.setTargetAtTime(300 + v * 20, audio.ctx.currentTime, 0.1);
    const target = (audio.muted || phase === 'menu') ? 0 : 0.05 + gas * 0.04 + Math.min(0.06, v * 0.001);
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
  function fanfare(win) {
    const notes = win ? [523, 659, 784, 1047] : [392, 349, 311, 262];
    notes.forEach((f, i) => setTimeout(() => beep(f, 0.35, 'triangle', 0.2), i * 180));
  }

  // ---------------- messages ----------------
  function say(who, text, ms) {
    const box = $('#msg');
    $('#msgWho').textContent = `${who.emoji} ${who.name}`;
    $('#msgText').textContent = text;
    box.classList.add('show');
    msgTimer = (ms || 3500) / 1000;
  }
  const tuenn = D.TUENN;

  // ---------------- car state ----------------
  function makeRacer(carDef, mesh, isAI, rivalDef) {
    return {
      car: carDef, mesh, isAI, rival: rivalDef || { skill: 0.95, wobble: 0.1 },
      s: 0, lat: isAI ? 3 : -3, v: 0, air: false, y: 0, vy: 0, lap: 1, safeS: 0, crashed: 0,
      finished: false, finishTime: null, laps: [], lapStart: 0, prevRoadVy: 0, wasInLoop: false, loopMax: 0,
      steerVis: 0, pitchVis: 0, aiTimer: 0, aiSlow: 1, jumpStartS: 0, bestLap: null, wobblePhase: Math.random() * 10
    };
  }

  function respawn(r) {
    r.s = ((r.safeS - 18) % track.length + track.length) % track.length;
    r.lat = 0; r.v = 0; r.air = false; r.vy = 0; r.crashed = 0; r.prevRoadVy = 0;
  }

  function crash(r, kind) {
    if (r.crashed > 0) return;
    r.crashed = 2.2; r.v = 0; r.air = false;
    if (!r.isAI) {
      crashSound();
      const quotes = kind === 'water' ? tuenn.water : kind === 'loop' ? tuenn.loopFall : tuenn.crash;
      say(tuenn, pick(quotes), 3000);
      if (Math.random() < 0.5) setTimeout(() => { if (phase === 'race') say(rival.rival, pick(rival.rival.lines.crash), 2500); }, 3200);
      shake = 1;
    }
  }
  let shake = 0;

  function updateRacer(r, dt, ctl) {
    const car = r.car;
    if (r.crashed > 0) {
      r.crashed -= dt;
      if (r.crashed <= 0) respawn(r);
      return;
    }
    const f = TB.frameAt(track, r.s);
    const roadY = f.p.y;
    if (!r.air) {
      // longitudinal
      const slope = f.T.y;
      let a = ctl.gas * car.accel - ctl.brake * (r.v > 0.5 ? car.brake : -car.accel * 0.4) - G * slope * 0.9;
      a -= r.v * Math.abs(r.v) * 0.004 + (ctl.gas > 0 ? 0 : 0.8) * Math.sign(r.v);
      r.v += a * dt;
      r.v = clamp(r.v, -8, car.top * (1.0 + (slope < 0 ? 0.15 : 0)));
      // lateral
      // outward slide once the needed centripetal acceleration exceeds the tyre grip
      const bankAssist = Math.min(1, Math.abs(f.roll) / (25 * Math.PI / 180)) * 0.6;
      const gripAcc = 24 * car.grip * (1 + bankAssist);
      const need = f.curv * r.v * Math.abs(r.v);
      const centrifugal = Math.sign(need) * Math.max(0, Math.abs(need) - gripAcc) * 0.28;
      const steerV = ctl.steer * car.steer * (2.5 + 0.16 * Math.abs(r.v));
      r.lat += (steerV + centrifugal) * dt;
      if (Math.abs(r.lat) > ROAD_W + 1.6) {
        if (r.isAI) { r.lat = clamp(r.lat, -ROAD_W, ROAD_W); r.v *= 0.6; }
        else { crash(r, 'off'); return; }
      }
      // loop: need speed when upside down
      if (f.kind === 'loop') {
        r.wasInLoop = true;
        if (f.N.y < 0.2 && r.v < 21) { crash(r, 'loop'); return; }
      } else if (r.wasInLoop) {
        r.wasInLoop = false;
        if (!r.isAI) say(tuenn, pick(tuenn.loopOk), 2500);
      }
      // move
      r.s += r.v * dt;
      const f2 = TB.frameAt(track, r.s);
      // ramp -> gap: take off
      if (f2.kind === 'gap' && f.kind !== 'gap') {
        const a0 = f.rampAngle;
        r.air = true; r.y = f.p.y + 0.1; r.vy = r.v * Math.sin(a0) + 0.5;
        r.v = Math.max(r.v * Math.cos(a0), 4);
        r.jumpStartS = r.s;
      } else if (f2.kind === 'gap') {
        // rolled into the gap without speed: fall
        r.air = true; r.y = roadY; r.vy = 0;
      } else {
        // road falling away faster than gravity -> airborne (hill crests)
        const roadVy = r.v * f2.T.y;
        if (r.prevRoadVy - roadVy > G * dt * 1.3 && r.v > 25 && f2.kind !== 'loop') {
          r.air = true; r.y = f2.p.y; r.vy = r.prevRoadVy;
        }
        r.prevRoadVy = roadVy;
      }
      // safe point
      if (!r.air && Math.abs(r.lat) < ROAD_W && (f.kind === 'straight' || f.kind === 'bridge' || f.kind === 'tunnel' || f.kind === 'curve' || f.kind === 'hill' || f.kind === 'dip') && f.N.y > 0.9) r.safeS = r.s;
    } else {
      // airborne
      r.s += r.v * dt;
      r.lat += ctl.steer * car.steer * 1.5 * dt;
      r.y += r.vy * dt; r.vy -= G * dt;
      const f2 = TB.frameAt(track, r.s);
      const ry = f2.p.y;
      if (f2.kind === 'gap') {
        if (r.y < W.WATER_Y + 0.4) { crash(r, 'water'); return; }
      } else if (r.y <= ry + 0.12) {
        r.air = false; r.y = ry; r.prevRoadVy = r.v * f2.T.y;
        if (Math.abs(r.lat) > ROAD_W + 1.6) { if (r.isAI) r.lat = clamp(r.lat, -ROAD_W, ROAD_W); else { crash(r, 'off'); return; } }
        if (r.vy < -22) r.v *= 0.55; else if (r.vy < -14) r.v *= 0.8;
        if (!r.isAI && r.s - r.jumpStartS > 20 && r.jumpStartS > 0) { say(tuenn, pick(tuenn.jumpOk), 2500); r.jumpStartS = 0; }
        r.vy = 0;
      }
      if (r.y - ry > 60) { crash(r, 'off'); return; }
    }
    // laps
    if (r.s >= track.length) {
      r.s -= track.length; r.safeS = Math.max(0, r.safeS - track.length);
      const lapTime = raceTime - r.lapStart; r.lapStart = raceTime; r.laps.push(lapTime);
      if (r.bestLap == null || lapTime < r.bestLap) r.bestLap = lapTime;
      r.lap++;
      if (r.lap > track.def.laps) { r.finished = true; r.finishTime = raceTime; r.lap = track.def.laps; }
      else if (!r.isAI) say(tuenn, tuenn.lap[Math.min(tuenn.lap.length - 1, r.lap - 2 + (r.lap === track.def.laps ? 1 : 0))], 2500);
    }
    r.steerVis += (ctl.steer - r.steerVis) * Math.min(1, dt * 10);
  }

  function aiControl(r, dt) {
    const rv = r.rival;
    r.aiTimer -= dt;
    if (r.aiTimer <= 0) { r.aiTimer = 4 + Math.random() * 8; r.aiSlow = Math.random() < rv.wobble * 0.6 ? 0.55 + Math.random() * 0.3 : 1; }
    const i = Math.floor(((r.s % track.length) + track.length) % track.length / track.ds) % track.samples.length;
    const target = Math.min(r.car.top * rv.skill * 1.05, track.safe[i] * (0.9 + rv.skill * 0.2)) * (r.aiSlow < 1 ? r.aiSlow : 1);
    const gas = r.v < target ? 1 : 0, brake = r.v > target + 3 ? 0.8 : 0;
    const wantLat = Math.sin(raceTime * 0.7 + r.wobblePhase) * rv.wobble * 2.5;
    let steer = clamp((wantLat - r.lat) * 0.35, -1, 1);
    // resist centrifugal push
    const f = TB.frameAt(track, r.s);
    const need = f.curv * r.v * r.v, gripAcc = 24 * r.car.grip;
    const slide = Math.sign(need) * Math.max(0, Math.abs(need) - gripAcc) * 0.28;
    steer -= clamp(slide / (2.5 + 0.16 * r.v), -1, 1);
    return { gas, brake, steer: clamp(steer, -1, 1) };
  }

  // ---------------- collisions ----------------
  function collide(a, b) {
    if (a.crashed > 0 || b.crashed > 0 || a.air !== b.air) return;
    let ds = a.s - b.s; const L = track.length;
    if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L;
    const dl = a.lat - b.lat;
    if (Math.abs(ds) < 4.6 && Math.abs(dl) < 2.3) {
      const push = (dl >= 0 ? 1 : -1) * 4;
      a.lat += push * 0.05; b.lat -= push * 0.05;
      if (Math.abs(ds) < 2.5) { // side by side
        a.lat += push * 0.08; b.lat -= push * 0.08;
      } else if (ds > 0) { // a is ahead, b rams
        const vb = b.v; b.v = Math.min(b.v, a.v * 0.95); a.v = Math.max(a.v, vb * 0.9);
      } else {
        const va = a.v; a.v = Math.min(a.v, b.v * 0.95); b.v = Math.max(b.v, va * 0.9);
      }
      beep(90, 0.08, 'sawtooth', 0.08);
    }
  }

  // ---------------- placing meshes ----------------
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
  function placeRacer(r, dt) {
    const f = TB.frameAt(track, r.s);
    const T = new THREE.Vector3(f.T.x, f.T.y, f.T.z), N = new THREE.Vector3(f.N.x, f.N.y, f.N.z), B = new THREE.Vector3(f.B.x, f.B.y, f.B.z);
    const pos = new THREE.Vector3(f.p.x, f.p.y, f.p.z).addScaledVector(B, r.lat).addScaledVector(N, 0.1);
    if (r.air) pos.y = r.y + 0.1 + (N.y < 0.99 ? 0 : 0);
    const yaw = -r.steerVis * 0.18 * Math.sign(r.v || 1);
    let fwd = T.clone().applyAxisAngle(N, yaw);
    let up = N.clone();
    if (r.air) {
      const pitch = clamp(Math.atan2(r.vy, Math.max(5, r.v)), -0.6, 0.6);
      fwd = new THREE.Vector3(T.x, 0, T.z).normalize().applyAxisAngle(B, -pitch);
      up = new THREE.Vector3(0, 1, 0).applyAxisAngle(B, -pitch);
    }
    const right = new THREE.Vector3().crossVectors(up, fwd).normalize();
    _m.makeBasis(right, up, fwd);
    _q.setFromRotationMatrix(_m);
    r.mesh.position.copy(pos);
    r.mesh.quaternion.slerp(_q, Math.min(1, dt * 14));
    if (r.crashed > 0) {
      r.mesh.rotation.z += dt * 6; r.mesh.position.y += Math.sin(r.crashed * 9) * 0.5 + 0.5;
    }
    r.frame = { pos, T, N, B, fwd, up };
  }

  // ---------------- camera ----------------
  const tvPoints = [];
  function updateCamera(dt) {
    const fr = player.frame; if (!fr) return;
    let target, look, up;
    const N = fr.N, T = fr.T;
    if (camMode === 0 || camMode === 2) {
      const dist = camMode === 0 ? 11 : 20, h = camMode === 0 ? 4.2 : 8;
      target = fr.pos.clone().addScaledVector(T, -dist).addScaledVector(N, h);
      look = fr.pos.clone().addScaledVector(T, 6).addScaledVector(N, 1);
      up = N;
    } else if (camMode === 1) {
      target = fr.pos.clone().addScaledVector(T, 0.8).addScaledVector(N, 1.6);
      look = fr.pos.clone().addScaledVector(T, 30).addScaledVector(N, 1.2);
      up = N;
    } else {
      tvTimer -= dt;
      if (!tvCam || tvTimer <= 0 || tvCam.distanceTo(fr.pos) > 140) {
        const f = TB.frameAt(track, player.s + 60);
        const side = Math.random() < 0.5 ? -1 : 1;
        tvCam = new THREE.Vector3(f.p.x + f.B.x * side * 22, f.p.y + 12 + Math.random() * 10, f.p.z + f.B.z * side * 22);
        tvTimer = 5;
      }
      target = tvCam; look = fr.pos.clone(); up = new THREE.Vector3(0, 1, 0);
    }
    if (window.STUNTS_FREECAM) { const fc = window.STUNTS_FREECAM; camera.position.set(fc.pos[0], fc.pos[1], fc.pos[2]); camera.up.set(0, 1, 0); camera.lookAt(fc.look[0], fc.look[1], fc.look[2]); return; }
    const k = camMode === 3 ? 1 : Math.min(1, dt * (camMode === 1 ? 30 : 6));
    camPos.lerp(target, k);
    camLook.lerp(look, Math.min(1, dt * 12));
    camUp.lerp(up, Math.min(1, dt * 5)).normalize();
    if (shake > 0) { shake -= dt * 2; camPos.x += (Math.random() - 0.5) * shake; camPos.y += (Math.random() - 0.5) * shake; }
    camera.position.copy(camPos);
    camera.up.copy(camUp);
    camera.lookAt(camLook);
    if (carLight) carLight.position.copy(fr.pos).addScaledVector(fr.up, 3).addScaledVector(fr.fwd, 6);
  }

  // ---------------- minimap ----------------
  let miniPath, miniScale, miniOff;
  function buildMinimap() {
    const c = $('#minimap'); const x = c.getContext('2d');
    const S = track.samples;
    let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
    for (const s of S) { minx = Math.min(minx, s.p.x); maxx = Math.max(maxx, s.p.x); minz = Math.min(minz, s.p.z); maxz = Math.max(maxz, s.p.z); }
    const pad = 12, w = c.width - pad * 2, h = c.height - pad * 2;
    miniScale = Math.min(w / (maxx - minx + 1), h / (maxz - minz + 1));
    miniOff = { x: pad + (w - (maxx - minx) * miniScale) / 2 - minx * miniScale, z: pad + (h - (maxz - minz) * miniScale) / 2 - minz * miniScale };
    miniPath = new Path2D();
    S.forEach((s, i) => { const px = c.width - (s.p.x * miniScale + miniOff.x), pz = c.height - (s.p.z * miniScale + miniOff.z); if (i === 0) miniPath.moveTo(px, pz); else miniPath.lineTo(px, pz); });
    miniPath.closePath();
    x.clearRect(0, 0, c.width, c.height);
  }
  function drawMinimap() {
    const c = $('#minimap'); const x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    x.lineWidth = 5; x.strokeStyle = 'rgba(255,255,255,0.85)'; x.stroke(miniPath);
    x.lineWidth = 2; x.strokeStyle = '#444'; x.stroke(miniPath);
    const dot = (r, col) => { const f = TB.frameAt(track, r.s); x.beginPath(); x.arc(c.width - (f.p.x * miniScale + miniOff.x), c.height - (f.p.z * miniScale + miniOff.z), 4, 0, Math.PI * 2); x.fillStyle = col; x.fill(); x.strokeStyle = '#000'; x.lineWidth = 1; x.stroke(); };
    dot(rival, '#' + new THREE.Color(rival.rival.color).getHexString());
    dot(player, '#ff2d2d');
  }

  // ---------------- HUD ----------------
  function updateHUD() {
    $('#speed').textContent = Math.round(Math.abs(player.v) * 3.6);
    $('#lap').textContent = `${player.lap} / ${track.def.laps}`;
    $('#time').textContent = fmtTime(raceTime);
    $('#lapBest').textContent = fmtTime(player.bestLap);
    const pp = player.lap * track.length + player.s, rp = rival.lap * track.length + rival.s;
    const ahead = player.finished ? (player.finishTime <= (rival.finishTime ?? Infinity)) : (rival.finished ? false : pp >= rp);
    $('#pos').textContent = ahead ? '1.' : '2.';
    $('#pos').className = ahead ? 'lead' : 'behind';
    if (lastAhead !== null && lastAhead !== ahead && phase === 'race' && raceTime > 3) {
      const byTuenn = Math.random() < 0.5;
      if (ahead) say(byTuenn ? tuenn : rival.rival, byTuenn ? pick(tuenn.overtake) : pick(rival.rival.lines.overtaken), 2500);
      else say(byTuenn ? tuenn : rival.rival, byTuenn ? pick(tuenn.overtaken) : pick(rival.rival.lines.overtake), 2500);
    }
    lastAhead = ahead;
    const wrongWay = player.v < -3;
    $('#wrongway').hidden = !wrongWay;
  }
  let lastAhead = null;

  // ---------------- scene build ----------------
  function buildScene() {
    const trackDef = D.TRACKS[sel.track], carDef = D.CARS[sel.car], rivalDef = D.RIVALS[sel.rival];
    theme = trackDef.theme;
    track = TB.buildTrack(trackDef);
    if (scene) { scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.sky);
    scene.fog = new THREE.Fog(theme.fog, theme.night ? 90 : 220, theme.night ? 520 : 1300);
    hemi = new THREE.HemisphereLight(theme.night ? 0x8090c0 : theme.sky, theme.ground, theme.night ? 0.7 : 0.75); scene.add(hemi);
    sunLight = new THREE.DirectionalLight(theme.sun, theme.night ? 0.45 : 0.9); sunLight.position.set(120, 200, 80); scene.add(sunLight);
    if (theme.night) { carLight = new THREE.PointLight(0xfff2cc, 2.0, 90); scene.add(carLight); } else carLight = null;
    road = W.buildRoad(track, theme); scene.add(road);
    scenery = W.buildScenery(track, theme); scene.add(scenery.group);
    confetti = theme.confetti ? W.buildConfetti() : null; if (confetti) scene.add(confetti);
    const pm = W.buildCar(carDef); scene.add(pm);
    const rivalCar = D.CARS.find((c) => c.id === rivalDef.car) || D.CARS[0];
    const rc = Object.assign({}, rivalCar, { color: rivalDef.color });
    const rm = W.buildCar(rc); scene.add(rm);
    player = makeRacer(carDef, pm, false, null);
    rival = makeRacer(rc, rm, true, rivalDef);
    player.s = 6; rival.s = 12; player.lat = -3; rival.lat = 3;
    camPos.set(0, 5, -15); camUp.set(0, 1, 0); camLook.set(0, 0, 10);
    buildMinimap();
    lastAhead = null;
    $('#hudTrack').textContent = `${trackDef.name} · ${trackDef.district}`;
    $('#hudRival').textContent = `${rivalDef.emoji} ${rivalDef.name}`;
    $('#best').textContent = fmtTime(getBest());
  }
  function bestKey() { return `stuntskoelle.best.${D.TRACKS[sel.track].id}`; }
  function getBest() { try { const v = localStorage.getItem(bestKey()); return v ? parseFloat(v) : null; } catch (e) { return null; } }
  function setBest(t) { try { localStorage.setItem(bestKey(), String(t)); } catch (e) { /* ignore */ } }

  // ---------------- race flow ----------------
  function startRace() {
    audioInit();
    buildScene();
    raceTime = 0; countdown = 4.2; phase = 'countdown';
    $('#menu').hidden = true; $('#hud').hidden = false; $('#results').hidden = true; $('#touch').hidden = !isTouch;
    say(tuenn, pick(tuenn.intro), 3500);
    setTimeout(() => { if (phase !== 'menu') say(rival.rival, pick(rival.rival.lines.start), 3000); }, 3600);
    cdShown = -1;
  }
  let cdShown = -1;
  function finishRace() {
    phase = 'finished';
    const won = player.finishTime <= (rival.finished ? rival.finishTime : Infinity) || !rival.finished;
    const best = getBest(); const record = best == null || player.finishTime < best;
    if (record) setBest(player.finishTime);
    fanfare(won);
    setTimeout(() => {
      $('#resTitle').textContent = won ? 'JEWONNE! KÖLLE ALAAF!' : 'VERLORE. ET HÄTT NOCH IMMER JOT JEJANGE.';
      $('#resTime').textContent = fmtTime(player.finishTime);
      $('#resBest').textContent = fmtTime(player.bestLap);
      $('#resRivalTime').textContent = rival.finished ? fmtTime(rival.finishTime) : 'noch unterwegs';
      $('#resRecord').hidden = !record;
      $('#resTuenn').textContent = record ? pick(tuenn.record) : won ? pick(tuenn.win) : pick(tuenn.lose);
      $('#resRival').textContent = `${rival.rival.emoji} ${rival.rival.name}: „${pick(won ? rival.rival.lines.lose : rival.rival.lines.win)}“`;
      $('#results').hidden = false;
    }, 1200);
  }
  function toMenu() {
    phase = 'menu';
    $('#menu').hidden = false; $('#hud').hidden = true; $('#results').hidden = true; $('#touch').hidden = true;
    $('#msg').classList.remove('show');
    audioEngine(0, 0);
  }

  // ---------------- main loop ----------------
  function frame(t) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
    if (!scene) return;
    if (phase === 'countdown') {
      countdown -= dt;
      const idx = 3 - Math.ceil(countdown - 0.2);
      const cd = $('#countdown');
      if (countdown <= 0.2) { cd.textContent = tuenn.countdown[3]; if (cdShown !== 3) { beep(880, 0.5, 'square', 0.2); cdShown = 3; } }
      else if (idx >= 0 && idx < 3) { cd.textContent = tuenn.countdown[idx]; if (cdShown !== idx) { beep(440, 0.15); cdShown = idx; } }
      cd.hidden = false;
      if (countdown <= 0) { phase = 'race'; setTimeout(() => { cd.hidden = true; }, 700); }
      placeRacer(player, dt); placeRacer(rival, dt);
    } else if (phase === 'race' || phase === 'finished') {
      if (phase === 'race') raceTime += dt;
      const ctl = player.finished ? { gas: 0, brake: 0.5, steer: 0 }
        : window.STUNTS_AUTOPILOT ? aiControl(player, dt) : { gas: input.gas, brake: input.brake, steer: input.steer };
      updateRacer(player, dt, ctl);
      updateRacer(rival, dt, rival.finished ? { gas: 0, brake: 0.3, steer: 0 } : aiControl(rival, dt));
      collide(player, rival);
      placeRacer(player, dt); placeRacer(rival, dt);
      if (player.finished && phase === 'race') finishRace();
      if (phase === 'race') updateHUD();
      drawMinimap();
      audioEngine(Math.abs(player.v), ctl.gas);
    }
    // animations (water, boats, trains, gondolas, flags, the Lange Tünn waving)
    if (scenery) W.animate(t, dt, camPos);
    if (confetti && player.frame) confetti.userData.update(dt, player.frame.pos);
    if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) $('#msg').classList.remove('show'); }
    updateCamera(dt);
    if (post) post.render(scene, camera); else renderer.render(scene, camera);
  }

  // ---------------- input ----------------
  const isTouch = ('ontouchstart' in window) && matchMedia('(pointer: coarse)').matches;
  function readKeys() {
    const left = keys.ArrowLeft || keys.KeyA, right = keys.ArrowRight || keys.KeyD;
    input.steer = (left ? -1 : 0) + (right ? 1 : 0);
    input.gas = (keys.ArrowUp || keys.KeyW) ? 1 : 0;
    input.brake = (keys.ArrowDown || keys.KeyS || keys.Space) ? 1 : 0;
    if (touch.left) input.steer -= 1; if (touch.right) input.steer += 1; if (touch.gas) input.gas = 1; if (touch.brake) input.brake = 1;
    input.steer = clamp(input.steer, -1, 1);
  }
  const touch = { left: false, right: false, gas: false, brake: false };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) { return; }
    keys[e.code] = true; readKeys();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (phase === 'menu') {
      if (e.code === 'Enter') startRace();
      if (e.code === 'KeyP') cyclePixel();
      return;
    }
    if (e.code === 'KeyC') { camMode = (camMode + 1) % 4; tvCam = null; }
    if (e.code === 'KeyP') cyclePixel();
    if (e.code === 'KeyM') { audio.muted = !audio.muted; $('#muteBtn').textContent = audio.muted ? '🔇' : '🔊'; }
    if (e.code === 'KeyR' && phase === 'race' && player.crashed <= 0) { crash(player, 'off'); player.crashed = 0.6; }
    if (e.code === 'Escape') toMenu();
    if (e.code === 'Enter' && phase === 'finished') startRace();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; readKeys(); });
  for (const [id, key] of [['tLeft', 'left'], ['tRight', 'right'], ['tGas', 'gas'], ['tBrake', 'brake']]) {
    const el = document.getElementById(id);
    const on = (e) => { e.preventDefault(); touch[key] = true; readKeys(); };
    const off = (e) => { e.preventDefault(); touch[key] = false; readKeys(); };
    el.addEventListener('touchstart', on, { passive: false }); el.addEventListener('touchend', off); el.addEventListener('touchcancel', off);
    el.addEventListener('mousedown', on); el.addEventListener('mouseup', off); el.addEventListener('mouseleave', off);
  }

  // ---------------- menu ----------------
  function renderMenu() {
    const lists = [
      ['#trackList', D.TRACKS, 'track', (t) => `<b>${t.name}</b><small>${t.district} · ${'★'.repeat(t.diff)}${'☆'.repeat(4 - t.diff)}</small>`],
      ['#carList', D.CARS, 'car', (c) => `<span class="swatch" style="background:#${new THREE.Color(c.color).getHexString()}"></span><b>${c.name}</b><small>${c.sub}</small>`],
      ['#rivalList', D.RIVALS, 'rival', (r) => `<b>${r.emoji} ${r.name}</b><small>${r.tag} · ${r.home}</small>`]
    ];
    for (const [selId, arr, key, fmt] of lists) {
      const el = $(selId); el.innerHTML = '';
      arr.forEach((item, i) => {
        const li = document.createElement('li'); li.innerHTML = fmt(item); li.className = sel[key] === i ? 'active' : '';
        li.onclick = () => { sel[key] = i; onSelectionChange(); };
        el.appendChild(li);
      });
    }
    const t = D.TRACKS[sel.track], c = D.CARS[sel.car], r = D.RIVALS[sel.rival];
    $('#trackDesc').textContent = t.desc;
    $('#carDesc').innerHTML = `${c.desc}<div class="stats">${stat('Speed', c.top / 80)}${stat('Antritt', c.accel / 22)}${stat('Grip', c.grip / 1.3)}${stat('Lenkung', c.steer / 1.25)}</div>`;
    $('#rivalDesc').textContent = r.desc;
    const best = getBest();
    $('#menuBest').textContent = best == null ? 'Noch keine Bestzeit. Der Lange Tünn wartet.' : `Bestzeit: ${fmtTime(best)}`;
    try { localStorage.setItem('stuntskoelle.sel', JSON.stringify(sel)); } catch (e) { /* ignore */ }
  }
  function stat(label, v) { return `<div class="stat"><span>${label}</span><i><b style="width:${Math.round(clamp(v, 0.1, 1) * 100)}%"></b></i></div>`; }

  function cyclePixel() {
    pixelScale = pixelScale >= 4 ? 1 : pixelScale + 1;
    post.setScale(pixelScale);
    try { localStorage.setItem('stuntskoelle.pixel', String(pixelScale)); } catch (e) { /* ignore */ }
    $('#pixBtn').textContent = pixelScale === 1 ? '▪' : pixelScale === 2 ? '▪▪' : pixelScale === 3 ? '▪▪▪' : '▪▪▪▪';
  }

  // ---------------- init ----------------
  function init() {
    try { const s = JSON.parse(localStorage.getItem('stuntskoelle.sel')); if (s) Object.assign(sel, s); } catch (e) { /* ignore */ }
    sel.track = clamp(sel.track | 0, 0, D.TRACKS.length - 1); sel.car = clamp(sel.car | 0, 0, D.CARS.length - 1); sel.rival = clamp(sel.rival | 0, 0, D.RIVALS.length - 1);
    renderer = new THREE.WebGLRenderer({ antialias: false, canvas: $('#gl') });
    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    try { pixelScale = clamp(parseInt(localStorage.getItem('stuntskoelle.pixel')) || 3, 1, 5); } catch (e) { /* ignore */ }
    post = new window.Pixel.PixelPost(renderer, pixelScale);
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1.0, 4000);
    window.addEventListener('resize', () => { renderer.setSize(window.innerWidth, window.innerHeight); post.setSize(window.innerWidth, window.innerHeight); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); });
    $('#pixBtn').onclick = cyclePixel;
    renderMenu();
    $('#startBtn').onclick = startRace;
    $('#againBtn').onclick = startRace;
    $('#menuBtn').onclick = toMenu;
    $('#camBtn').onclick = () => { camMode = (camMode + 1) % 4; tvCam = null; };
    $('#muteBtn').onclick = () => { audio.muted = !audio.muted; $('#muteBtn').textContent = audio.muted ? '🔇' : '🔊'; };
    $('#escBtn').onclick = toMenu;
    $('#tuennIntro').textContent = pick(tuenn.intro);
    // idle background: show the selected track spinning behind the menu
    buildScene(); builtTrack = sel.track; phase = 'menu';
    requestAnimationFrame(frame);
    // menu camera orbit
    setInterval(() => { if (phase === 'menu' && player) { player.s = (player.s + 3) % track.length; placeRacer(player, 0.1); placeRacer(rival, 0.1); camMode = 0; } }, 50);
  }
  let builtTrack = -1;
  function onSelectionChange() {
    renderMenu();
    if (phase === 'menu' && builtTrack !== sel.track) { builtTrack = sel.track; buildScene(); }
  }
  window.STUNTS_PROPS = () => scenery ? scenery.props.map((p) => ({ type: p.userData.type, x: p.position.x, y: p.position.y, z: p.position.z, rot: p.rotation.y })) : [];
  window.STUNTS_DEBUG = () => ({ phase, player: player && { s: player.s, lat: player.lat, v: player.v, lap: player.lap, air: player.air, crashed: player.crashed, finished: player.finished }, rival: rival && { s: rival.s, lat: rival.lat, v: rival.v, lap: rival.lap, finished: rival.finished }, raceTime, trackLen: track && track.length });
  if (typeof THREE === 'undefined') {
    document.body.innerHTML = '<div style="color:#fff;font:20px sans-serif;padding:40px">Three.js konnte nicht geladen werden (CDN blockiert?). Der Lange Tünn sagt: Internet anmachen, Jung.</div>';
  } else {
    init();
  }
})();
