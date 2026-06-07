// Game board - Main scoring interface with host and player views

import { navigateTo } from '../router.js';
import { getGameWithFullData, updatePlayerScore, markHandComplete, getPlayerHandProgress, finishGame } from '../../db/queries.js';
import { subscribeToHandProgress, subscribeToPlayers, unsubscribeAll } from '../../db/realtime.js';
import { HANDS } from '../../game/hands.js';
import { announce } from '../../utils/a11y.js';
import { escapeHtml } from '../../utils/format.js';
import { haptics } from '../../native/haptics.js';
import { prefersReducedMotion } from '../motion.js';

let gameId, playerId, isHost;
let gameData = null;
let playerHandData = {};
let showDetailsHandler = null; // module-level so re-renders don't stack document listeners
let managedPlayer = null;      // the player currently open in the host Manage panel
let panelWired = false;        // attach Manage-panel listeners once per render

export async function renderGame(params) {
  gameId = params.gameId;
  playerId = params.playerId;
  isHost = params.isHost;

  // Load game data
  try {
    gameData = await getGameWithFullData(gameId);
  } catch (error) {
    console.error('Error loading game:', error);
    return `<main id="main" class="container"><div class="alert alert-error" role="alert">Error loading game</div></main>`;
  }

  const currentPlayer = gameData.players.find(p => p.id === playerId);

  if (isHost) {
    return renderHostView();
  } else {
    return renderPlayerView(currentPlayer);
  }
}

function renderHostView() {
  return `
    <header class="header">
      <div class="container flex-between">
        <h1 style="margin: 0;"><span aria-hidden="true">🎲</span> Game Host View</h1>
        <button class="btn btn-on-header" id="btn-end-game">End Game</button>
      </div>
    </header>
    <main id="main" class="container">
      <div class="card">
        <h2>Manage Players &amp; Scores</h2>

        <div class="scrollable" tabindex="0" role="region" aria-label="Players and scores">
          <table style="margin-top: var(--spacing-md);">
            <thead>
              <tr>
                <th scope="col">Player</th>
                <th scope="col">Hands Complete</th>
                <th scope="col">Score</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody id="players-table">
              ${gameData.players.map(player => `
                <tr>
                  <td><strong>${escapeHtml(player.name)}</strong></td>
                  <td id="hands-${player.id}">
                    ${player.hand_progress ? player.hand_progress.filter(h => h.completed).length : 0}/10
                  </td>
                  <td><strong>${player.score}</strong></td>
                  <td>
                    <button class="btn btn-small btn-outline" onclick="document.dispatchEvent(new CustomEvent('show-player-details', {detail: {playerId: '${player.id}'}}))">
                      Manage
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div id="player-details" style="display: none;" class="card mt-lg">
        <h3 id="player-name"></h3>

        <div class="grid-10 mt-lg" id="hands-grid">
          ${HANDS.map(hand => `
            <label class="hand-tile">
              <input type="checkbox" class="sr-only" data-hand-id="${hand.number}">
              <span class="hand-tile__num">${hand.number}</span>
              <span class="hand-tile__name">${escapeHtml(hand.name)}</span>
            </label>
          `).join('')}
        </div>

        <div class="mt-lg">
          <label for="score-input">Update Score:</label>
          <div class="input-group">
            <input type="number" id="score-input" placeholder="New score">
            <button class="btn btn-primary" id="btn-update-score">Update</button>
          </div>
        </div>

        <button class="btn btn-outline btn-block mt-lg" id="btn-close-details">Close</button>
      </div>

      <div id="error-message" style="display: none;" class="alert alert-error mt-lg" role="alert"></div>
    </main>
  `;
}

function renderPlayerView(currentPlayer) {
  return `
    <header class="header">
      <div class="container flex-between">
        <div>
          <h1 style="margin: 0;"><span aria-hidden="true">🎲</span> Mexican Rummy</h1>
          <p class="header-muted" style="margin: 0;">Player: ${escapeHtml(currentPlayer.name)}</p>
        </div>
        <button class="btn btn-on-header" id="btn-leave-game">Leave</button>
      </div>
    </header>
    <main id="main" class="container">
      <div class="card">
        <h2>Your Progress</h2>
        <div style="text-align: center; margin: var(--spacing-xl) 0;">
          <div class="score-display" aria-hidden="true">${currentPlayer.score}</div>
          <p class="score-caption">Your Score</p>
          <span class="sr-only">Your score: ${currentPlayer.score} points.</span>
        </div>
      </div>

      <div class="card mt-lg">
        <h3>Hands Completed</h3>
        <div class="grid-10 mt-lg" id="player-hands-grid">
          ${HANDS.map(hand => {
            const progress = currentPlayer.hand_progress?.find(h => h.hand_number === hand.number);
            const isComplete = progress?.completed;
            return `
              <div class="hand-tile${isComplete ? ' hand-tile--complete' : ''}">
                <span class="hand-tile__num">${hand.number}</span>
                <span class="hand-tile__name">${escapeHtml(hand.name)}</span>
                ${isComplete ? '<span class="hand-tile__check" aria-hidden="true">✓</span>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div id="error-message" style="display: none;" class="alert alert-error mt-lg" role="alert"></div>
    </main>
  `;
}

export async function setupGameHandlers(params) {
  gameId = params.gameId;
  playerId = params.playerId;
  isHost = params.isHost;

  // Drop any subscriptions from a previous page before re-subscribing.
  unsubscribeAll();

  // Re-render this page in place on real-time changes (setup re-runs and
  // re-subscribes; unsubscribeAll above prevents channel stacking). Pass
  // {animate:false} so the board does NOT re-slide-in on every score/hand push.
  // Skip the re-render while the host has the manage panel open, otherwise
  // their own score/hand write echoes back and collapses the panel mid-edit.
  const isManaging = () =>
    document.getElementById('player-details')?.style.display === 'block';

  subscribeToPlayers(gameId, () => {
    if (isManaging()) return;
    navigateTo('game', params, { animate: false });
  });

  subscribeToHandProgress(gameId, () => {
    if (isManaging()) return;
    navigateTo('game', params, { animate: false });
  });

  // Event listeners
  const endGameBtn = document.getElementById('btn-end-game');
  const leaveGameBtn = document.getElementById('btn-leave-game');
  const errorDiv = document.getElementById('error-message');

  function showError(msg) {
    if (errorDiv) {
      errorDiv.innerHTML = msg;
      errorDiv.style.display = 'block';
    }
  }

  // Host: End game
  if (endGameBtn) {
    endGameBtn.addEventListener('click', async () => {
      if (!confirm('End this game? Final scores will be saved to history.')) return;
      haptics.heavy();
      endGameBtn.disabled = true;
      endGameBtn.textContent = 'Saving...';
      // Stop re-render subscriptions so the snapshot read isn't disturbed.
      unsubscribeAll();
      try {
        await finishGame(gameId);
        announce('Game ended and results saved', 'assertive');
      } catch (e) {
        console.error('Failed to save results:', e);
        showError('Could not save results: ' + e.message); // still proceed to summary
      }
      navigateTo('summary', { gameId, playerId, isHost });
    });
  }

  // Player: Leave game
  if (leaveGameBtn) {
    leaveGameBtn.addEventListener('click', () => {
      if (confirm('Leave this game?')) {
        haptics.light();
        unsubscribeAll();
        navigateTo('landing');
      }
    });
  }

  // Host: Player management. Remove any prior handler first so re-renders
  // (triggered by realtime) never stack multiple document-level listeners.
  if (isHost) {
    panelWired = false;
    if (showDetailsHandler) {
      document.removeEventListener('show-player-details', showDetailsHandler);
    }
    showDetailsHandler = async (e) => {
      const selectedPlayerId = e.detail.playerId;
      managedPlayer = gameData.players.find(p => p.id === selectedPlayerId);
      if (!managedPlayer) return;
      const detailsPanel = document.getElementById('player-details');
      const playerNameEl = document.getElementById('player-name');

      playerNameEl.textContent = `Managing: ${managedPlayer.name}`;
      detailsPanel.style.display = 'block';
      haptics.select();

      // Reflect the now-managed player's state onto the (shared) checkboxes.
      const checkboxes = detailsPanel.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => {
        const handNum = parseInt(cb.dataset.handId);
        const progress = managedPlayer.hand_progress?.find(h => h.hand_number === handNum);
        cb.checked = progress?.completed || false;
        // Authoritative green fill (works on iOS <15.4 where :has() is unavailable).
        cb.closest('.hand-tile')?.classList.toggle('hand-tile--complete', cb.checked);
      });

      const scoreInput = document.getElementById('score-input');
      scoreInput.value = managedPlayer.score;

      // Attach the panel listeners ONCE per render; they read managedPlayer at
      // event time so re-opening for a different player stays correct and we
      // never stack duplicate listeners across panel re-opens.
      if (panelWired) return;
      panelWired = true;

      checkboxes.forEach(cb => {
        cb.addEventListener('change', async () => {
          const handNum = parseInt(cb.dataset.handId);
          const progress = managedPlayer?.hand_progress?.find(h => h.hand_number === handNum);
          const tile = cb.closest('.hand-tile');
          try {
            if (progress) {
              await markHandComplete(progress.id, cb.checked);
              tile?.classList.toggle('hand-tile--complete', cb.checked);
              if (tile && !prefersReducedMotion()) {
                tile.classList.remove('is-marking'); void tile.offsetWidth; tile.classList.add('is-marking');
              }
              (cb.checked ? haptics.success() : haptics.light());
              announce(`Hand ${handNum} ${cb.checked ? 'marked complete' : 'unmarked'}`, 'polite');
            }
          } catch (error) {
            showError('Failed to update hand: ' + error.message);
            cb.checked = !cb.checked;
            tile?.classList.toggle('hand-tile--complete', cb.checked);
            haptics.error();
          }
        });
      });

      // Score update
      const updateScoreBtn = document.getElementById('btn-update-score');
      updateScoreBtn.addEventListener('click', async () => {
        try {
          const newScore = parseInt(scoreInput.value);
          if (isNaN(newScore)) {
            showError('Please enter a valid score');
            return;
          }
          await updatePlayerScore(managedPlayer.id, newScore);
          haptics.medium();
          announce(`Score updated to ${newScore}`, 'polite');
        } catch (error) {
          showError('Failed to update score: ' + error.message);
        }
      });

      // Close button
      const closeBtn = document.getElementById('btn-close-details');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          detailsPanel.style.display = 'none';
          haptics.select();
        });
      }
    };
    document.addEventListener('show-player-details', showDetailsHandler);
  }
}
