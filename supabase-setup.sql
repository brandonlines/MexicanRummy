-- Mexican Rummy Scoring App - Database Schema
-- Run this in your Supabase SQL Editor

-- Create games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL,
  status TEXT CHECK (status IN ('waiting', 'active', 'finished')) DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  max_players INT DEFAULT 8
);

-- Create players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score INT DEFAULT 0,
  join_order INT,
  is_host BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(game_id, join_order)
);

-- Create hand_progress table
CREATE TABLE hand_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  hand_number INT CHECK (hand_number >= 1 AND hand_number <= 10),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  score_value INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(player_id, hand_number)
);

-- Create hands_reference table (10 hands)
CREATE TABLE hands_reference (
  hand_number INT PRIMARY KEY CHECK (hand_number >= 1 AND hand_number <= 10),
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert hand definitions
INSERT INTO hands_reference (hand_number, description) VALUES
  (1, '2 Sets of 3'),
  (2, '2 Runs of 3'),
  (3, 'Run of 3 + Set of 3'),
  (4, '2 Sets of 4'),
  (5, '3 Sets of 3'),
  (6, '2 Runs of 4'),
  (7, '2 Runs of 5'),
  (8, '2 Sets of 5'),
  (9, 'Run of 5 + Set of 5'),
  (10, 'Run of 10');

-- Create indexes for performance
CREATE INDEX idx_games_status_created ON games(status, created_at);
CREATE INDEX idx_hand_progress_game_player ON hand_progress(game_id, player_id, hand_number);
CREATE INDEX idx_players_game ON players(game_id);
CREATE INDEX idx_hand_progress_player ON hand_progress(player_id);

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE hand_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE hands_reference ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all for now (can be tightened later)
CREATE POLICY "Enable read access for all users" ON games FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON games FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON players FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON players FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON hand_progress FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON hand_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON hand_progress FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON hands_reference FOR SELECT USING (true);
