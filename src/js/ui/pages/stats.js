// Personal stats page (+ optional account sign-in).

import { navigateTo } from '../router.js';
import { getPlayerStats } from '../../db/queries.js';
import {
  getMyStableKeys,
  getRememberedName,
  rememberName,
  getAccount,
  isSignedIn,
  signIn,
  signOut,
} from '../../identity/identity.js';
import { announce } from '../../utils/a11y.js';
import { escapeHtml, formatTimeAgo } from '../../utils/format.js';
import { haptics } from '../../native/haptics.js';
import { countUp } from '../motion.js';
import { themeSwitchMarkup, wireThemeSwitch } from '../theme.js';

export async function renderStats() {
  const remembered = getRememberedName();
  return `
    <a href="#main" class="skip-to-main">Skip to main content</a>
    <header class="header">
      <div class="container flex-between">
        <h1><span aria-hidden="true">📊</span> My Stats</h1>
        <button class="btn btn-outline btn-on-header" id="btn-home">Home</button>
      </div>
    </header>
    <main id="main" class="container">
      <div class="card card--measure mx-auto">
        <div>
          <label for="display-name">Your name (used for new games)</label>
          <div class="input-group">
            <input type="text" id="display-name" maxlength="24" value="${escapeHtml(remembered)}">
            <button class="btn btn-primary" id="btn-save-name">Save</button>
          </div>
        </div>

        <div id="content" aria-busy="true" class="mt-lg">
          <p class="text-center">Loading your stats…</p>
        </div>

        <div id="account-section" class="mt-lg"></div>
      </div>
      <div class="card card--measure mx-auto">
        <div class="settings-row"><label>Theme</label>${themeSwitchMarkup()}</div>
      </div>
      <div id="status" role="status" aria-live="polite" class="sr-only"></div>
    </main>
  `;
}

function tile(label, value, srSentence, valueId) {
  return `
    <section class="card" style="text-align: center;">
      <h3 style="font-size: var(--font-size-base); color: var(--color-text-secondary); margin-bottom: var(--spacing-sm);">${label}</h3>
      <p class="stat-tile__value"${valueId ? ` id="${valueId}"` : ''} aria-hidden="true">${value}</p>
      <span class="sr-only">${srSentence}</span>
    </section>`;
}

export async function setupStatsHandlers() {
  document.getElementById('btn-home')?.addEventListener('click', () => navigateTo('landing'));

  const nameInput = document.getElementById('display-name');
  document.getElementById('btn-save-name')?.addEventListener('click', () => {
    const v = (nameInput.value || '').trim();
    if (!v) {
      announce('Please enter a name to save', 'assertive');
      nameInput.focus();
      return;
    }
    rememberName(v);
    haptics.success();
    announce('Name saved', 'polite');
    setStatus('Name saved.');
  });

  wireThemeSwitch({ haptics, announce });

  renderAccountSection();
  await loadStats();
}

function setStatus(msg) {
  const s = document.getElementById('status');
  if (s) s.textContent = msg;
}

async function loadStats() {
  const content = document.getElementById('content');
  try {
    const stats = await getPlayerStats(getMyStableKeys());
    if (!stats.gamesPlayed) {
      content.setAttribute('aria-busy', 'false');
      content.innerHTML = `
        <div class="alert alert-info">
          <h2 style="margin-top: 0;">No games yet</h2>
          <p>Play and finish a game and your stats will show up here.</p>
          <button class="btn btn-primary mt-md" id="btn-play">Host a game</button>
        </div>`;
      content.querySelector('#btn-play')?.addEventListener('click', () => navigateTo('landing'));
      setStatus('No games played yet.');
      announce('No games played yet', 'polite');
      return;
    }

    content.setAttribute('aria-busy', 'false');
    content.innerHTML = `
      <h2>${escapeHtml(stats.displayName || 'Your record')}</h2>
      <p style="color: var(--color-text-secondary);">Last played ${formatTimeAgo(stats.lastPlayedAt)}</p>
      <div class="grid grid-2 mt-md">
        ${tile('Games Played', stats.gamesPlayed, `${stats.gamesPlayed} games played`, 'tile-games')}
        ${tile('Wins', stats.wins, `${stats.wins} wins`, 'tile-wins')}
        ${tile('Win %', stats.winPct + '%', `${stats.winPct} percent win rate`)}
        ${tile('Avg Score', stats.avgScore, `${stats.avgScore} average score`)}
        ${tile('Best Score', stats.bestScore, `${stats.bestScore} best score`, 'tile-best')}
        ${tile('Avg Rank', stats.avgRank, `${stats.avgRank} average finishing rank`)}
      </div>
      <button class="btn btn-outline btn-block mt-lg" id="btn-compare">
        <span aria-hidden="true">⚔️</span> Compare against someone
      </button>`;
    // Count up ONLY the integer tiles on their aria-hidden visible nodes.
    // (Win %, Avg Score, and Avg Rank may be decimals/percentages — leave them static.)
    countUp(content.querySelector('#tile-games'), stats.gamesPlayed);
    countUp(content.querySelector('#tile-wins'), stats.wins);
    countUp(content.querySelector('#tile-best'), stats.bestScore);
    content.querySelector('#btn-compare')?.addEventListener('click', () => navigateTo('headtohead'));
    setStatus(`Loaded stats across ${stats.gamesPlayed} games.`);
    announce(`Loaded stats across ${stats.gamesPlayed} games`, 'polite');
  } catch (e) {
    content.setAttribute('aria-busy', 'false');
    content.innerHTML = `<div class="alert alert-error"><p>Could not load stats: ${escapeHtml(e.message)}</p>
      <button class="btn btn-primary mt-md" id="btn-retry">Retry</button></div>`;
    content.querySelector('#btn-retry')?.addEventListener('click', loadStats);
  }
}

// --- Optional accounts layer (degrades silently if Auth is disabled) ---
function renderAccountSection() {
  const el = document.getElementById('account-section');
  if (!el) return;

  if (isSignedIn()) {
    const acct = getAccount();
    el.innerHTML = `
      <div class="alert alert-success">
        <p>Signed in as <strong>${escapeHtml(acct?.email || 'your account')}</strong> — your history syncs across devices.</p>
        <button class="btn btn-outline mt-md" id="btn-signout">Sign out</button>
      </div>`;
    el.querySelector('#btn-signout')?.addEventListener('click', async () => {
      await signOut();
      announce('Signed out', 'polite');
      renderAccountSection();
    });
    return;
  }

  el.innerHTML = `
    <div class="alert alert-info">
      <h3 style="margin-top: 0;">Optional: sync across devices</h3>
      <p>You're playing on this device. Sign in to keep one history across your phone, tablet, and computer.</p>
      <label for="email">Email</label>
      <div class="input-group">
        <input type="email" id="email" autocomplete="email" placeholder="you@example.com">
        <button class="btn btn-primary" id="btn-signin">Send link</button>
      </div>
    </div>`;
  el.querySelector('#btn-signin')?.addEventListener('click', async () => {
    const email = (el.querySelector('#email').value || '').trim();
    if (!email || !email.includes('@')) {
      announce('Please enter a valid email', 'assertive');
      return;
    }
    try {
      await signIn(email);
      el.querySelector('.alert').innerHTML =
        '<p>Check your email for a magic sign-in link.</p>';
      announce('Magic link sent, check your email', 'polite');
    } catch (e) {
      announce('Sign-in is not available right now', 'assertive');
      setStatus('Sign-in unavailable: ' + e.message);
    }
  });
}
