/* ============================================================
   STUNTS KÖLLE 4D — LamboGina, the song the city moves to.
   A beat clock for music/lamborghina.mp3: 130 BPM, four to the floor,
   centred on C, punchy verses, two risers and a long, dark bass section
   (2:24–2:55) before the last verse. The map below was measured from the
   audio (kick strength per beat 0–9, section starts in seconds) so neon,
   lights, the menu and the cars pulse with the actual song.
   Any other song the player loads gets a plain 128 BPM pulse.
   ============================================================ */
(function (root) {
  'use strict';
  const SONG = {
    title: 'LamboGina', bpm: 130, offset: 0.012, length: 222.98,
    // [start second, section]: a = verse (punchy kick, bright), b = full hook, rise = riser/break,
    // drop = the heavy bass run, end = fade
    sections: [[0, 'a'], [29.55, 'b'], [51.7, 'a'], [72.0, 'rise'], [73.85, 'b'], [97.85, 'a'], [120.0, 'rise'], [121.85, 'b'],
      [144.0, 'drop'], [175.4, 'rise'], [177.25, 'a'], [219.7, 'end']],
    kick: '004681828283828382839284819283929386928492938193819443449393939484849495737483858584938482838582828492848486808380837273808491828192849393869271819381827183343384848394758485858483758573838394828483848285838481848182809380818184918180818383938692808191809371931323848583947184939481848385708483927083838282839383908693949395949559938594849584958486949594959495499384958495849573867183808381838084928181928483938692818193819270866882808472848084918281938494938692828184819271842323400'
  };
  const ENERGY = { a: 0.55, b: 0.8, rise: 0.35, drop: 1, end: 0.2 };
  let source = null; // () => { el, title }
  let lastSection = null; const listeners = [];

  function sectionAt(t) {
    let s = SONG.sections[0], next = null;
    for (let i = 0; i < SONG.sections.length; i++) { if (SONG.sections[i][0] <= t) { s = SONG.sections[i]; next = SONG.sections[i + 1] || null; } }
    return { name: s[1], start: s[0], end: next ? next[0] : SONG.length };
  }

  const LamboBeat = root.LamboBeat = {
    song: SONG,
    attach(fn) { source = fn; },
    onSection(fn) { listeners.push(fn); },
    // Everything the city needs this frame: beat phase, a pulse that jumps to 1 on every kick and decays,
    // the song section and an overall energy (0..1). `playing` is false when no song runs (muted, menu
    // without sound): the visuals then idle gently instead of pumping to a song nobody hears.
    now() {
      const m = source ? source() : null, el = m && m.el;
      const playing = !!(el && !el.paused && !el.ended && el.currentTime > 0);
      const ours = playing && m.title === SONG.title;
      const t = playing ? el.currentTime : performance.now() / 1000;
      const bpm = ours ? SONG.bpm : 128, off = ours ? SONG.offset : 0;
      const bf = Math.max(0, (t - off) * bpm / 60), beat = Math.floor(bf), phase = bf - beat;
      let kick = 0.8, section = 'a', energy = playing ? 0.6 : 0.25, rise = 0;
      if (ours) {
        kick = (parseInt(SONG.kick[beat] || '0', 10) || 0) / 9;
        const sec = sectionAt(t); section = sec.name; energy = ENERGY[section];
        if (section === 'rise') { rise = Math.min(1, (t - sec.start) / Math.max(0.5, sec.end - sec.start)); energy = 0.35 + rise * 0.65; }
      }
      const pulse = (playing ? kick : 0.35) * Math.exp(-phase * 6);
      if (ours && section !== lastSection) { const prev = lastSection; lastSection = section; for (const fn of listeners) { try { fn(section, prev); } catch (e) { /* ignore */ } } }
      if (!ours) lastSection = null;
      return { t, bpm, beat, bar: Math.floor(beat / 4), phase, pulse, kick, section, energy, rise, playing, song: ours };
    }
  };
})(window);
