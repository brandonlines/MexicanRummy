// ===== src/js/ui/theme.js =====
// Dual-theme controller. data-theme="ios" (default) | "cozy" on <html>.
// The pre-paint bootstrap in index.html sets the attribute before first paint
// (no FOUC); this module handles user switching + persistence.
const KEY = 'mr-theme';
const THEMES = ['ios', 'cozy'];

export function getTheme() {
  const t = document.documentElement.getAttribute('data-theme');
  return THEMES.includes(t) ? t : 'ios';
}

export function setTheme(theme, { animate = true } = {}) {
  if (!THEMES.includes(theme)) theme = 'ios';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const apply = () => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(KEY, theme); } catch (e) {}
    ensureCozyFontPreload(theme); syncThemeColorMeta();
  };
  if (animate && !reduce) {
    const veil = document.createElement('div'); veil.className = 'theme-fade-veil';
    // SNAPSHOT the current bg so the veil color stays constant through the fade
    // (don't bind to var(--color-bg) that apply() is about to change).
    veil.style.background = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim() || '#000';
    document.body.appendChild(veil);
    setTimeout(apply, 125);                                 // swap tokens at veil midpoint
    veil.addEventListener('animationend', () => veil.remove(), { once: true });
  } else { apply(); }
}

export function toggleTheme() { setTheme(getTheme() === 'ios' ? 'cozy' : 'ios'); }

function ensureCozyFontPreload(theme) {
  if (theme !== 'cozy') return;
  if (document.querySelector('link[data-cozy-font]')) return;
  ['/fonts/Fraunces-SemiBold.woff2', '/fonts/Fraunces-Bold.woff2'].forEach(href => {
    const l = document.createElement('link'); l.rel = 'preload'; l.as = 'font'; l.type = 'font/woff2';
    l.href = href; l.crossOrigin = 'anonymous'; l.setAttribute('data-cozy-font', ''); document.head.appendChild(l);
  });
}

function syncThemeColorMeta() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--color-header-bg').trim();
  if (!bg) return;
  let m = document.querySelector('meta[name="theme-color"]:not([media])');
  if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
  m.setAttribute('content', bg);
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncThemeColorMeta);

// Shared markup + wiring helpers so every page renders an identical, correct control.
export function themeSwitchMarkup() {
  return `
    <div class="theme-switch" role="group" aria-label="Color theme">
      <button id="theme-ios" class="btn btn-small" data-set-theme="ios" aria-pressed="${getTheme() === 'ios'}">iOS</button>
      <button id="theme-cozy" class="btn btn-small" data-set-theme="cozy" aria-pressed="${getTheme() === 'cozy'}">Cozy</button>
    </div>`;
}

export function wireThemeSwitch({ haptics, announce } = {}) {
  document.querySelectorAll('[data-set-theme]').forEach(b => b.addEventListener('click', () => {
    const name = b.dataset.setTheme;
    setTheme(name);
    document.querySelectorAll('[data-set-theme]').forEach(x =>
      x.setAttribute('aria-pressed', String(x.dataset.setTheme === name)));
    haptics?.light?.();
    announce?.(`Theme set to ${name === 'ios' ? 'iOS' : 'Cozy'}`, 'polite');
  }));
}
