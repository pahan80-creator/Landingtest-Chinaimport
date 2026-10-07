const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');

function setup({ reduced = false } = {}) {
  const elements = new Map();
  const timers = new Map();
  const frames = new Map();
  const observers = [];
  const media = new Map();
  let id = 0;
  let now = 10000;
  function element(name) {
    if (elements.has(name)) return elements.get(name);
    const classes = new Set();
    const attrs = new Map();
    const listeners = new Map();
    const e = {
      dataset: {}, hidden: true, textContent: '', readyState: 1,
      naturalWidth: 1536, complete: true, currentTime: 0, paused: true,
      open: false, playCalls: 0, offsetWidth: 800,
      classList: {
        add: (...names) => names.forEach(n => classes.add(n)),
        remove: (...names) => names.forEach(n => classes.delete(n)),
        contains: n => classes.has(n),
        toggle(n, on = !classes.has(n)) { on ? classes.add(n) : classes.delete(n); return on; },
      },
      setAttribute: (n, v) => attrs.set(n, v),
      getAttribute: n => attrs.get(n),
      removeAttribute: n => attrs.delete(n),
      addEventListener(n, cb) {
        if (!listeners.has(n)) listeners.set(n, []);
        listeners.get(n).push(cb);
      },
      emit(n, event = {}) { for (const cb of listeners.get(n) || []) cb(event); },
      querySelector: n => element(name + ' ' + n),
      querySelectorAll: () => [],
      focus() { document.activeElement = e; },
      showModal() { e.open = true; },
      close() { e.open = false; e.emit('close'); },
      pause() { e.paused = true; },
      play() { e.playCalls++; e.paused = false; return e.nextPlay ? e.nextPlay() : Promise.resolve(); },
    };
    elements.set(name, e);
    return e;
  }
  element('.saving-number').dataset.count = '30';
  element('.saving-number').textContent = '30';
  element('.facts').classList.add('facts');
  element('.model-button').dataset.model = 'Mazda CX-5';
  element('.menu-button').setAttribute('aria-expanded', 'false');
  const document = {
    hidden: false, body: element('body'), documentElement: element('html'),
    querySelector: element,
    querySelectorAll(selector) {
      if (selector === '[data-consult]') return [element('.model-button')];
      if (selector.includes('.facts')) return [element('.facts'), element('.reveal')];
      if (selector === '.reveal') return [element('.reveal')];
      return [];
    },
    addEventListener: (...args) => element('document').addEventListener(...args),
  };
  const matchMedia = query => {
    if (!media.has(query)) {
      const listeners = [];
      media.set(query, {
        matches: query.includes('reduce') && reduced,
        addEventListener: (name, cb) => listeners.push(cb),
        change(value) { this.matches = value; listeners.forEach(cb => cb({ matches: value })); },
      });
    }
    return media.get(query);
  };
  class IntersectionObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    unobserve() {}
    disconnect() { this.disconnected = true; }
  }
  vm.runInNewContext(source, {
    document, window: { IntersectionObserver }, IntersectionObserver, matchMedia, Date,
    performance: { now: () => now },
    setTimeout(cb) { timers.set(++id, cb); return id; },
    clearTimeout(n) { timers.delete(n); },
    requestAnimationFrame(cb) { frames.set(++id, cb); return id; },
    cancelAnimationFrame(n) { frames.delete(n); },
  });
  return {
    element, document, observers,
    click: n => element(n).emit('click'),
    hover() { now += 4000; element('[data-engine-car]').emit('pointerenter', { pointerType: 'mouse' }); },
    endEngine() { for (const [n, cb] of [...timers]) { timers.delete(n); cb(); } },
    reduce() { matchMedia('(prefers-reduced-motion: reduce)').change(true); },
    frame(time) { const [n, cb] = frames.entries().next().value; frames.delete(n); cb(time); },
  };
}

test('hover is silent before an explicit click; startup finishes and resets', () => {
  const app = setup();
  app.hover();
  assert.equal(app.element('#engine-audio').playCalls, 0);
  assert.equal(app.element('[data-engine-car]').classList.contains('engine-running'), true);
  app.endEngine();
  assert.equal(app.element('[data-engine-car]').classList.contains('engine-running'), false);
  assert.equal(app.element('#start-engine').getAttribute('aria-busy'), undefined);
});

test('start enables audio, and an explicit mute survives later hovers and clicks', () => {
  const app = setup();
  app.click('#start-engine');
  const audio = app.element('#engine-audio');
  assert.equal(audio.playCalls, 1);
  assert.equal(app.element('#engine-sound').getAttribute('aria-pressed'), 'true');
  app.click('#engine-sound');
  assert.equal(audio.paused, true);
  app.endEngine();
  app.hover();
  app.click('#start-engine');
  assert.equal(audio.playCalls, 1);
  assert.equal(app.element('#engine-sound').getAttribute('aria-pressed'), 'false');
});

test('blocked playback leaves an available animation and a retry path', async () => {
  const app = setup();
  app.element('#engine-audio').nextPlay = () => Promise.reject({ name: 'NotAllowedError' });
  app.click('#start-engine');
  await Promise.resolve();
  assert.equal(app.element('#engine-sound').getAttribute('aria-pressed'), 'false');
  assert.match(app.element('#engine-status').textContent, /ещё раз/);
  assert.equal(app.element('[data-engine-car]').classList.contains('engine-running'), true);
});

test('a stale play rejection cannot change the choice made by a later mute', async () => {
  const app = setup();
  let reject;
  app.element('#engine-audio').nextPlay = () => new Promise((resolve, no) => { reject = no; });
  app.click('#start-engine');
  app.click('#engine-sound');
  reject({ name: 'NotAllowedError' });
  await Promise.resolve();
  assert.match(app.element('#engine-status').textContent, /Звук выключен/);
});

test('opening consultation stops the engine and restores focus after closing', () => {
  const app = setup();
  app.click('#start-engine');
  app.click('.model-button');
  assert.equal(app.element('#engine-audio').paused, true);
  assert.equal(app.element('#consult-dialog').open, true);
  assert.equal(app.element('#dialog-title').textContent, 'Mazda CX-5');
  assert.equal(app.document.body.classList.contains('locked'), true);
  app.click('.close-dialog');
  assert.equal(app.document.body.classList.contains('locked'), false);
  assert.equal(app.document.activeElement, app.element('.model-button'));
});

test('leaving the page stops sound and startup', () => {
  const app = setup();
  app.click('#start-engine');
  app.document.hidden = true;
  app.element('document').emit('visibilitychange');
  assert.equal(app.element('#engine-audio').paused, true);
  assert.equal(app.element('[data-engine-car]').classList.contains('engine-running'), false);
});

test('savings reaches 30 once, and reduced motion reveals the final value', () => {
  const app = setup();
  assert.equal(app.element('.saving-number').textContent, '0');
  app.observers[0].callback([{ isIntersecting: true, target: app.element('.facts') }]);
  app.frame(0);
  app.frame(750);
  assert.ok(Number(app.element('.saving-number').textContent) > 0);
  app.frame(1500);
  assert.equal(app.element('.saving-number').textContent, '30');
  app.reduce();
  assert.equal(app.element('.saving-value').classList.contains('count-complete'), false);
  assert.equal(app.element('.reveal').classList.contains('visible'), true);
  const reduced = setup({ reduced: true });
  assert.equal(reduced.element('.saving-number').textContent, '30');
});
