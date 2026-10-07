'use strict';

const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const toggle = document.querySelector('.menu-button');
const navigation = document.querySelector('#navigation');
const dialog = document.querySelector('#consult-dialog');
let returnFocus;

function closeMenu() {
  navigation.classList.remove('expanded');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Открыть меню');
}

toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  navigation.classList.toggle('expanded', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMenu();
});
matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);

document.querySelectorAll('[data-consult]').forEach(button => {
  button.addEventListener('click', () => {
    closeMenu();
    finishEngine();
    returnFocus = button;
    document.querySelector('#dialog-title').textContent = button.dataset.model || 'Найдём ваш автомобиль.';
    dialog.showModal();
    document.body.classList.add('locked');
  });
});
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('locked');
  returnFocus?.focus();
});
document.querySelector('#year').textContent = new Date().getFullYear();

const headerLogo = document.querySelector('.topbar .brand-mark');
const logoImage = headerLogo.querySelector('img');
function rotateLogo() {
  if (!motionPreference.matches) headerLogo.classList.add('spinning');
}
headerLogo.addEventListener('pointerenter', event => {
  if (event.pointerType === 'mouse') rotateLogo();
});
headerLogo.addEventListener('focus', rotateLogo);
logoImage.addEventListener('animationend', event => {
  if (event.animationName === 'logo-revolve') headerLogo.classList.remove('spinning');
});
if (logoImage.complete && logoImage.naturalWidth > 0) rotateLogo();
else logoImage.addEventListener('load', rotateLogo, { once: true });

const savingValue = document.querySelector('.saving-value');
const savingNumber = document.querySelector('.saving-number');
const savingTarget = Number(savingNumber.dataset.count);
let savingFrame = 0;
let savingStarted = false;
function finishSavingCount(highlight = false) {
  cancelAnimationFrame(savingFrame);
  savingFrame = 0;
  savingNumber.textContent = String(savingTarget);
  savingValue.classList.toggle('count-complete', highlight && !motionPreference.matches);
}
function animateSavings() {
  if (savingStarted) return;
  savingStarted = true;
  if (motionPreference.matches) return finishSavingCount();
  let startedAt;
  function update(timestamp) {
    if (startedAt === undefined) startedAt = timestamp;
    const progress = Math.min((timestamp - startedAt) / 1500, 1);
    savingNumber.textContent = String(Math.floor(savingTarget * (1 - Math.pow(1 - progress, 3))));
    if (progress < 1) savingFrame = requestAnimationFrame(update);
    else finishSavingCount(true);
  }
  savingFrame = requestAnimationFrame(update);
}
savingValue.addEventListener('animationend', event => {
  if (event.animationName === 'percentage-glow') savingValue.classList.remove('count-complete');
});

if ('IntersectionObserver' in window && !motionPreference.matches) {
  document.documentElement.classList.add('js');
  savingNumber.textContent = '0';
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        if (entry.target.classList.contains('facts')) animateSavings();
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal, .facts').forEach(element => observer.observe(element));
  motionPreference.addEventListener('change', event => {
    if (event.matches) {
      observer.disconnect();
      document.querySelectorAll('.reveal').forEach(element => element.classList.add('visible'));
    }
  });
}

const car = document.querySelector('[data-engine-car]');
const engineAudio = document.querySelector('#engine-audio');
const startButton = document.querySelector('#start-engine');
const soundButton = document.querySelector('#engine-sound');
const engineStatus = document.querySelector('#engine-status');
let soundEnabled = false;
let soundPreferenceSet = false;
let engineRunning = false;
let engineTimer = 0;
let lastEngineStart = -Infinity;
let audioRequest = 0;
engineAudio.volume = 0.35;
document.querySelector('.engine-panel').hidden = false;

function updateSoundButton() {
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  soundButton.textContent = soundEnabled ? 'Звук: вкл.' : 'Звук: выкл.';
}
function stopEngineSound() {
  // Ignore the result of an older play request after mute/closing the dialog.
  audioRequest += 1;
  engineAudio.pause();
  if (engineAudio.readyState > 0) engineAudio.currentTime = 0;
}
function finishEngine() {
  clearTimeout(engineTimer);
  engineTimer = 0;
  engineRunning = false;
  car.classList.remove('engine-running');
  startButton.removeAttribute('aria-busy');
  stopEngineSound();
  engineStatus.textContent = soundEnabled
    ? 'Наведите на автомобиль — звук включён.'
    : soundPreferenceSet
      ? 'Звук выключен. Его можно включить кнопкой «Звук».'
      : 'Наведите на машину. Кнопка «Завести» включит звук.';
}
function playEngineSound() {
  const request = ++audioRequest;
  engineAudio.currentTime = 0;
  engineAudio.play().catch(error => {
    if (request !== audioRequest || error.name === 'AbortError') return;
    soundEnabled = false;
    soundPreferenceSet = false;
    updateSoundButton();
    engineStatus.textContent = 'Для звука нажмите «Завести двигатель» ещё раз.';
  });
}
function startEngine(userInitiated = false) {
  if (document.hidden || dialog.open) return;
  const now = performance.now();
  if (!userInitiated && (engineRunning || now - lastEngineStart < 3400)) return;
  if (engineRunning) {
    finishEngine();
    // A deliberate second click can restart the effect without a visual jump.
    void car.offsetWidth;
  }
  engineRunning = true;
  lastEngineStart = now;
  car.classList.add('engine-running');
  startButton.setAttribute('aria-busy', 'true');
  engineStatus.textContent = 'Запускаем двигатель…';
  if (soundEnabled) playEngineSound();
  engineTimer = setTimeout(finishEngine, 2850);
}
car.addEventListener('pointerenter', event => {
  if (event.pointerType === 'mouse') startEngine();
});
startButton.addEventListener('click', () => {
  // Only an explicit click unlocks audio; the first hover is always silent.
  if (!soundPreferenceSet) {
    soundEnabled = true;
    soundPreferenceSet = true;
    updateSoundButton();
  }
  startEngine(true);
});
soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundPreferenceSet = true;
  updateSoundButton();
  if (soundEnabled) startEngine(true);
  else {
    stopEngineSound();
    engineStatus.textContent = 'Звук выключен. Анимация при наведении работает.';
  }
});

motionPreference.addEventListener('change', event => {
  if (event.matches) {
    headerLogo.classList.remove('spinning');
    finishSavingCount();
    finishEngine();
  }
});
document.addEventListener('visibilitychange', () => {
  document.documentElement.classList.toggle('page-hidden', document.hidden);
  if (document.hidden) finishEngine();
});
if ('IntersectionObserver' in window) {
  const band = document.querySelector('.delivery-band');
  const routeObserver = new IntersectionObserver(entries => {
    band.classList.toggle('offscreen', !entries[0].isIntersecting);
  });
  routeObserver.observe(band);
}
