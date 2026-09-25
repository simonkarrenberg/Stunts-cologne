// Exercise the real fixed-step recharge and beat clock, with a deterministic
// media element in the served test copy. No production-only test API is added.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { once } = require('events');
const { serve, launch } = require('./helpers');

const hook = `
  window.STUNTS_BASS_RECHARGE_TEST = () => {
    const saved = { track, trackDef, phase, bassRun, audioMuted: audio.muted,
      musicMuted: music.muted, el: music.el, title: music.title, wanted: music.wanted };
    const fake = { currentTime: 150, paused: false, ended: false,
      pause() { this.paused = true; }, play() { this.paused = false; return Promise.resolve(); } };
    const gains = {}, beforeEvents = getStats().bassRuns || 0;
    try {
      trackDef = TRACKS[0]; track = TB.buildTrack(trackDef); track.shortcuts = [];
      phase = 'race'; music.el = fake;
      function prime() {
        fake.paused = true; beatNow(); // Reset the clock's last section as real paused playback does.
        fake.paused = false; fake.ended = false; fake.currentTime = 150;
        music.title = 'LamboGina'; audio.muted = music.muted = false;
        beatNow(); // Enter the drop through its actual section callback, priming the former stale flag.
      }
      function measure(ai) {
        const r = makeRacer(D.CARS[0], null, PLAYABLE[0], !!ai);
        r.s = 20; r.v = 20; r.slide = 0; r.turbo = 0.2;
        updateRacer(r, 1 / 60, { gas: 0, brake: 0, steer: 0, turbo: 0 });
        return r.turbo - 0.2;
      }
      prime(); gains.activeDrop = measure();
      prime(); fake.pause(); gains.pausedDrop = measure();
      prime(); toggleMute(); gains.mutedDrop = measure(); gains.mutePausedMedia = fake.paused;
      prime(); music.title = 'Another song'; gains.otherSong = measure();
      prime(); fake.ended = true; gains.endedSong = measure();
      prime(); fake.currentTime = 40; gains.outsideDrop = measure();
      prime(); gains.aiDrop = measure(true);
      prime(); phase = 'finished'; gains.afterFinish = measure(); phase = 'race';
      prime(); fake.pause(); measure(); fake.play(); gains.resumedDrop = measure();
      gains.base = (1 / 60) * 0.035 * (0.6 + D.CARS[0].nitro * 0.12);
      gains.dropEvents = (getStats().bassRuns || 0) - beforeEvents;
      return gains;
    } finally {
      track = saved.track; trackDef = saved.trackDef; phase = saved.phase; bassRun = saved.bassRun;
      audio.muted = saved.audioMuted; music.muted = saved.musicMuted; music.el = saved.el;
      music.title = saved.title; music.wanted = saved.wanted;
      document.body.classList.remove('bassrun');
    }
  };
`;

module.exports = async function () {
  const server = serve(0), errors = [];
  let browser;
  try {
    if (!server.listening) await once(server, 'listening');
    browser = await launch();
    const context = await browser.newContext({ viewport: { width: 844, height: 500 }, serviceWorkers: 'block' });
    await context.addInitScript(() => {
      window.STUNTS_IDLE = 99999;
      localStorage.setItem('stuntskoelle.voice', 'off');
      localStorage.setItem('stuntskoelle.jukebox', 'off');
    });
    const source = fs.readFileSync(path.join(__dirname, '../js/game.js'), 'utf8'), marker = 'window.STUNTS_FIELD =';
    assert.strictEqual(source.split(marker).length, 2, 'private test hook must have exactly one insertion point');
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/js/game.js', (route) => route.fulfill({ contentType: 'text/javascript', body: source.replace(marker, hook + marker) }));
    await page.goto(`http://localhost:${server.address().port}/`);
    await page.waitForFunction(() => typeof window.STUNTS_BASS_RECHARGE_TEST === 'function');
    const result = await page.evaluate(() => STUNTS_BASS_RECHARGE_TEST());
    for (const key of ['activeDrop', 'resumedDrop']) assert(Math.abs(result[key] - 2 * result.base) < 1e-10, `${key}: audible LamboGina drop must double recharge`);
    for (const key of ['pausedDrop', 'mutedDrop', 'otherSong', 'endedSong', 'outsideDrop', 'aiDrop', 'afterFinish']) {
      assert(Math.abs(result[key] - result.base) < 1e-10, `${key}: recharge must remain at its normal rate`);
    }
    assert(result.mutePausedMedia, 'the existing mute action must still pause playback');
    assert(result.dropEvents > 0, 'the original bass-section events and stats must still fire');
    assert.deepStrictEqual(errors, [], 'no browser exceptions');
    return { name: 'bass-recharge', ok: true, lines: [
      'Active/resumed LamboGina drop doubles recharge; pause, mute, another song, song end and ordinary sections do not',
      'Rivals and finished races receive no bonus; existing mute behavior and bass-section events are preserved'
    ] };
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
};
