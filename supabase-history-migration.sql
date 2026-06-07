-- ============================================================
-- Mexican Rummy — Historical Game Tracking (additive migration)
-- Run AFTER supabase-setup.sql in the Supabase SQL Editor.
-- Safe to re-run (idempotent). No drops, no type changes.
-- ============================================================

-- ------------------------------------------------------------
-- 1. games: short human-friendly code + finished marker, and
--    fix the pre-existing host_id NOT NULL insert blocker.
-- ------------------------------------------------------------
ALTER TABLE games ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP WITH TIME ZONE;

-- Backfill existing rows so the unique index is valid. We always
-- store/compare UPPER-case codes drawn from an ambiguous-char-free
-- alphabet (see src/js/utils/code.js).
UPDATE games
SET code = UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 6))
WHERE code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_games_code_unique ON games (code);

-- Pre-existing bug: createGame() never set host_id but the column is
-- NOT NULL, so inserts fail. We now pass host_id from JS, but relax the
-- constraint so legacy/edge inserts and re-runs cannot break hosting.
ALTER TABLE games ALTER COLUMN host_id DROP NOT NULL;

-- ------------------------------------------------------------
-- 2. players: layered identity columns (all nullable / additive).
--    stable_key is the resolved precedence key written at host/join.
-- ------------------------------------------------------------
ALTER TABLE players ADD COLUMN IF NOT EXISTS account_id      UUID;  -- auth.users.id when signed in
ALTER TABLE players ADD COLUMN IF NOT EXISTS device_id       TEXT;  -- localStorage device uuid
ALTER TABLE players ADD COLUMN IF NOT EXISTS normalized_name TEXT;  -- lower(trim(name)) snapshot
ALTER TABLE players ADD COLUMN IF NOT EXISTS stable_key      TEXT;  -- resolved precedence key

CREATE INDEX IF NOT EXISTS idx_players_stable_key ON players (stable_key);

-- ------------------------------------------------------------
-- 3. game_results: ONE row per finished game (history header).
--    game_id PK => second finish for same game is a no-op upsert.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_results (
  game_id           UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  code              TEXT,
  player_count      INT  NOT NULL,
  total_points      INT  NOT NULL,
  winner_stable_key TEXT,
  winner_name       TEXT,
  finished_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_game_results_finished ON game_results (finished_at DESC);

-- ------------------------------------------------------------
-- 4. player_results: ONE row per player per finished game.
--    This is the ONLY source of truth for stats/leaderboard/H2H.
--    UNIQUE(game_id, stable_key) => idempotent + dedupe per identity.
--    player_id ON DELETE SET NULL so history survives cascade deletes.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id         UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id       UUID REFERENCES players(id) ON DELETE SET NULL,
  stable_key      TEXT NOT NULL,                 -- acct:<id> | dev:<id> | name:<norm>
  account_id      UUID,
  device_id       TEXT,
  display_name    TEXT NOT NULL,                 -- exact name shown that game
  normalized_name TEXT NOT NULL,
  score           INT  NOT NULL,
  hands_completed INT  NOT NULL,
  rank            INT  NOT NULL,                  -- 1 = winner (ties share min rank)
  is_winner       BOOLEAN NOT NULL DEFAULT FALSE,
  finished_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_player_results_game_identity UNIQUE (game_id, stable_key)
);

CREATE INDEX IF NOT EXISTS idx_player_results_stable_key ON player_results (stable_key);
CREATE INDEX IF NOT EXISTS idx_player_results_game       ON player_results (game_id);
CREATE INDEX IF NOT EXISTS idx_player_results_finished   ON player_results (finished_at DESC);

-- ------------------------------------------------------------
-- 5. identity_links: optional account<->device merge (ACCOUNTS LAYER).
--    Lets a signed-in account fold prior device-only history together.
--    Unused by the core device-identity path; safe to ship empty.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS identity_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  device_id  TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_identity_links UNIQUE (account_id, device_id)
);
CREATE INDEX IF NOT EXISTS idx_identity_links_account ON identity_links (account_id);
CREATE INDEX IF NOT EXISTS idx_identity_links_device  ON identity_links (device_id);

-- ------------------------------------------------------------
-- 6. RLS — match existing fully-permissive group-trust model.
--    Results tables get SELECT + INSERT only (NO update/delete)
--    => snapshots are append-only / immutable at the DB layer.
--    Policy creation wrapped so re-runs don't error on duplicates.
-- ------------------------------------------------------------
ALTER TABLE game_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Enable read access for all users" ON game_results FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Enable insert for all users" ON game_results FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Enable read access for all users" ON player_results FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Enable insert for all users" ON player_results FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Enable read access for all users" ON identity_links FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Enable insert for all users" ON identity_links FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------
-- 7. Realtime publication. Core tables were never published
--    (pre-existing gap); add them plus the results header table so
--    realtime works and the leaderboard can live-update later.
--    Wrapped so re-runs don't error on already-published tables.
-- ------------------------------------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE games;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE players;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE hand_progress;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE game_results;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
