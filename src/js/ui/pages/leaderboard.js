// Shared leaderboard page.

import { navigateTo } from '../router.js';
import { getLeaderboard } from '../../db/queries.js';
import { getMyStableKeys } from '../../identity/identity.js';
import { announce } from '../../utils/a11y.js';
import { escapeHtml } from '../../utils/format.js';
import { haptics } from '../../native/haptics.js';

let sortBy = 'wins';

const SORTS = [
  { key: 'wins', label: 'Wins' },
  { key: 'winPct', label: 'Win %' },
  { key: 'avgScore', label: 'Avg score' },
  { key: 'bestScore', label: 'Best' },
  { key: 'gamesPlayed', label: 'Games' },
];

export async function renderLeaderboard() {
  return `
    <a href="#main" class="skip-to-main">Skip to main content</a>
    <header class="header">
      <div class="container flex-between">
        <h1 style="margin: 0;"><span aria-hidden="true">🏆</span> Leaderboard</h1>
        <button class="btn btn-outline btn-on-header" id="btn-home">Home</button>
      </div>
    </header>
    <main id="main" class="container">
      <div class="card">
        <div class="flex-between" style="flex-wrap: wrap; gap: var(--spacing-sm);">
          <div role="group" aria-label="Sort leaderboard">
            <span style="font-weight: 600; margin-right: var(--spacing-sm);">Sort by:</span>
            ${SORTS.map(s => `
              <button class="btn btn-small ${s.key === sortBy ? 'btn-primary' : 'btn-outline'}" data-sort="${s.key}" aria-pressed="${s.key === sortBy}">
                ${s.label}
              </button>`).join('')}
          </div>
          <button class="btn btn-small btn-outline" id="btn-refresh">
            <span aria-hidden="true">🔄</span> Refresh
          </button>
        </div>

        <div id="content" aria-busy="true" class="mt-lg">
          <p class="text-center">Loading leaderboard…</p>
        </div>
      </div>
      <div id="status" role="status" aria-live="polite" class="sr-only"></div>
    </main>
  `;
}

export async function setupLeaderboardHandlers() {
  document.getElementById('btn-home')?.addEventListener('click', () => navigateTo('landing'));
  document.getElementById('btn-refresh')?.addEventListener('click', () => {
    haptics.light();
    load();
  });

  document.querySelectorAll('[data-sort]').forEach((btn) => {
    btn.addEventListener('click', () => {
      haptics.select();
      sortBy = btn.dataset.sort;
      document.querySelectorAll('[data-sort]').forEach((b) => {
        const active = b.dataset.sort === sortBy;
        b.classList.toggle('btn-primary', active);
        b.classList.toggle('btn-outline', !active);
        b.setAttribute('aria-pressed', String(active));
      });
      const label = SORTS.find((s) => s.key === sortBy)?.label || sortBy;
      announce(`Sorted by ${label}, highest first`, 'polite');
      load();
    });
  });

  await load();
}

async function load() {
  const content = document.getElementById('content');
  const status = document.getElementById('status');
  const myKeys = new Set(getMyStableKeys());
  try {
    const players = await getLeaderboard({ sortBy });
    content.setAttribute('aria-busy', 'false');

    if (!players.length) {
      content.innerHTML = `
        <div class="alert alert-info">
          <h2 style="margin-top: 0;">No finished games yet</h2>
          <p>Host a game and finish it to start the leaderboard.</p>
          <button class="btn btn-primary mt-md" id="btn-host">Host a game</button>
        </div>`;
      content.querySelector('#btn-host')?.addEventListener('click', () => navigateTo('landing'));
      if (status) status.textContent = 'No finished games yet.';
      return;
    }

    const rows = players.map((p, i) => {
      const isMe = myKeys.has(p.stableKey);
      return `
        <tr${isMe ? ' class="is-me" aria-current="true"' : ''}>
          <td>${i + 1}</td>
          <th scope="row">
            ${escapeHtml(p.displayName)}
            ${isMe ? '<span class="badge badge-primary" style="margin-left: var(--spacing-sm);">You</span>' : ''}
          </th>
          <td>${p.gamesPlayed}</td>
          <td>${p.wins}</td>
          <td>${p.winPct}%</td>
          <td>${p.avgScore}</td>
          <td>${p.bestScore}</td>
          <td>
            ${isMe ? '' : `<button class="btn btn-small btn-outline" data-compare="${escapeHtml(p.stableKey)}" aria-label="Compare against ${escapeHtml(p.displayName)}">Compare</button>`}
          </td>
        </tr>`;
    }).join('');

    content.innerHTML = `
      <div class="content-fade">
        <div class="scrollable" tabindex="0" role="region" aria-label="Leaderboard table">
          <table>
          <caption class="sr-only">Shared leaderboard, sorted by ${escapeHtml(sortBy)}</caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Player</th>
              <th scope="col">Games</th>
              <th scope="col">Wins</th>
              <th scope="col">Win %</th>
              <th scope="col">Avg</th>
              <th scope="col">Best</th>
              <th scope="col"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;

    content.querySelectorAll('[data-compare]').forEach((btn) => {
      btn.addEventListener('click', () =>
        navigateTo('headtohead', { opponentKey: btn.dataset.compare })
      );
    });

    if (status) status.textContent = `Loaded ${players.length} players.`;
    haptics.success();
  } catch (e) {
    content.setAttribute('aria-busy', 'false');
    content.innerHTML = `<div class="alert alert-error"><p>Could not load leaderboard: ${escapeHtml(e.message)}</p>
      <button class="btn btn-primary mt-md" id="btn-retry">Retry</button></div>`;
    content.querySelector('#btn-retry')?.addEventListener('click', load);
  }
}
