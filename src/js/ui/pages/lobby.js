// Lobby page - Wait for players before game starts

import { navigateTo } from '../router.js';
import { getGameWithPlayers, updateGameStatus, removePlayer, createPlayerHands } from '../../db/queries.js';
import { subscribeToGame, subscribeToPlayers, unsubscribeAll } from '../../db/realtime.js';
import { announce } from '../../utils/a11y.js';
import { escapeHtml } from '../../utils/format.js';
import { haptics } from '../../native/haptics.js';
import { flashNumber } from '../motion.js';

let gameId, playerId, isHost, gameCode;
let playersList = [];

export async function renderLobby(params) {
  gameId = params.gameId;
  playerId = params.playerId;
  isHost = params.isHost;
  gameCode = params.code || (params.gameId || '').substring(0, 6).toUpperCase();

  return `
    <header class="header">
      <div class="container flex-between">
        <h1 style="margin: 0;"><span aria-hidden="true">🎲</span> Mexican Rummy</h1>
        <button type="button" id="code-hero" class="code-hero" aria-label="Game code ${escapeHtml(gameCode)}. Tap to copy.">${escapeHtml(gameCode)}</button>
      </div>
    </header>
    <main id="main" class="container">
      <div class="card mx-auto" style="max-width: 600px;">
        <h2 class="text-center">⏳ Waiting for Players...</h2>
        
        <div id="players-list" class="mt-lg">
          <h3>Players Joined (<span id="player-count">1</span>)</h3>
          <div id="players-container" class="well roster-well">
            Loading players...
          </div>
        </div>
        
        <div id="actions" class="mt-lg">
          ${isHost ? `
            <button class="btn btn-primary btn-large btn-block" id="btn-start-game">
              ▶️ Start Game (2-8 players)
            </button>
            <button class="btn btn-outline btn-large btn-block mt-md" id="btn-cancel">
              Cancel Game
            </button>
          ` : `
            <p class="text-center" style="color: var(--color-text-secondary); margin-bottom: var(--spacing-md);">
              Waiting for host to start the game...
            </p>
            <button class="btn btn-outline btn-large btn-block" id="btn-leave">
              Leave Game
            </button>
          `}
        </div>
        
        <div id="error-message" role="alert" style="display: none;" class="alert alert-error mt-lg"></div>
      </div>
    </main>
  `;
}

export async function setupLobbyHandlers(params) {
  gameId = params.gameId;
  playerId = params.playerId;
  isHost = params.isHost;

  // Drop any subscriptions from a previous page before re-subscribing.
  unsubscribeAll();

  const startBtn = document.getElementById('btn-start-game');
  const cancelBtn = document.getElementById('btn-cancel');
  const leaveBtn = document.getElementById('btn-leave');
  const errorDiv = document.getElementById('error-message');
  const codeHero = document.getElementById('code-hero');

  // Tap the code chip to copy the game code to the clipboard.
  if (codeHero) {
    const heroLabel = codeHero.textContent;
    let copyResetTimer = null;
    codeHero.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(gameCode);
        haptics.success();
        codeHero.textContent = 'Copied!';
        announce('Game code copied', 'polite');
        if (copyResetTimer) clearTimeout(copyResetTimer);
        copyResetTimer = setTimeout(() => {
          codeHero.textContent = heroLabel;
        }, 1500);
      } catch (err) {
        showError('Could not copy code: ' + err.message);
      }
    });
  }

  function showError(msg) {
    errorDiv.innerHTML = msg;
    errorDiv.style.display = 'block';
  }

  function hideError() {
    errorDiv.style.display = 'none';
  }

  // Subscribe to real-time updates
  subscribeToPlayers(gameId, (data) => {
    updatePlayersList();
  });

  subscribeToGame(gameId, (data) => {
    if (data.payload.new?.status === 'active') {
      haptics.success();
      navigateTo('game', { gameId, playerId, isHost });
    }
  });

  // Load and display players
  async function updatePlayersList() {
    try {
      const game = await getGameWithPlayers(gameId);
      playersList = game.players || [];
      
      const container = document.getElementById('players-container');
      const countEl = document.getElementById('player-count');

      // A stale subscription may fire after we've navigated away; the lobby
      // DOM is gone, so bail rather than dereference null nodes.
      if (!container || !countEl) return;

      // Patch the count text in place so flashNumber sees the prior value.
      const knownIds = new Set(
        Array.from(container.querySelectorAll('[data-roster-id]')).map(el => el.dataset.rosterId)
      );
      const isFirstRender = container.querySelector('[data-roster-id]') === null;
      // #player-count holds a bare integer (parens are static siblings) so
      // flashNumber can read the prior value and animate the change in place.
      flashNumber(countEl, playersList.length);

      container.innerHTML = playersList.map(p => `
        <div class="roster-row${!isFirstRender && !knownIds.has(String(p.id)) ? ' is-new' : ''}" data-roster-id="${escapeHtml(String(p.id))}">
          <span><span aria-hidden="true">👤</span> <strong>${escapeHtml(p.name)}</strong> ${p.is_host ? '(Host)' : ''}</span>
          ${isHost && !p.is_host ? `<button class="btn btn-small btn-outline" data-player-id="${escapeHtml(String(p.id))}">Remove</button>` : ''}
        </div>
      `).join('');

      // Add remove handlers
      if (isHost) {
        container.querySelectorAll('[data-player-id]').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const pId = e.currentTarget.dataset.playerId;
            haptics.light();
            try {
              // Animate the row out before the list refresh removes it.
              const row = e.currentTarget.closest('.roster-row');
              if (row) row.classList.add('is-leaving');
              await removePlayer(pId);
              updatePlayersList();
              announce('Player removed', 'polite');
            } catch (err) {
              showError('Failed to remove player: ' + err.message);
            }
          });
        });
      }
    } catch (error) {
      console.error('Error loading players:', error);
      showError('Failed to load players: ' + error.message);
    }
  }

  // Start game
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      try {
        hideError();
        haptics.medium();

        if (playersList.length < 2) {
          showError('Need at least 2 players to start');
          return;
        }
        if (playersList.length > 8) {
          showError('Maximum 8 players allowed');
          return;
        }

        startBtn.disabled = true;
        startBtn.textContent = 'Starting...';

        // Create hands for all players
        for (const player of playersList) {
          await createPlayerHands(player.id, gameId);
        }

        // Update game status
        await updateGameStatus(gameId, 'active');

        haptics.success();
        announce('Game started', 'assertive');
        navigateTo('game', { gameId, playerId, isHost });
      } catch (error) {
        console.error('Error starting game:', error);
        showError('Failed to start game: ' + error.message);
        startBtn.disabled = false;
        startBtn.textContent = '▶️ Start Game';
      }
    });
  }

  // Cancel game
  if (cancelBtn) {
    cancelBtn.addEventListener('click', async () => {
      if (confirm('Delete this game?')) {
        haptics.light();
        unsubscribeAll();
        navigateTo('landing');
      }
    });
  }

  // Leave game
  if (leaveBtn) {
    leaveBtn.addEventListener('click', async () => {
      if (confirm('Leave this game?')) {
        haptics.light();
        try {
          await removePlayer(playerId);
          unsubscribeAll();
          navigateTo('landing');
        } catch (error) {
          showError('Failed to leave game: ' + error.message);
        }
      }
    });
  }

  // Initial load
  await updatePlayersList();
}
