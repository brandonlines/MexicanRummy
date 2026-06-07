// ===== src/js/ui/motion.js =====
export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Page-enter, gated on an ACTUAL page change. Called from router.navigateTo only
// when {animate:true} AND pageName !== the previously rendered page. This is the
// fix for game.js's per-realtime-push re-renders: those pass {animate:false}, so
// the whole board never re-slides-in during play.
export function playPageEnter(app) {
  if (!app || prefersReducedMotion()) return;
  app.classList.remove('page-enter');
  void app.offsetWidth;                 // reflow so the animation restarts
  app.classList.add('page-enter');
  // Clean up after the LAST direct child finishes (header+main = 2 children),
  // counting completions rather than removing on the first one.
  const children = app.children.length || 1;
  let done = 0;
  app.addEventListener('animationend', function onEnd(e) {
    if (e.target.parentElement !== app) return;
    if (++done >= children) { app.classList.remove('page-enter'); app.removeEventListener('animationend', onEnd); }
  });
}

// Count-up for INTEGER scores/stats only. Mutates ONLY the visible (aria-hidden)
// node; the parallel .sr-only sentence stays the SR source of truth.
// IMPORTANT: do NOT use on percentage ('57%') or decimal (avgRank '2.3') tiles —
// Number('57%') is NaN and Math.round corrupts decimals. Caller picks integer tiles.
export function countUp(el, to, { from = 0, duration } = {}) {
  if (!el) return;
  to = Number(to);
  if (!Number.isFinite(to)) { return; }            // guard: never blank a non-numeric tile
  if (prefersReducedMotion()) { el.textContent = String(to); return; }
  const ms = duration ??
    (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dur-countup')) || 700);
  const start = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3);   // easeOutCubic
  (function frame(now) {
    const p = Math.min(1, (now - start) / ms);
    el.textContent = String(Math.round(from + (to - from) * ease(p)));
    if (p < 1) requestAnimationFrame(frame); else el.textContent = String(to);
  })(performance.now());
}

// Flash a single score CELL on realtime change. Caller is responsible for
// reading prev from the live DOM BEFORE patching, so this works only with the
// surgical-patch path (NOT a full re-render, which destroys the prev value).
export function flashNumber(el, newValue) {
  if (!el) return;
  const prev = parseInt(el.textContent, 10);
  el.textContent = String(newValue);
  if (prefersReducedMotion() || isNaN(prev) || prev === Number(newValue)) return;
  el.classList.remove('num-flash'); void el.offsetWidth; el.classList.add('num-flash');
}
