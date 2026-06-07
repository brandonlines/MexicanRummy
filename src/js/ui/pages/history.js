// Game history page (list of finished games with expandable detail).

import { navigateTo } from '../router.js';
import { getGameHistory, getGameHistoryDetail } from '../../db/queries.js';
import { announce } from '../../utils/a11y.js';
import { escapeHtml, formatDate, formatTimeAgo } from '../../utils/format.js';
import { haptics } from '../../native/haptics.js';

const PAGE_SIZE = 30;
let oldestShown = null; // finished_at of the last row, for keyset paging

export async function renderHistory() {
  return `
    <a href="#main" class="skip-to-main">Skip to main content</a>
    <header class="header">
      <div class="container flex-between">
        <h1 style="margin: 0;"><span aria-hidden="true">📜</span> Game History</h1>
        <button class="btn btn-outline btn-on-header" id="btn-home">Home</button>
      </div>
    </header>
    <main id="main" class="container">
      <div id="content" aria-busy="true">
        <p class="text-center">Loading history…</p>
      </div>
      <div id="more-wrap" class="text-center mt-lg"></div>
      <div id="status" role="status" aria-live="polite" class="sr-only"></div>
    </main>
  `;
}

export async function setupHistoryHandlers() {
  document.getElementById('btn-home')?.addEventListener('click', () => navigateTo('landing'));
  oldestShown = null;
  await loadFirst();
}

function setStatus(msg) {
  const s = document.getElementById('status');
  if (s) s.textContent = msg;
}

async function loadFirst() {
  const content = document.getElementById('content');
  try {
    const games = await getGameHistory({ limit: PAGE_SIZE });
    content.setAttribute('aria-busy', 'false');

    if (!games.length) {
      content.innerHTML = `
        <div class="card mx-auto" style="max-width: 600px;">
          <div class="alert alert-info" style="margin: 0;">
            <h2 style="margin-top: 0;">No finished games yet</h2>
            <p>Once you finish a game it will appear here.</p>
            <button class="btn btn-primary mt-md" id="btn-host">Host a game</button>
          </div>
        </div>`;
      content.querySelector('#btn-host')?.addEventListener('click', () => navigateTo('landing'));
      setStatus('No finished games yet.');
      return;
    }

    content.innerHTML = `<ul class="plain-list" id="history-list"></ul>`;
    appendRows(games);
    setStatus(`Loaded ${games.length} games.`);
    announce(`Loaded ${games.length} games`, 'polite');
  } catch (e) {
    content.setAttribute('aria-busy', 'false');
    content.innerHTML = `<div class="card mx-auto" style="max-width:600px;"><div class="alert alert-error" style="margin:0;">
      <p>Could not load history: ${escapeHtml(e.message)}</p>
      <button class="btn btn-primary mt-md" id="btn-retry">Retry</button></div></div>`;
    content.querySelector('#btn-retry')?.addEventListener('click', loadFirst);
  }
}

function appendRows(games, isNew = false) {
  const list = document.getElementById('history-list');
  for (const g of games) {
    const li = document.createElement('li');
    li.className = isNew ? 'card mx-auto mb-md is-new' : 'card mx-auto mb-md';
    li.style.maxWidth = '600px';
    const detailId = `detail-${g.gameId}`;
    li.innerHTML = `
      <div class="flex-between" style="gap: var(--spacing-md); flex-wrap: wrap;">
        <div>
          <div style="font-weight: 600;">${escapeHtml(formatDate(g.finishedAt))}</div>
          <div style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">${formatTimeAgo(g.finishedAt)}</div>
          <div class="mt-sm">
            <span class="badge badge-success">Winner: ${escapeHtml(g.winnerName || '—')}</span>
            <span class="badge badge-primary" style="margin-left: var(--spacing-xs);">${g.playerCount} players</span>
          </div>
        </div>
        <button class="btn btn-small btn-outline" aria-expanded="false" aria-controls="${detailId}"
          aria-label="View results for game won by ${escapeHtml(g.winnerName || 'unknown')} on ${escapeHtml(formatDate(g.finishedAt))}">
          View results
        </button>
      </div>
      <div id="${detailId}" role="region" aria-label="Results for game ${escapeHtml(g.code || '')}" class="detail-region mt-md">
        <div></div>
      </div>`;

    const btn = li.querySelector('button');
    const region = li.querySelector(`#${CSS.escape(detailId)}`);
    btn.addEventListener('click', () => toggleDetail(btn, region, g.gameId));
    list.appendChild(li);
    oldestShown = g.finishedAt;
  }
  renderMoreButton(games.length);
}

function renderMoreButton(lastCount) {
  const wrap = document.getElementById('more-wrap');
  if (!wrap) return;
  if (lastCount < PAGE_SIZE) {
    wrap.innerHTML = '';
    return;
  }
  wrap.innerHTML = '<button class="btn btn-outline" id="btn-more">Load more</button>';
  wrap.querySelector('#btn-more')?.addEventListener('click', async (e) => {
    const moreBtn = e.target;
    moreBtn.disabled = true;
    moreBtn.textContent = 'Loading…';
    try {
      const games = await getGameHistory({ limit: PAGE_SIZE, before: oldestShown });
      if (!games.length) {
        wrap.innerHTML = '<p style="color: var(--color-text-secondary);">No more games.</p>';
        return;
      }
      const firstNewId = games[0].gameId;
      appendRows(games, true);
      haptics.light();
      // Keep keyboard focus near the newly loaded rows.
      document.querySelector(`#detail-${CSS.escape(firstNewId)}`)?.previousElementSibling
        ?.querySelector('button')?.focus();
      setStatus(`Loaded ${games.length} more games.`);
    } catch (err) {
      wrap.innerHTML = `<p class="alert alert-error">Could not load more: ${escapeHtml(err.message)}</p>`;
    }
  });
}

async function toggleDetail(btn, region, gameId) {
  haptics.select();
  const isOpen = btn.getAttribute('aria-expanded') === 'true';
  const inner = region.firstElementChild;
  if (isOpen) {
    btn.setAttribute('aria-expanded', 'false');
    region.classList.remove('is-open');
    return;
  }

  btn.setAttribute('aria-expanded', 'true');
  region.classList.add('is-open');

  if (region.dataset.loaded) return; // load once
  inner.innerHTML = '<p>Loading results…</p>';
  try {
    const { players } = await getGameHistoryDetail(gameId);
    region.dataset.loaded = '1';
    inner.innerHTML = `
      <div class="scrollable" tabindex="0" role="region" aria-label="Final standings">
      <table>
        <caption class="sr-only">Final standings</caption>
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Player</th>
            <th scope="col">Score</th>
            <th scope="col">Hands</th>
          </tr>
        </thead>
        <tbody>
          ${players.map((p) => `
            <tr${p.rank <= 3 ? ` class="rank-${p.rank}"` : ''}>
              <td>${p.rank}${medal(p.rank)}</td>
              <th scope="row" style="text-align:left;">${escapeHtml(p.display_name)}</th>
              <td>${p.score}</td>
              <td>${p.hands_completed}/10</td>
            </tr>`).join('')}
        </tbody>
      </table>
      </div>`;
  } catch (e) {
    inner.innerHTML = `<p class="alert alert-error">Could not load results: ${escapeHtml(e.message)}</p>`;
  }
}

function medal(rank) {
  // Text label kept in the rank cell; emoji is decorative only.
  if (rank === 1) return ' <span aria-hidden="true">🥇</span>';
  if (rank === 2) return ' <span aria-hidden="true">🥈</span>';
  if (rank === 3) return ' <span aria-hidden="true">🥉</span>';
  return '';
}
