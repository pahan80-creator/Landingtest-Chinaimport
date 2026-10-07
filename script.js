'use strict';
const toggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
const dialog = document.querySelector('#consult-dialog');
let returnFocus;

function closeMenu() {
  navigation.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Открыть меню');
}
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  navigation.classList.toggle('open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);

document.querySelectorAll('[data-consult]').forEach(button => {
  button.addEventListener('click', () => {
    closeMenu();
    returnFocus = button;
    document.querySelector('#dialog-title').textContent = button.dataset.model || 'Ваш следующий автомобиль';
    dialog.showModal();
    document.body.classList.add('locked');
  });
});
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('locked');
  returnFocus?.focus();
});
document.querySelector('#year').textContent = new Date().getFullYear();

const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const headerLogo = document.querySelector('.header .brand-logo');
const logoImage = headerLogo.querySelector('img');

function rotateLogo() {
  if (!motionPreference.matches) headerLogo.classList.add('logo-spinning');
}

// Вращаем только изображение: область ссылки остаётся неподвижной.
headerLogo.addEventListener('pointerenter', event => {
  if (event.pointerType === 'mouse') rotateLogo();
});
headerLogo.addEventListener('focus', rotateLogo);
logoImage.addEventListener('animationend', event => {
  if (event.animationName === 'logo-turn') headerLogo.classList.remove('logo-spinning');
});
motionPreference.addEventListener('change', event => {
  if (event.matches) headerLogo.classList.remove('logo-spinning');
});
if (logoImage.complete && logoImage.naturalWidth > 0) rotateLogo();
else logoImage.addEventListener('load', rotateLogo, { once: true });

if ('IntersectionObserver' in window && !motionPreference.matches) {
  document.documentElement.classList.add('js');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal, .route-animated').forEach(element => observer.observe(element));
  motionPreference.addEventListener('change', event => {
    if (event.matches) {
      observer.disconnect();
      document.querySelectorAll('.reveal, .route-animated').forEach(element => element.classList.add('visible'));
    }
  });
}
