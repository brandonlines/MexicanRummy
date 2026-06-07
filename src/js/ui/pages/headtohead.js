// Head-to-head comparison page.

import { navigateTo } from '../router.js';
import { getLeaderboard, getHeadToHead } from '../../db/queries.js';
import { getMyStableKeys } from '../../identity/identity.js';
import { announce } from '../../utils/a11y.js';
import { escapeHtml, formatTimeAgo } from '../../utils/format.js';

let opponents = [];

export async function renderHeadToHead() {
  return `
    <a href="#main" class="skip-to-main">Skip to main content</a>
    <header class="header">
      <div class="container flex-between">
        <h1 style="margin: 0;"><span aria-hidden="true">⚔️</span> Head to Head</h1>
        <button class="btn btn-outline btn-on-header" id="btn-home">Home</button>
      </div>
    </header>
    <main id="main" class="container">
      <div class="card card--measure mx-auto">
        <label for="opponent">Compare against</label>
        <select id="opponent">
          <option value="">Choose an opponent…</option>
        </select>

        <div id="content" aria-busy="false" class="mt-lg">
          <p class="text-center" style="color: var(--color-text-secondary);">Pick an opponent to see your record.</p>
        </div>
      </div>
      <div id="status" role="status" aria-live="polite" class="sr-only"></div>
    </main>
  `;
}

export async function setupHeadToHeadHandlers(params) {
  document.getElementById('btn-home')?.addEventListener('click', () => navigateTo('landing'));

  const select = document.getElementById('opponent');
  const myKeys = new Set(getMyStableKeys());

  try {
    const players = await getLeaderboard({ sortBy: 'wins' });
    opponents = players.filter((p) => !myKeys.has(p.stableKey));
    select.innerHTML =
      '<option value="">Choose an opponent…</option>' +
      opponents
        .map((p) => `<option value="${escapeHtml(p.stableKey)}">${escapeHtml(p.displayName)}</option>`)
        .join('');
  } catch (e) {
    setStatus('Could not load opponents: ' + e.message);
  }

  select.addEventListener('change', () => {
    if (select.value) loadComparison(select.value);
  });

  // Preselect opponent passed from the leaderboard "Compare" button.
  if (params?.opponentKey) {
    select.value = params.opponentKey;
    if (select.value) await loadComparison(select.value);
  }
}

function setStatus(msg) {
  const s = document.getElementById('status');
  if (s) s.textContent = msg;
}

async function loadComparison(opponentKey) {
  const content = document.getElementById('content');
  content.setAttribute('aria-busy', 'true');
  content.innerHTML = '<div class="content-fade"><p class="text-center">Loading comparison…</p></div>';

  try {
    const h2h = await getHeadToHead(getMyStableKeys(), [opponentKey]);
    content.setAttribute('aria-busy', 'false');

    if (!h2h || h2h.sharedGames === 0) {
      content.innerHTML = `<div class="content-fade"><div class="alert alert-info"><p style="margin:0;">You haven't finished any games together yet.</p></div></div>`;
      setStatus('No shared games yet.');
      announce('No shared games yet', 'polite');
      return;
    }

    const a = h2h.a;
    const b = h2h.b;
    const tally = `You ${h2h.aWins} — ${h2h.bWins} ${escapeHtml(b.displayName)}${h2h.ties ? `, ${h2h.ties} tie${h2h.ties === 1 ? '' : 's'}` : ''}`;

    content.innerHTML = `
      <div class="content-fade">
      <h2 tabindex="-1" id="h2h-heading">You vs ${escapeHtml(b.displayName)}</h2>
      <p class="h2h-tally" aria-hidden="true">${tally}</p>
      <span class="sr-only">Record over ${h2h.sharedGames} shared games: you won ${h2h.aWins}, ${escapeHtml(b.displayName)} won ${h2h.bWins}, with ${h2h.ties} ties.</span>

      <div class="grid grid-2 mt-md">
        <section class="card">
          <h3 style="margin-top: 0;">You</h3>
          <p style="margin: 0;">Wins: <strong>${a.wins}</strong></p>
          <p style="margin: 0;">Avg score: <strong>${a.avgScore}</strong></p>
          <p style="margin: 0;">Best: <strong>${a.bestScore}</strong></p>
        </section>
        <section class="card">
          <h3 style="margin-top: 0;">${escapeHtml(b.displayName)}</h3>
          <p style="margin: 0;">Wins: <strong>${b.wins}</strong></p>
          <p style="margin: 0;">Avg score: <strong>${b.avgScore}</strong></p>
          <p style="margin: 0;">Best: <strong>${b.bestScore}</strong></p>
        </section>
      </div>

      <div class="scrollable mt-lg" tabindex="0" role="region" aria-label="Shared games">
        <table>
          <caption class="sr-only">Games you both played, newest first</caption>
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Your score</th>
              <th scope="col">${escapeHtml(b.displayName)} score</th>
              <th scope="col">Winner</th>
            </tr>
          </thead>
          <tbody>
            ${h2h.games.map((g) => `
              <tr>
                <th scope="row" style="text-align:left; font-weight: normal;">${formatTimeAgo(g.finishedAt)}</th>
                <td>${g.aScore}</td>
                <td>${g.bScore}</td>
                <td>${winnerBadge(g.winner, b.displayName)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      </div>`;

    // Move focus to the results heading for screen-reader + keyboard users.
    content.querySelector('#h2h-heading')?.focus();
    setStatus(`Comparison loaded: you versus ${b.displayName}.`);
    announce(`Comparison loaded: you versus ${b.displayName}`, 'polite');
  } catch (e) {
    content.setAttribute('aria-busy', 'false');
    content.innerHTML = `<div class="content-fade"><div class="alert alert-error"><p>Could not load comparison: ${escapeHtml(e.message)}</p></div></div>`;
  }
}

function winnerBadge(winner, oppName) {
  if (winner === 'a') return '<span class="badge badge-success">You</span>';
  if (winner === 'b') return `<span class="badge badge-warning">${escapeHtml(oppName)}</span>`;
  return '<span class="badge badge-neutral">Tie</span>';
}
