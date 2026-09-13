/* Dat Hinterzimmer: the back room behind the Spielclub where the Cologne underworld plays cards and dice
   for Bierdeckel strokes. Skat (you always declare, Klüngel), Rommé against Klüngel Tom, Siebzehn un Vier
   against the bank (dä Lange) and Knobeln with three dice. Everything here talks to the game only through
   the small ctx object handed to open(): portraits, voice lines, the Deckel account and a beep. */
(function (root) {
  'use strict';
  const $ = (q) => document.querySelector(q);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const SUITS = ['♣', '♠', '♥', '♦'];
  const RED = (s) => s >= 2;
  let ctx = null, L = null, current = null, timers = [];
  const PEOPLE = { tom: { name: 'Klüngel Tom', emoji: '🤵' }, schael: { name: 'Schäl', emoji: '😏' }, langer: { name: 'Dä Lange', emoji: '🎩' }, koebes: { name: 'Köbes Hermann', emoji: '🍺' }, tango: { name: 'Tango', emoji: '🎸' }, taesch: { name: 'Täsch', emoji: '💪' }, willi: { name: 'Taxi Willi', emoji: '🚕' } };

  // ---------------- room ----------------
  function drawRoom() {
    const c = $('#clubRoom'); const W = 320, H = 180; c.width = W; c.height = H; const x = c.getContext('2d');
    x.fillStyle = '#0d0a14'; x.fillRect(0, 0, W, H);
    // wood panels and the wallpaper above them
    x.fillStyle = '#2a1626'; x.fillRect(0, 0, W, 92); for (let i = 0; i < W; i += 8) { x.fillStyle = i % 16 ? '#2f1a2b' : '#281425'; x.fillRect(i, 0, 8, 92); }
    x.fillStyle = '#3a2416'; x.fillRect(0, 92, W, 30); for (let i = 0; i < W; i += 24) { x.fillStyle = '#4a2f1c'; x.fillRect(i + 2, 94, 20, 26); }
    x.fillStyle = '#2a1a10'; x.fillRect(0, 122, W, 58); for (let i = 0; i < W; i += 12) { x.fillStyle = (i / 12) % 2 ? '#2f1e12' : '#26170d'; x.fillRect(i, 122, 12, 58); }
    // door with curtain and PRIVAT sign
    x.fillStyle = '#1a1016'; x.fillRect(268, 20, 40, 100); x.fillStyle = '#6a1a2a'; for (let i = 0; i < 40; i += 5) { x.fillStyle = (i / 5) % 2 ? '#6a1a2a' : '#7c2436'; x.fillRect(268 + i, 20, 5, 100); }
    x.fillStyle = '#f4efe0'; x.fillRect(272, 8, 32, 9); x.fillStyle = '#111'; x.font = '7px monospace'; x.fillText('PRIVAT', 275, 15);
    // poster: KEIN KREDIT
    x.fillStyle = '#e8dcc0'; x.fillRect(24, 26, 44, 30); x.fillStyle = '#c1121f'; x.fillRect(26, 28, 40, 8); x.fillStyle = '#fff'; x.font = '6px monospace'; x.fillText('KEIN KREDIT', 27, 34); x.fillStyle = '#333'; x.fillText('AUCH NIT FÖR', 27, 44); x.fillText('DICH, JUNG', 27, 52);
    // bar shelf with bottles and a Kölsch crate
    x.fillStyle = '#3a2416'; x.fillRect(90, 60, 70, 3); for (let i = 0; i < 6; i++) { x.fillStyle = ['#2a6a3a', '#6a4a2a', '#8a2a2a', '#2a4a7a', '#9a8a4a', '#3a3a3a'][i]; x.fillRect(94 + i * 11, 44, 6, 16); x.fillStyle = '#ddd'; x.fillRect(96 + i * 11, 41, 2, 3); }
    x.fillStyle = '#c1121f'; x.fillRect(200, 100, 40, 20); x.fillStyle = '#ffd400'; x.font = '6px monospace'; x.fillText('KÖLSCH', 206, 113);
    // hanging lamp with light cone over the table
    x.fillStyle = '#222'; x.fillRect(159, 0, 2, 22); x.fillStyle = '#2f8a5a'; x.beginPath(); x.moveTo(140, 34); x.lineTo(180, 34); x.lineTo(166, 22); x.lineTo(154, 22); x.closePath(); x.fill();
    const g = x.createLinearGradient(0, 34, 0, 150); g.addColorStop(0, 'rgba(255,225,150,.32)'); g.addColorStop(1, 'rgba(255,225,150,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(142, 34); x.lineTo(178, 34); x.lineTo(250, 150); x.lineTo(70, 150); x.closePath(); x.fill();
    // green felt table
    x.fillStyle = '#0f3a22'; x.beginPath(); x.ellipse(160, 128, 118, 40, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#165230'; x.beginPath(); x.ellipse(160, 124, 112, 34, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#4a2f1c'; x.lineWidth = 3; x.beginPath(); x.ellipse(160, 128, 118, 40, 0, 0, Math.PI * 2); x.stroke();
    // ashtray, glasses and smoke
    x.fillStyle = '#777'; x.fillRect(214, 118, 10, 4); x.fillStyle = '#ffd400'; x.fillRect(96, 112, 4, 8); x.fillRect(104, 114, 4, 8); x.fillStyle = '#fff'; x.fillRect(96, 110, 4, 2); x.fillRect(104, 112, 4, 2);
    x.fillStyle = 'rgba(200,200,220,.12)'; for (let i = 0; i < 14; i++) x.fillRect(216 + Math.sin(i) * 6, 112 - i * 6, 5 + (i % 3), 3);
    // dark vignette
    const v = x.createRadialGradient(160, 110, 40, 160, 110, 220); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.75)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
  }

  // ---------------- shared UI ----------------
  function say(who, text, ms) {
    const p = PEOPLE[who] || { name: who, emoji: '🃏' };
    $('#clubWho').textContent = `${p.emoji} ${p.name}`; $('#clubText').textContent = text;
    if (ctx.speak) ctx.speak(p.name, text);
    if (ms) { const el = $('#clubMsg'); el.classList.add('flash'); timers.push(setTimeout(() => el.classList.remove('flash'), ms)); }
  }
  function money() { const t = ctx.getDeckel(); $('#clubDeckel').innerHTML = t >= 0 ? `DING DECKEL: <b>${t}</b> STRICHE` : `SCHULDEN BEI DÄ LANGE: <b>${-t}</b> STRICHE`; }
  function pay(n, why) { ctx.addDeckel(n); money(); if (ctx.beep) { if (n > 0) { ctx.beep(1180, 0.08); setTimeout(() => ctx.beep(1580, 0.12), 90); } else ctx.beep(220, 0.3, 'sawtooth'); } if (why) say('koebes', why); }
  function buttons(list) { const b = $('#clubBtns'); b.innerHTML = ''; for (const it of list) { const btn = document.createElement('button'); btn.textContent = it.label; btn.disabled = !!it.off; btn.onclick = () => { if (!btn.disabled) it.fn(); }; if (it.main) btn.className = 'main'; b.appendChild(btn); } }
  function cardEl(card, o) {
    o = o || {}; const d = document.createElement('div'); d.className = 'ccard' + (o.hidden ? ' back' : '') + (o.sel ? ' sel' : '') + (o.small ? ' small' : '') + (!o.hidden && RED(card.s) ? ' red' : '');
    if (!o.hidden) { d.innerHTML = `<span class="r">${card.r}</span><span class="s">${SUITS[card.s]}</span><span class="c">${SUITS[card.s]}</span>`; }
    if (o.onClick) d.onclick = () => o.onClick(card);
    return d;
  }
  function seat(i, id, count, label) { const s = $('#seat' + i); s.hidden = !id; if (!id) return; s.querySelector('b').textContent = PEOPLE[id].name.toUpperCase(); const h = s.querySelector('.oh'); h.innerHTML = ''; for (let k = 0; k < Math.min(count, 6); k++) h.appendChild(cardEl({ s: 0, r: '' }, { hidden: true, small: true })); s.querySelector('.lbl').textContent = label || (count ? count + ' KARTEN' : ''); if (s.dataset.id !== id) { s.dataset.id = id; ctx.portrait(id, s.querySelector('canvas')); } }
  function clearTimers() { for (const t of timers) clearTimeout(t); timers = []; }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  // ---------------- lobby ----------------
  const GAMES = [
    { id: 'skat', name: 'SKAT', who: 'Klüngel Tom & Schäl', stake: 'Spielwert in Strichen', desc: 'Du reizt immer am höchsten (Klüngel). Skat aufnehmen, drücken, Farbe, Grand oder Null ansagen, 61 Augen holen.' },
    { id: 'romme', name: 'ROMMÉ', who: 'Klüngel Tom', stake: 'Restkarten des Verlierers', desc: 'Dreier-Sets und Reihen. Erste Auslage ab 30 Punkten, dann anlegen. Wer zuerst leer ist, kassiert.' },
    { id: 'siebzehn', name: 'SIEBZEHN UN VIER', who: 'Dä Lange (Bank)', stake: '1 bis 5 Striche', desc: 'Näher an 21 als die Bank. Ass 11, Zehn 10, Bilder 4, 3, 2. Siebzehn un Vier mit zwei Karten zahlt doppelt.' },
    { id: 'knobeln', name: 'KNOBELN', who: 'Tom, Schäl & Täsch', stake: '1 Strich pro Runde', desc: 'Drei Würfel, zwei Nachwürfe. Schock schlägt General schlägt Straße schlägt Rest. Der Letzte zahlt.' }
  ];
  function lobby() {
    clearTimers(); current = null; $('#clubTable').hidden = true; const lb = $('#clubLobby'); lb.hidden = false; lb.innerHTML = '';
    for (const g of GAMES) { const d = document.createElement('div'); d.className = 'cgame'; d.innerHTML = `<b>${g.name}</b><span>gegen ${g.who}</span><small>${g.desc}</small><i>Einsatz: ${g.stake}</i>`; d.onclick = () => start(g.id); lb.appendChild(d); }
    say('langer', pick(L.welcome)); money();
  }
  function start(id) {
    clearTimers(); $('#clubLobby').hidden = true; $('#clubTable').hidden = false; $('#clubMid').innerHTML = ''; $('#clubHand').innerHTML = ''; for (let i = 0; i < 3; i++) $('#seat' + i).hidden = true;
    $('#clubTitle').textContent = 'HINTERZIMMER · ' + GAMES.find((g) => g.id === id).name;
    current = id; ({ skat: skatStart, romme: rommeStart, siebzehn: sechzehnStart, knobeln: knobelnStart })[id]();
  }

  // ================= SKAT =================
  const SK_RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A']; const SK_VAL = { 7: 0, 8: 0, 9: 0, 10: 10, J: 2, Q: 3, K: 4, A: 11 };
  const S = {};
  function skDeck() { const d = []; for (let s = 0; s < 4; s++) for (const r of SK_RANKS) d.push({ s, r }); return shuffle(d); }
  function isTrump(c) { if (S.game === 'null') return false; return c.r === 'J' || (S.game !== 'grand' && c.s === S.game); }
  function eff(c) { return isTrump(c) ? 'T' : c.s; }
  function power(c) {
    if (S.game === 'null') return ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'].indexOf(c.r);
    const rp = { A: 7, 10: 6, K: 5, Q: 4, 9: 3, 8: 2, 7: 1 };
    if (c.r === 'J') return 100 + (3 - c.s); return (isTrump(c) ? 50 : 0) + rp[c.r];
  }
  function trickWinner(trick) { const led = eff(trick[0].c); let best = 0; for (let i = 1; i < trick.length; i++) { const a = trick[best].c, b = trick[i].c; const ea = eff(a), eb = eff(b); if (eb === 'T' && ea !== 'T') best = i; else if (eb === ea && power(b) > power(a)) best = i; else if (ea !== 'T' && ea !== led && eb === led) best = i; } return trick[best].p; }
  function legal(hand, trick) { if (!trick.length) return hand.slice(); const led = eff(trick[0].c); const follow = hand.filter((c) => eff(c) === led); return follow.length ? follow : hand.slice(); }
  function sortSkat(hand) { return hand.sort((a, b) => { const ta = isTrump(a) ? -1 : a.s, tb = isTrump(b) ? -1 : b.s; if (ta !== tb) return ta - tb; return power(b) - power(a); }); }
  function skatStart() {
    S.dealer = S.dealer == null ? 2 : (S.dealer + 1) % 3; // seats: 0 you, 1 Tom, 2 Schäl
    const d = skDeck(); S.hands = [d.slice(0, 10), d.slice(10, 20), d.slice(20, 30)]; S.skat = d.slice(30, 32); S.game = 'grand'; S.tricks = [[], [], []]; S.trick = []; S.stage = 'reizen'; S.sel = [];
    seat(1, 'tom', 10); seat(2, 'schael', 10); seat(0, null);
    const bids = [18, 20, 22, 24, 27, 30, 33, 36]; const tomBid = bids[Math.floor(Math.random() * 5)], you = bids[Math.min(7, bids.indexOf(tomBid) + 1 + Math.floor(Math.random() * 3))];
    say('tom', `Ich reiz ${tomBid}.`); later(() => say('schael', 'Weg.'), 900); later(() => { say('langer', `Du sachs ${you}. Tom passt. Man kennt sich. Du spielst.`); skatAufnehmen(); }, 1900);
    $('#clubMid').innerHTML = `<div class="skatInfo">REIZEN … Tom ${tomBid} · Schäl weg · Du ${you}</div>`;
    renderSkatHand();
  }
  function skatAufnehmen() {
    S.stage = 'druecken'; S.hands[0] = S.hands[0].concat(S.skat); S.skat = []; S.sel = [];
    $('#clubMid').innerHTML = '<div class="skatInfo">SKAT AUFJENOMME – zwei Karten drücken (anklicken), dann Spiel ansagen</div>';
    renderSkatHand(); skatButtons();
  }
  function skatButtons() {
    if (S.stage !== 'druecken') return;
    const ok = S.sel.length === 2;
    const ann = (g, label) => ({ label, off: !ok, fn: () => skatAnsagen(g) });
    buttons([ann('grand', 'GRAND'), ann(0, '♣ KREUZ'), ann(1, '♠ PIK'), ann(2, '♥ HERZ'), ann(3, '♦ KARO'), ann('null', 'NULL'), { label: 'RAUS', fn: lobby }]);
  }
  function renderSkatHand() {
    const h = $('#clubHand'); h.innerHTML = ''; sortSkat(S.hands[0]);
    const trickLegal = S.stage === 'spiel' && S.turn === 0 ? legal(S.hands[0], S.trick) : null;
    for (const c of S.hands[0]) { const el = cardEl(c, { sel: S.sel.includes(c), onClick: (card) => skatClick(card) }); if (trickLegal && !trickLegal.includes(c)) el.classList.add('dim'); h.appendChild(el); }
    seat(1, 'tom', S.hands[1].length, S.stage === 'spiel' && S.turn === 1 ? 'AM ZUG' : ''); seat(2, 'schael', S.hands[2].length, S.stage === 'spiel' && S.turn === 2 ? 'AM ZUG' : '');
  }
  function skatClick(card) {
    if (S.stage === 'druecken') { if (S.sel.includes(card)) S.sel = S.sel.filter((c) => c !== card); else if (S.sel.length < 2) S.sel.push(card); renderSkatHand(); skatButtons(); return; }
    if (S.stage === 'spiel' && S.turn === 0 && legal(S.hands[0], S.trick).includes(card)) { skatPlay(0, card); }
  }
  function skatAnsagen(g) {
    S.game = g; S.skat = S.sel.slice(); S.hands[0] = S.hands[0].filter((c) => !S.sel.includes(c)); S.sel = []; S.stage = 'spiel';
    const name = g === 'grand' ? 'GRAND' : g === 'null' ? 'NULL' : ['KREUZ', 'PIK', 'HERZ', 'KARO'][g];
    say('langer', `${name}. Jesacht is jesacht.`); buttons([{ label: 'RAUS', fn: lobby }]);
    S.turn = (S.dealer + 1) % 3; S.trick = []; skatInfo(); renderSkatHand(); skatNext();
  }
  function skatInfo() { const mine = S.tricks[0].reduce((a, t) => a + t.reduce((b, x) => b + SK_VAL[x.c.r], 0), 0) + S.skat.reduce((a, c) => a + SK_VAL[c.r], 0); const gname = S.game === 'grand' ? 'GRAND' : S.game === 'null' ? 'NULL' : SUITS[S.game] + ' FARBE'; $('#clubMid').innerHTML = `<div class="skatInfo">${gname} · DEINE AUGEN ${S.game === 'null' ? '(keinen Stich!)' : mine + ' / 61'} · STICH ${Math.min(10, S.tricks.flat().length + 1)} / 10</div><div class="trick" id="skTrick"></div>`; renderTrick(); }
  function renderTrick() { const t = $('#skTrick'); if (!t) return; t.innerHTML = ''; for (const x of S.trick) { const w = document.createElement('div'); w.className = 'tc p' + x.p; w.appendChild(cardEl(x.c)); const n = document.createElement('i'); n.textContent = ['DU', 'TOM', 'SCHÄL'][x.p]; w.appendChild(n); t.appendChild(w); } }
  function skatNext() {
    if (S.trick.length === 3) { later(skatEndTrick, 900); return; }
    if (S.turn === 0) { renderSkatHand(); return; }
    later(() => { const c = skatAI(S.turn); skatPlay(S.turn, c); }, 650);
  }
  function skatPlay(p, card) { S.hands[p] = S.hands[p].filter((c) => c !== card); S.trick.push({ p, c: card }); S.turn = (S.turn + 1) % 3; renderTrick(); renderSkatHand(); skatNext(); }
  function skatAI(p) {
    const hand = S.hands[p], opts = legal(hand, S.trick); const partner = p === 1 ? 2 : 1;
    const byPow = (a, b) => power(a) - power(b); const byVal = (a, b) => SK_VAL[a.r] - SK_VAL[b.r];
    if (!S.trick.length) { // lead: longest non-trump suit low, or lowest trump; in Null lead high to force the declarer
      if (S.game === 'null') return opts.slice().sort(byPow).pop();
      const suits = [0, 1, 2, 3].map((s) => opts.filter((c) => !isTrump(c) && c.s === s)).filter((g) => g.length).sort((a, b) => b.length - a.length);
      if (suits.length) { const g = suits[0]; const ace = g.find((c) => c.r === 'A'); return ace || g.sort(byPow)[0]; }
      return opts.sort(byPow)[0];
    }
    const winner = trickWinner(S.trick); const trickVal = S.trick.reduce((a, x) => a + SK_VAL[x.c.r], 0);
    if (S.game === 'null') { // defenders try to stay under the declarer: play the highest card that does not beat him if he wins, else dump the highest
      const below = opts.filter((c) => { const t = S.trick.concat([{ p, c }]); return trickWinner(t) === 0; }); if (below.length) return below.sort(byPow).pop(); return opts.sort(byPow)[0];
    }
    if (winner === partner) { const canBeat = opts.filter((c) => trickWinner(S.trick.concat([{ p, c }])) === p); if (S.trick.length === 2 || !canBeat.length) return opts.sort(byVal).pop(); return opts.sort(byVal).pop(); }
    const beats = opts.filter((c) => trickWinner(S.trick.concat([{ p, c }])) === p);
    if (beats.length && (trickVal >= 10 || S.trick.length === 2 || Math.random() < 0.5)) { const cheap = beats.filter((c) => !isTrump(c)); return (cheap.length ? cheap : beats).sort(byPow)[0]; }
    return opts.sort(byVal)[0];
  }
  function skatEndTrick() {
    const w = trickWinner(S.trick); S.tricks[w].push(S.trick.slice()); const val = S.trick.reduce((a, x) => a + SK_VAL[x.c.r], 0);
    S.trick = []; S.turn = w; skatInfo();
    if (S.game === 'null' && w === 0) { say('tom', 'Stich für dich. Null is kaputt.'); later(skatEnd, 900); return; }
    if (w !== 0 && val >= 10 && Math.random() < 0.5) say(w === 1 ? 'tom' : 'schael', pick(L.trick)); else if (w === 0 && Math.random() < 0.3) say('schael', pick(L.trickLost));
    if (!S.hands[0].length) { later(skatEnd, 800); return; }
    skatNext();
  }
  function skatEnd() {
    S.stage = 'ende'; const mine = S.tricks[0].reduce((a, t) => a + t.reduce((b, x) => b + SK_VAL[x.c.r], 0), 0) + S.skat.reduce((a, c) => a + SK_VAL[c.r], 0);
    let value, won, text;
    if (S.game === 'null') { won = S.tricks[0].length === 0; value = 23; text = won ? 'NULL JEWONNE – keinen Stich jemacht.' : 'NULL VERLORE.'; }
    else {
      const all = S.hands[0].concat(S.skat, S.tricks.flat(2).filter((x) => x.p === 0).map((x) => x.c)); // the declarer's original cards for mit/ohne
      const jacks = [0, 1, 2, 3].map((s) => all.some((c) => c.r === 'J' && c.s === s)); let run = 0; const withJ = jacks[0]; for (let i = 0; i < 4; i++) { if (jacks[i] === withJ) run++; else break; }
      const base = S.game === 'grand' ? 24 : [12, 11, 10, 9][S.game]; won = mine >= 61; const schneider = mine >= 90 || mine <= 30; const schwarz = S.tricks[0].length === 10 || S.tricks[0].length === 0;
      value = base * (run + 1 + (schneider ? 1 : 0) + (schwarz ? 1 : 0));
      text = `${mine} AUGEN – ${won ? 'JEWONNE' : 'VERLORE'} · ${withJ ? 'mit' : 'ohne'} ${run}, Spiel ${run + 1}${schneider ? ', Schneider' : ''}${schwarz ? ', Schwarz' : ''} = ${value}`;
    }
    const strokes = Math.max(1, Math.round(value / 12)) * (won ? 1 : -2);
    $('#clubMid').innerHTML = `<div class="skatInfo big">${text}<br>${strokes > 0 ? '+' : ''}${strokes} STRICHE</div>`;
    pay(strokes, won ? pick(L.win) : pick(L.lose)); later(() => say(won ? 'tom' : 'langer', won ? pick(L.tomLose) : pick(L.langerWin)), 1600);
    buttons([{ label: 'NOCH E SPIEL', main: true, fn: skatStart }, { label: 'RAUS', fn: lobby }]); ctx.stat && ctx.stat('club', 1);
  }

  // ================= ROMMÉ =================
  const RM_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']; const rv = (c) => c.r === 'A' ? 11 : ['J', 'Q', 'K'].includes(c.r) ? 10 : parseInt(c.r); const ri = (c) => RM_RANKS.indexOf(c.r);
  const R = {};
  function rmDeck() { const d = []; for (let k = 0; k < 2; k++) for (let s = 0; s < 4; s++) for (const r of RM_RANKS) d.push({ s, r, id: k * 52 + s * 13 + RM_RANKS.indexOf(r) }); return shuffle(d); }
  function isSet(cs) { return cs.length >= 3 && cs.length <= 4 && cs.every((c) => c.r === cs[0].r) && new Set(cs.map((c) => c.s)).size === cs.length; }
  function isRun(cs) { if (cs.length < 3 || !cs.every((c) => c.s === cs[0].s)) return false; const idx = cs.map(ri).sort((a, b) => a - b); for (let i = 1; i < idx.length; i++) if (idx[i] !== idx[i - 1] + 1) { if (!(i === idx.length - 1 && idx[i] === 12 && idx[0] === 0)) return false; } return new Set(idx).size === idx.length; }
  function meldOk(cs) { return isSet(cs) || isRun(cs); }
  function meldPts(cs) { return cs.reduce((a, c) => a + (c.r === 'A' && isRun(cs) && cs.some((x) => x.r === '2') ? 1 : rv(c)), 0); }
  function findMelds(hand) { // greedy: runs first, then sets on the rest; and the other way round; keep the better cover
    const tryOrder = (runsFirst) => { let rest = hand.slice(); const out = [];
      const runs = () => { for (let s = 0; s < 4; s++) { const cs = rest.filter((c) => c.s === s).sort((a, b) => ri(a) - ri(b)); let i = 0; while (i < cs.length) { const seq = [cs[i]]; let j = i + 1; while (j < cs.length && (ri(cs[j]) === ri(seq[seq.length - 1]) + 1 || ri(cs[j]) === ri(seq[seq.length - 1]))) { if (ri(cs[j]) === ri(seq[seq.length - 1]) + 1) seq.push(cs[j]); j++; } if (seq.length >= 3) { out.push(seq); rest = rest.filter((c) => !seq.includes(c)); } i = j; } } };
      const sets = () => { for (const r of RM_RANKS) { const cs = []; const seen = new Set(); for (const c of rest) if (c.r === r && !seen.has(c.s)) { seen.add(c.s); cs.push(c); } if (cs.length >= 3) { out.push(cs.slice(0, 4)); rest = rest.filter((c) => !cs.slice(0, 4).includes(c)); } } };
      if (runsFirst) { runs(); sets(); } else { sets(); runs(); } return out; };
    const a = tryOrder(true), b = tryOrder(false); const cover = (m) => m.reduce((n, x) => n + x.length, 0); return cover(a) >= cover(b) ? a : b;
  }
  function layTarget(card, melds) { for (const m of melds) { if (isSet(m) && m.length < 4 && m[0].r === card.r && !m.some((c) => c.s === card.s)) return m; if (isRun(m) && m[0].s === card.s) { const idx = m.map(ri); const lo = Math.min(...idx), hi = Math.max(...idx); if (ri(card) === lo - 1 || ri(card) === hi + 1) return m; } } return null; }
  function rommeStart() {
    const d = rmDeck(); R.hands = [d.slice(0, 13), d.slice(13, 26)]; R.stock = d.slice(26); R.discard = [R.stock.pop()]; R.melds = [[], []]; R.opened = [false, false]; R.sel = []; R.turn = 0; R.drawn = false; R.over = false;
    seat(1, 'tom', 13, ''); seat(2, null); seat(0, null);
    say('tom', pick(L.rommeStart)); rommeRender();
  }
  function rommeRender() {
    const h = $('#clubHand'); h.innerHTML = ''; R.hands[0].sort((a, b) => a.s - b.s || ri(a) - ri(b));
    for (const c of R.hands[0]) h.appendChild(cardEl(c, { sel: R.sel.includes(c), onClick: (card) => { if (R.turn !== 0 || R.over) return; if (R.sel.includes(card)) R.sel = R.sel.filter((x) => x !== card); else R.sel.push(card); rommeRender(); } }));
    seat(1, 'tom', R.hands[1].length, R.turn === 1 ? 'AM ZUG' : '');
    const mid = $('#clubMid'); mid.innerHTML = '';
    const piles = document.createElement('div'); piles.className = 'piles';
    const st = cardEl({ s: 0, r: '' }, { hidden: true, onClick: () => rommeDraw(false) }); st.title = 'Stapel'; piles.appendChild(st); const stn = document.createElement('i'); stn.textContent = `STAPEL ${R.stock.length}`; piles.appendChild(stn);
    const top = R.discard[R.discard.length - 1]; if (top) { const de = cardEl(top, { onClick: () => rommeDraw(true) }); piles.appendChild(de); } const dn = document.createElement('i'); dn.textContent = 'ABLAGE'; piles.appendChild(dn);
    mid.appendChild(piles);
    for (let p = 0; p < 2; p++) { const row = document.createElement('div'); row.className = 'meldRow'; const lab = document.createElement('i'); lab.textContent = p ? 'TOM:' : 'DU:'; row.appendChild(lab); for (const m of R.melds[p]) { const g = document.createElement('div'); g.className = 'meld'; for (const c of m) g.appendChild(cardEl(c, { small: true })); row.appendChild(g); } if (!R.melds[p].length) { const e = document.createElement('span'); e.textContent = '– noch nix ausjelegt –'; row.appendChild(e); } mid.appendChild(row); }
    if (R.over) return;
    const selPts = meldOk(R.sel) ? meldPts(R.sel) : 0; const canMeld = R.turn === 0 && R.drawn && meldOk(R.sel) && (R.opened[0] || selPts >= 30);
    const canLay = R.turn === 0 && R.drawn && R.opened[0] && R.sel.length === 1 && !!layTarget(R.sel[0], R.melds[0].concat(R.melds[1]));
    buttons([
      { label: 'STAPEL ZIEHEN', off: R.turn !== 0 || R.drawn, fn: () => rommeDraw(false) }, { label: 'ABLAGE NEHMEN', off: R.turn !== 0 || R.drawn || !top, fn: () => rommeDraw(true) },
      { label: `AUSLEGEN${R.sel.length ? ' (' + (meldOk(R.sel) ? selPts + ' PKT' : 'kein Satz') + ')' : ''}`, off: !canMeld, fn: rommeMeld }, { label: 'ANLEGEN', off: !canLay, fn: rommeLay },
      { label: 'ABLEGEN', main: true, off: R.turn !== 0 || !R.drawn || R.sel.length !== 1, fn: rommeDiscard }, { label: 'RAUS', fn: lobby }]);
  }
  function rommeDraw(fromDiscard) { if (R.turn !== 0 || R.drawn || R.over) return; const c = fromDiscard ? R.discard.pop() : rommeStock(); if (!c) return; R.hands[0].push(c); R.drawn = true; R.sel = []; rommeRender(); }
  function rommeStock() { if (!R.stock.length) { const top = R.discard.pop(); R.stock = shuffle(R.discard); R.discard = top ? [top] : []; } return R.stock.pop(); }
  function rommeMeld() { R.melds[0].push(R.sel.slice()); R.hands[0] = R.hands[0].filter((c) => !R.sel.includes(c)); R.opened[0] = true; R.sel = []; if (!R.hands[0].length) return rommeEnd(0); rommeRender(); }
  function rommeLay() { const c = R.sel[0]; const m = layTarget(c, R.melds[0].concat(R.melds[1])); if (!m) return; m.push(c); if (isRun(m)) m.sort((a, b) => ri(a) - ri(b)); R.hands[0] = R.hands[0].filter((x) => x !== c); R.sel = []; if (!R.hands[0].length) return rommeEnd(0); rommeRender(); }
  function rommeDiscard() { const c = R.sel[0]; R.hands[0] = R.hands[0].filter((x) => x !== c); R.discard.push(c); R.sel = []; R.drawn = false; if (!R.hands[0].length) return rommeEnd(0); R.turn = 1; rommeRender(); later(rommeAI, 900); }
  function rommeAI() {
    const hand = R.hands[1]; const top = R.discard[R.discard.length - 1];
    const useful = (c, h) => h.filter((x) => x !== c && (x.r === c.r || (x.s === c.s && Math.abs(ri(x) - ri(c)) <= 2))).length;
    let took = false; if (top && (useful(top, hand) >= 2 || findMelds(hand.concat([top])).reduce((n, m) => n + m.length, 0) > findMelds(hand).reduce((n, m) => n + m.length, 0))) { hand.push(R.discard.pop()); took = true; } else hand.push(rommeStock());
    let melds = findMelds(hand); const pts = melds.reduce((a, m) => a + meldPts(m), 0);
    if (melds.length && (R.opened[1] || pts >= 30)) { for (const m of melds) { R.melds[1].push(m); for (const c of m) hand.splice(hand.indexOf(c), 1); } R.opened[1] = true; say('tom', pick(L.tomMeld)); }
    if (R.opened[1]) { let laid = true; while (laid) { laid = false; for (const c of hand.slice()) { const m = layTarget(c, R.melds[0].concat(R.melds[1])); if (m) { m.push(c); if (isRun(m)) m.sort((a, b) => ri(a) - ri(b)); hand.splice(hand.indexOf(c), 1); laid = true; } } } }
    if (!hand.length) return rommeEnd(1);
    hand.sort((a, b) => useful(a, hand) - useful(b, hand) || rv(b) - rv(a)); const out = hand.shift(); R.discard.push(out);
    if (!hand.length) return rommeEnd(1);
    if (!took && Math.random() < 0.25) say('tom', pick(L.tomDraw));
    R.turn = 0; R.drawn = false; rommeRender();
  }
  function rommeEnd(w) {
    R.over = true; R.turn = -1; const loserHand = R.hands[1 - w]; const pts = loserHand.reduce((a, c) => a + rv(c), 0); const strokes = Math.max(1, Math.round(pts / 20)) * (w === 0 ? 1 : -1);
    rommeRender(); const h = $('#clubHand'); if (w === 1) { h.innerHTML = ''; for (const c of R.hands[0]) h.appendChild(cardEl(c)); }
    $('#clubMid').insertAdjacentHTML('afterbegin', `<div class="skatInfo big">${w === 0 ? 'ROMMÉ! DU BES LEER.' : 'TOM IS LEER.'} ${pts} PUNKTE ${w === 0 ? 'in Toms' : 'in dinger'} Hand = ${strokes > 0 ? '+' : ''}${strokes} STRICHE</div>`);
    pay(strokes, w === 0 ? pick(L.win) : pick(L.lose)); later(() => say('tom', w === 0 ? pick(L.tomLose) : pick(L.tomWin)), 1500);
    buttons([{ label: 'NOCH E SPIEL', main: true, fn: rommeStart }, { label: 'RAUS', fn: lobby }]); ctx.stat && ctx.stat('club', 1);
  }

  // ================= SIEBZEHN UN VIER =================
  const V = {};
  function sechzehnStart() { V.deck = skDeck(); V.stake = 1; V.hand = []; V.bank = []; V.stage = 'einsatz'; seat(0, 'langer', 0, 'DIE BANK'); seat(1, null); seat(2, null); say('langer', pick(L.bankStart)); sechzehnRender(); }
  const SV = { 7: 7, 8: 8, 9: 9, 10: 10, J: 2, Q: 3, K: 4, A: 11 }; const sv = (h) => h.reduce((a, c) => a + SV[c.r], 0);
  function sechzehnRender() {
    const mid = $('#clubMid'); mid.innerHTML = `<div class="skatInfo">EINSATZ: ${V.stake} ${V.stake === 1 ? 'STRICH' : 'STRICHE'}</div><div class="bankRow"><i>BANK ${V.stage === 'ende' || V.stage === 'bank' ? sv(V.bank) : (V.bank.length ? '?' : '')}</i><div class="trick" id="bankCards"></div></div>`;
    const bc = $('#bankCards'); V.bank.forEach((c, i) => bc.appendChild(cardEl(c, { hidden: i === 1 && V.stage === 'ziehen' })));
    const h = $('#clubHand'); h.innerHTML = ''; for (const c of V.hand) h.appendChild(cardEl(c)); if (V.hand.length) { const t = document.createElement('div'); t.className = 'total'; t.textContent = 'DU: ' + sv(V.hand); h.appendChild(t); }
    if (V.stage === 'einsatz') buttons([{ label: '−', fn: () => { V.stake = Math.max(1, V.stake - 1); sechzehnRender(); } }, { label: '+', fn: () => { V.stake = Math.min(5, V.stake + 1); sechzehnRender(); } }, { label: 'JEBEN', main: true, fn: sechzehnDeal }, { label: 'RAUS', fn: lobby }]);
    else if (V.stage === 'ziehen') buttons([{ label: 'KARTE', main: true, fn: sechzehnHit }, { label: 'STEHEN', fn: sechzehnStand }, { label: 'RAUS', fn: lobby }]);
    else buttons([{ label: 'NOCH E SPIEL', main: true, fn: () => { V.stage = 'einsatz'; V.hand = []; V.bank = []; if (V.deck.length < 12) V.deck = skDeck(); sechzehnRender(); } }, { label: 'RAUS', fn: lobby }]);
  }
  function sechzehnDeal() { V.hand = [V.deck.pop(), V.deck.pop()]; V.bank = [V.deck.pop(), V.deck.pop()]; V.stage = 'ziehen'; sechzehnRender(); if (sv(V.hand) === 21) { say('langer', 'Siebzehn un Vier mit zwei Karten. Dat jibt et doch nit.'); later(() => sechzehnEnd(true), 900); } }
  function sechzehnHit() { V.hand.push(V.deck.pop()); sechzehnRender(); if (sv(V.hand) > 21) { say('langer', pick(L.bust)); later(() => sechzehnEnd(false), 700); } }
  function sechzehnStand() { V.stage = 'bank'; sechzehnRender(); const step = () => { if (sv(V.bank) < 17) { V.bank.push(V.deck.pop()); sechzehnRender(); later(step, 650); } else later(() => sechzehnEnd(false), 500); }; later(step, 500); }
  function sechzehnEnd(natural) {
    V.stage = 'ende'; const me = sv(V.hand), bk = sv(V.bank); let win = 0;
    if (me > 21) win = -V.stake; else if (natural) win = V.stake * 2; else if (bk > 21 || me > bk) win = V.stake; else if (me === bk) win = 0; else win = -V.stake;
    sechzehnRender(); $('#clubMid').insertAdjacentHTML('afterbegin', `<div class="skatInfo big">DU ${me} · BANK ${bk} · ${win > 0 ? 'JEWONNE +' + win : win < 0 ? 'VERLORE ' + win : 'UNENTSCHIEDEN'}</div>`);
    if (win) pay(win, win > 0 ? pick(L.win) : pick(L.lose)); else say('langer', 'Unentschieden. Kölsch trotzdem.'); ctx.stat && ctx.stat('club', 1);
  }

  // ================= KNOBELN =================
  const K = {}; const KP = ['DU', 'TOM', 'SCHÄL', 'TÄSCH']; const KID = [null, 'tom', 'schael', 'taesch'];
  function rankDice(d) { const s = d.slice().sort((a, b) => b - a); const ones = s.filter((x) => x === 1).length; if (ones === 3) return [4, 7, 'SCHOCK AUS']; if (ones === 2) return [3, s[0], 'SCHOCK ' + s[0]]; if (s[0] === s[1] && s[1] === s[2]) return [2, s[0], 'GENERAL ' + s[0]]; if (s[0] === s[1] + 1 && s[1] === s[2] + 1) return [1, s[0], 'STRASSE ' + s.join('')]; return [0, s[0] * 100 + s[1] * 10 + s[2], s.join('')]; }
  function knobelnStart() { K.round = (K.round || 0) + 1; K.players = [[], [], [], []]; K.throws = 0; K.keep = [false, false, false]; K.dice = [0, 0, 0]; K.stage = 'you'; seat(1, 'tom', 0); seat(2, 'schael', 0); seat(0, 'taesch', 0); say('langer', pick(L.knobelStart)); knobelnRender(); }
  function diceEl(v, kept, onClick) { const d = document.createElement('div'); d.className = 'die' + (kept ? ' kept' : ''); d.textContent = v ? '⚀⚁⚂⚃⚄⚅'[v - 1] : '?'; if (onClick) d.onclick = onClick; return d; }
  function knobelnRender() {
    const mid = $('#clubMid'); mid.innerHTML = '<div class="skatInfo">KNOBELN · RUNDE ' + K.round + ' · EINSATZ 1 STRICH · ' + (K.stage === 'you' ? `WURF ${K.throws} / 3 – Würfel anklicken zum Behalten` : '') + '</div>';
    const rows = document.createElement('div'); rows.className = 'diceRows';
    for (let p = 0; p < 4; p++) { const r = document.createElement('div'); r.className = 'diceRow'; const n = document.createElement('i'); n.textContent = KP[p]; r.appendChild(n); const dice = p === 0 ? K.dice : K.players[p]; for (let i = 0; i < 3; i++) r.appendChild(diceEl(dice[i] || 0, p === 0 && K.keep[i], p === 0 && K.stage === 'you' && K.throws > 0 && K.throws < 3 ? () => { K.keep[i] = !K.keep[i]; knobelnRender(); } : null)); const res = document.createElement('b'); res.textContent = dice[0] ? rankDice(dice)[2] : ''; r.appendChild(res); rows.appendChild(r); }
    mid.appendChild(rows); $('#clubHand').innerHTML = '';
    if (K.stage === 'you') buttons([{ label: K.throws ? 'NOCHMAL WÜRFELN' : 'WÜRFELN', main: true, off: K.throws >= 3, fn: knobelnThrow }, { label: 'STEHEN LASSEN', off: !K.throws, fn: knobelnStand }, { label: 'RAUS', fn: lobby }]);
    else if (K.stage === 'ende') buttons([{ label: 'NOCH E RUNDE', main: true, fn: knobelnStart }, { label: 'RAUS', fn: lobby }]);
    else buttons([{ label: 'RAUS', fn: lobby }]);
  }
  function knobelnThrow() { for (let i = 0; i < 3; i++) if (!K.keep[i] || !K.throws) K.dice[i] = 1 + Math.floor(Math.random() * 6); K.throws++; if (ctx.beep) ctx.beep(300 + Math.random() * 200, 0.05); if (K.throws >= 3) knobelnStand(); else knobelnRender(); }
  function knobelnStand() { K.players[0] = K.dice.slice(); K.stage = 'others'; knobelnRender(); let p = 1; const step = () => { if (p > 3) return knobelnEnd(); let d = [0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6)); for (let t = 0; t < 2; t++) { const r = rankDice(d); if (r[0] >= 2) break; const keepV = d.filter((x) => x === 1).length ? 1 : (d[0] === d[1] ? d[0] : d[1] === d[2] ? d[1] : d[0] === d[2] ? d[0] : Math.max(...d)); d = d.map((x) => (x === keepV ? x : 1 + Math.floor(Math.random() * 6))); } K.players[p] = d; if (Math.random() < 0.4) say(KID[p], pick(L.knobelTalk)); knobelnRender(); p++; later(step, 800); }; later(step, 600); }
  function knobelnEnd() {
    K.stage = 'ende'; const ranked = [0, 1, 2, 3].map((p) => ({ p, r: rankDice(K.players[p]) })).sort((a, b) => b.r[0] - a.r[0] || b.r[1] - a.r[1]);
    const winner = ranked[0].p, loser = ranked[ranked.length - 1].p; const strokes = winner === 0 ? 3 : loser === 0 ? -1 : 0;
    knobelnRender(); $('#clubMid').insertAdjacentHTML('afterbegin', `<div class="skatInfo big">${KP[winner]} JEWINNT MIT ${ranked[0].r[2]} · ${KP[loser]} ZAHLT${strokes ? ' · ' + (strokes > 0 ? '+' : '') + strokes + ' STRICHE' : ''}</div>`);
    if (strokes > 0) pay(strokes, pick(L.win)); else if (strokes < 0) pay(strokes, pick(L.lose)); else say('langer', `${KP[loser]} zahlt. Du kütts jrad so davon.`); ctx.stat && ctx.stat('club', 1);
  }

  // ---------------- open / close ----------------
  function open(c) { ctx = c; L = ctx.lines; drawRoom(); $('#club').hidden = false; lobby(); }
  function close() { clearTimers(); current = null; $('#club').hidden = true; }
  function key(code) { if (code === 'Escape') { if (current) lobby(); else if (ctx && ctx.onClose) ctx.onClose(); return true; } return false; }
  root.Club = { open, close, key, GAMES };
})(window);
