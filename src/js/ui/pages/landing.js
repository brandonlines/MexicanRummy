// Landing/Home page - Host or Join a game

import { navigateTo } from '../router.js';
import { createGame, getGameByCode, getGamePlayers, addPlayer } from '../../db/queries.js';
import { unsubscribeAll } from '../../db/realtime.js';
import { normalizeCodeInput } from '../../utils/code.js';
import {
  getDeviceId,
  getRememberedName,
  rememberName,
  buildPlayerIdentityFields,
} from '../../identity/identity.js';
import { haptics } from '../../native/haptics.js';
import { announce } from '../../utils/a11y.js';
import { themeSwitchMarkup, wireThemeSwitch } from '../theme.js';

const MAX_PLAYERS = 8;

export async function renderLanding() {
  const remembered = getRememberedName();
  return `
    <a href="#main" class="skip-to-main">Skip to main content</a>
    <header class="header">
      <div class="container">
        <h1><span aria-hidden="true">🎲</span> Mexican Rummy Scoring</h1>
        <p class="subtitle">Real-time multiplayer scoring tracker</p>
        ${themeSwitchMarkup()}
      </div>
    </header>
    <main id="main" class="container">
      <div class="card card--narrow mx-auto">
        <h2 class="text-center">Welcome to the Game!</h2>

        <div class="mt-lg">
          <label for="player-name">Your name</label>
          <input
            type="text"
            id="player-name"
            autocomplete="nickname"
            placeholder="e.g., Alex"
            value="${escapeAttr(remembered)}"
            maxlength="24"
          >
        </div>

        <div class="grid gap-lg mt-lg">
          <button class="btn btn-primary btn-large btn-block" id="btn-host">
            <span aria-hidden="true">🏠</span> Host a Game
          </button>

          <div class="text-center">
            <p class="divider-text">Or</p>
          </div>

          <div id="join-section">
            <label for="game-code">Enter game code</label>
            <input
              type="text"
              id="game-code"
              class="code-input"
              placeholder="e.g., K7M9PQ"
              maxlength="6"
              autocapitalize="characters"
              autocomplete="off"
            >
            <button class="btn btn-secondary btn-large btn-block mt-md" id="btn-join">
              <span aria-hidden="true">➕</span> Join Game
            </button>
          </div>
        </div>

        <div class="well mt-lg">
          <h3>How to Play</h3>
          <ol style="padding-left: var(--spacing-lg);">
            <li><strong>Host</strong> creates a game and shares the code</li>
            <li><strong>Players</strong> join using the code</li>
            <li><strong>Host</strong> starts the game when ready</li>
            <li>Players complete their hands in order</li>
            <li><strong>Host</strong> marks hands as complete and tracks scores</li>
          </ol>
        </div>

        <nav aria-label="History and stats" class="mt-lg">
          <h3 class="sr-only">History and stats</h3>
          <div class="grid gap-md">
            <button class="btn btn-outline btn-block" id="btn-leaderboard">
              <span aria-hidden="true">🏆</span> Leaderboard
            </button>
            <button class="btn btn-outline btn-block" id="btn-stats">
              <span aria-hidden="true">📊</span> My Stats
            </button>
            <button class="btn btn-outline btn-block" id="btn-history">
              <span aria-hidden="true">📜</span> Game History
            </button>
          </div>
        </nav>
      </div>

      <div id="error-message" style="display: none;" class="alert alert-error mt-lg" role="alert"></div>
    </main>
  `;
}

export async function setupLandingHandlers() {
  // Landing is the destination of every Leave/Cancel/Back path. Drop any
  // realtime channels left over from a game/lobby so a stale callback can't
  // re-render the board over the landing page.
  unsubscribeAll();

  wireThemeSwitch({ haptics, announce });

  const btnHost = document.getElementById('btn-host');
  const btnJoin = document.getElementById('btn-join');
  const nameInput = document.getElementById('player-name');
  const gameCodeInput = document.getElementById('game-code');
  const errorDiv = document.getElementById('error-message');

  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    haptics.error();
  }
  function hideError() {
    errorDiv.style.display = 'none';
  }
  function getName() {
    return (nameInput.value || '').trim();
  }
  function requireName() {
    const name = getName();
    if (!name) {
      showError('Please enter your name first.');
      nameInput.focus();
      return null;
    }
    rememberName(name);
    return name;
  }

  // Navigation to history/stats pages (work on device identity, no account needed)
  document.getElementById('btn-leaderboard')?.addEventListener('click', () => navigateTo('leaderboard'));
  document.getElementById('btn-stats')?.addEventListener('click', () => navigateTo('stats'));
  document.getElementById('btn-history')?.addEventListener('click', () => navigateTo('history'));

  // Host a game
  if (btnHost) {
    btnHost.addEventListener('click', async () => {
      haptics.light();
      const name = requireName();
      if (!name) return;
      try {
        hideError();
        btnHost.disabled = true;
        btnHost.textContent = 'Creating game...';

        const game = await createGame(getDeviceId());
        const identity = buildPlayerIdentityFields(name);
        const player = await addPlayer(game.id, name, true, identity);

        navigateTo('lobby', {
          gameId: game.id,
          code: game.code,
          playerId: player.id,
          playerName: name,
          isHost: true,
        });
      } catch (error) {
        console.error('Error creating game:', error);
        showError('Failed to create game: ' + error.message);
        btnHost.disabled = false;
        btnHost.innerHTML = '<span aria-hidden="true">🏠</span> Host a Game';
      }
    });
  }

  // Join a game
  if (btnJoin) {
    btnJoin.addEventListener('click', handleJoin);
    gameCodeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleJoin();
    });
  }

  async function handleJoin() {
    haptics.light();
    const name = requireName();
    if (!name) return;

    const code = normalizeCodeInput(gameCodeInput.value);
    if (!code) {
      showError('Please enter a game code.');
      gameCodeInput.focus();
      return;
    }

    try {
      hideError();
      btnJoin.disabled = true;
      btnJoin.textContent = 'Joining...';

      const game = await getGameByCode(code);
      if (!game) {
        showError('No game found for that code. Double-check it and try again.');
        resetJoinBtn();
        return;
      }
      if (game.status !== 'waiting') {
        showError('That game has already started or finished.');
        resetJoinBtn();
        return;
      }

      const players = await getGamePlayers(game.id);
      if (players.length >= MAX_PLAYERS) {
        showError(`That game is full (max ${MAX_PLAYERS} players).`);
        resetJoinBtn();
        return;
      }

      const identity = buildPlayerIdentityFields(name);
      const player = await addPlayer(game.id, name, false, identity);

      navigateTo('lobby', {
        gameId: game.id,
        code: game.code,
        playerId: player.id,
        playerName: name,
        isHost: false,
      });
    } catch (error) {
      console.error('Error joining game:', error);
      showError('Failed to join game. Check the code and try again.');
      resetJoinBtn();
    }
  }

  function resetJoinBtn() {
    btnJoin.disabled = false;
    btnJoin.innerHTML = '<span aria-hidden="true">➕</span> Join Game';
  }
}

function escapeAttr(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
