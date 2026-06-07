// Simple page router.
//
// A page is registered as { render(params) -> htmlString, setup?(params) }.
// navigateTo() injects the rendered HTML, manages focus + an a11y
// announcement, then calls setup(params) deterministically — exactly once,
// with the same params. (No MutationObserver, no innerHTML string-matching.)

import { announce } from '../utils/a11y.js';
import { playPageEnter } from './motion.js';

const pages = new Map();
let currentPage = null;
let currentParams = {};
let lastRendered = null;

export function registerPage(name, page) {
  pages.set(name, {
    render: page.render,
    setup: page.setup || (async () => {}),
  });
}

export async function navigateTo(pageName, params = {}, opts = {}) {
  const page = pages.get(pageName);
  if (!page) {
    console.error(`Page "${pageName}" not registered`);
    return;
  }
  const app = document.getElementById('app');
  if (!app) {
    console.error('App container not found');
    return;
  }

  currentPage = pageName;
  currentParams = params;
  const isPageChange = pageName !== lastRendered;

  try {
    app.innerHTML = await page.render(params); // render returns a STRING

    const main = document.querySelector('main');
    if (main) {
      if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
      // Move focus for screen-reader users without scrolling the branded
      // header off-screen (preventScroll keeps the gradient title bar visible
      // on load, especially on mobile where the header is tall).
      main.focus({ preventScroll: true });
    }

    const title = document.querySelector('h1, h2');
    if (title) announce(`Navigated to ${title.textContent}`, 'polite');

    // Animate ONLY on a real page change, and only when the caller didn't opt
    // out. game.js realtime callbacks pass {animate:false} so the board doesn't
    // re-slide-in on every score/hand push.
    if (isPageChange && opts.animate !== false) playPageEnter(app);
    lastRendered = pageName;

    await page.setup(params); // explicit, scoped, exactly-once
  } catch (error) {
    console.error(`Error rendering page "${pageName}":`, error);
    app.innerHTML =
      '<main class="container"><div class="alert alert-error">' +
      '<h2>Error loading page</h2><p>' +
      (error && error.message ? error.message : String(error)) +
      '</p></div></main>';
  }
}

export function getCurrentPage() {
  return currentPage;
}

export function getCurrentParams() {
  return currentParams;
}
