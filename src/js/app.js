// App initialization and main entry point

import { initializeSupabase } from './db/supabase.js';
import { registerPage, navigateTo } from './ui/router.js';
import { renderLanding, setupLandingHandlers } from './ui/pages/landing.js';
import { renderLobby, setupLobbyHandlers } from './ui/pages/lobby.js';
import { renderGame, setupGameHandlers } from './ui/pages/game.js';
import { renderSummary, setupSummaryHandlers } from './ui/pages/summary.js';
import { renderStats, setupStatsHandlers } from './ui/pages/stats.js';
import { renderLeaderboard, setupLeaderboardHandlers } from './ui/pages/leaderboard.js';
import { renderHeadToHead, setupHeadToHeadHandlers } from './ui/pages/headtohead.js';
import { renderHistory, setupHistoryHandlers } from './ui/pages/history.js';
import { loadSession, isSignedIn, linkDeviceToAccount } from './identity/identity.js';

export async function initializeApp() {
  // Header styles now live in components.css (theme-aware, participates in the
  // [data-theme] cascade). The old JS-injected #header-styles block was removed.

  let supabaseReady = false;
  try {
    initializeSupabase();
    supabaseReady = true;
    console.log('✅ Supabase connected');
  } catch (error) {
    console.warn('⚠️ Supabase not configured:', error.message);
  }

  // Register all pages with the { render, setup } contract.
  registerPage('landing', { render: renderLanding, setup: setupLandingHandlers });
  registerPage('lobby', { render: renderLobby, setup: setupLobbyHandlers });
  registerPage('game', { render: renderGame, setup: setupGameHandlers });
  registerPage('summary', { render: renderSummary, setup: setupSummaryHandlers });
  registerPage('stats', { render: renderStats, setup: setupStatsHandlers });
  registerPage('leaderboard', { render: renderLeaderboard, setup: setupLeaderboardHandlers });
  registerPage('headtohead', { render: renderHeadToHead, setup: setupHeadToHeadHandlers });
  registerPage('history', { render: renderHistory, setup: setupHistoryHandlers });

  // Optional/additive accounts layer — non-blocking, never gates the app.
  if (supabaseReady) {
    try {
      await loadSession();
      if (isSignedIn()) await linkDeviceToAccount();
    } catch (e) {
      console.warn('Session load skipped:', e.message);
    }
  }

  await navigateTo('landing'); // setup now runs automatically

  console.log('✅ App initialized');
}
