// Game summary - Results, winner spotlight, and celebration

import { navigateTo } from '../router.js';
import { getGameWithFullData } from '../../db/queries.js';
import { escapeHtml } from '../../utils/format.js';
import { countUp, prefersReducedMotion } from '../motion.js';
import { announce } from '../../utils/a11y.js';
import { haptics } from '../../native/haptics.js';
import { burstConfetti } from '../confetti.js';

export async function renderSummary(params) {
  const { gameId, isHost } = params;

  try {
    const gameData = await getGameWithFullData(gameId);

    // Sort players by score (highest first)
    const sortedPlayers = [...gameData.players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];
    const totalPoints = gameData.players.reduce((sum, p) => sum + p.score, 0);

    return `
      <a href="#main" class="skip-to-main">Skip to main content</a>
      <header class="header">
        <div class="container">
          <h1><span aria-hidden="true">🎉</span> Game Over!</h1>
        </div>
      </header>
      <main id="main" class="container">
        <section class="card card--md mx-auto win-spotlight" aria-labelledby="win-h">
          <p class="score-caption text-center">Winner</p>
          <h2 id="win-h" class="text-center">${escapeHtml(winner.name)}</h2>
          <div class="score-display text-center" id="win-score" aria-hidden="true" data-value="${winner.score}">0</div>
          <span class="sr-only">Winner: ${escapeHtml(winner.name)} with ${winner.score} points.</span>
        </section>

        <div class="card card--md mx-auto mt-lg">
          <h2 class="text-center">Final Scores</h2>

          <div class="mt-lg">
            ${sortedPlayers.map((player, index) => `
              <div class="${index < 3 ? `podium-row podium-row--${index + 1}` : 'summary-row'}" style="--i:${index}">
                <div>
                  <div class="${index < 3 ? 'podium-row__name' : ''}">${index + 1}. ${escapeHtml(player.name)}</div>
                  <div class="score-caption">
                    ${player.hand_progress ? player.hand_progress.filter(h => h.completed).length : 0} hands completed
                  </div>
                </div>
                <div class="${index < 3 ? 'podium-row__score' : 'summary-row__score'}">${player.score}</div>
              </div>
            `).join('')}
          </div>

          <div class="mt-lg">
            <h3><span aria-hidden="true">📊</span> Game Stats</h3>
            <div class="well">
              <div class="flex-between mb-sm"><span>Total Players:</span><strong>${gameData.players.length}</strong></div>
              <div class="flex-between mb-sm"><span>Total Points:</span><strong>${totalPoints}</strong></div>
              <div class="flex-between"><span>Winner:</span><strong>${escapeHtml(winner.name)}</strong></div>
            </div>
          </div>

          <div class="mt-lg">
            <button class="btn btn-primary btn-large btn-block" id="btn-play-again">
              <span aria-hidden="true">🔄</span> Play Another Round
            </button>
            <button class="btn btn-outline btn-large btn-block mt-md" id="btn-view-leaderboard">
              <span aria-hidden="true">🏆</span> View Leaderboard
            </button>
            <button class="btn btn-outline btn-large btn-block mt-md" id="btn-view-stats">
              <span aria-hidden="true">📊</span> My Stats
            </button>
            <button class="btn btn-outline btn-large btn-block mt-md" id="btn-menu">
              <span aria-hidden="true">🏠</span> Back to Menu
            </button>
          </div>
        </div>

        <canvas id="confetti" class="confetti-canvas" aria-hidden="true"></canvas>
      </main>
    `;
  } catch (error) {
    return `
      <a href="#main" class="skip-to-main">Skip to main content</a>
      <main id="main" class="container">
        <div class="alert alert-error mt-lg">
          <h3>Error loading summary</h3>
          <p>${escapeHtml(error.message)}</p>
          <button class="btn btn-primary mt-md" id="btn-menu">Back to Menu</button>
        </div>
      </main>
    `;
  }
}

export async function setupSummaryHandlers(params) {
  document.getElementById('btn-play-again')?.addEventListener('click', () => navigateTo('landing'));
  document.getElementById('btn-menu')?.addEventListener('click', () => navigateTo('landing'));
  document.getElementById('btn-view-leaderboard')?.addEventListener('click', () => navigateTo('leaderboard'));
  document.getElementById('btn-view-stats')?.addEventListener('click', () => navigateTo('stats'));

  // Celebration: announce the result (assertive now actually interrupts), count
  // the winner's score up, and fire confetti + a success haptic. All of this is
  // reduced-motion gated (countUp shows the final number instantly under reduce).
  const scoreEl = document.getElementById('win-score');
  if (scoreEl) {
    const name = document.getElementById('win-h')?.textContent || '';
    const score = Number(scoreEl.dataset.value || 0);
    announce(`Game over. Winner: ${name} with ${score} points.`, 'assertive');
    countUp(scoreEl, score);
    if (!prefersReducedMotion()) {
      haptics.success();
      burstConfetti(document.getElementById('confetti'));
    }
  }
}
