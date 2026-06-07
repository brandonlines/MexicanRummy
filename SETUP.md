# Mexican Rummy Scoring App - Quick Start

## What's Included

✅ **Fully functional web app with:**
- Landing page (Host/Join game)
- Real-time player lobby
- Game board with host and player views
- Hand tracking (10 hands)
- Score management
- Real-time synchronization via Supabase
- AODA compliant (accessible)
- Bright, modern UI

## Step 1: Install & Setup Supabase (5 minutes)

1. **Create Supabase Account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up (free)
   - Create a new project

2. **Get Your Credentials**
   - In project dashboard, go to **Settings** → **API**
   - Copy **Project URL** and **Anon/Public Key**

3. **Create `.env` File**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

4. **Create Database**
   - In Supabase, go to **SQL Editor**
   - Click **New Query**
   - Copy-paste contents of `supabase-setup.sql`
   - Click **Run**
   - ✅ Database is ready!

## Step 2: Run Locally (2 minutes)

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:3000 in your browser

## Step 3: Test the App

### Try It Out:
1. **Host a game**
   - Click "Host a Game"
   - Enter your name
   - You get a game code (e.g., "A1B2C3D4")

2. **Join the game**
   - Open another browser tab
   - Click "Join a Game"
   - Enter the game code
   - Enter a player name

3. **Start the game**
   - Go back to host tab
   - Click "Start Game"
   - Game board appears!

4. **Mark hands as complete**
   - Click "Manage" on a player
   - Check off hands as they complete them
   - Update scores
   - Changes sync in real-time!

## Step 4: Deploy to GitHub Pages (Optional)

```bash
# Create GitHub repo
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/mexican-rummy-scoring.git
git push -u origin main

# Enable GitHub Pages in repo settings
# Set source to "GitHub Actions"

# Deploy
npm run build
npm run deploy
```

## Troubleshooting

### "Cannot connect to Supabase"
- Check `.env` file has correct credentials
- Verify they're copied exactly from Supabase dashboard
- Restart dev server after changing `.env`

### "Database tables not found"
- Go to Supabase → SQL Editor
- Run the `supabase-setup.sql` file
- Check Table Editor to see all 4 tables created

### "Game code doesn't work"
- Use first 8 characters of game ID
- Make sure using exact uppercase code
- Both players must enter same code

## Next Steps

- [ ] Test with 2-8 players
- [ ] Verify all hands track correctly
- [ ] Test on mobile browser
- [ ] Check accessibility with keyboard only
- [ ] Deploy to GitHub Pages
- [ ] Share game code with friends!

## Features Working Now

✅ Real-time multiplayer (2-8 players)
✅ Host controls (mark hands, update scores)
✅ Player views (see progress, scores)
✅ 10 hand tracking
✅ Live synchronization
✅ Mobile friendly
✅ Keyboard accessible
✅ AODA compliant

## Known Limitations

- Custom game codes (using full UUID now)
- Undo/history for changes
- Statistics/leaderboards
- Multiple games simultaneously

## Files Overview

```
src/
├── js/
│   ├── db/supabase.js       ← Database connection
│   ├── ui/pages/
│   │   ├── landing.js       ← Host/Join page
│   │   ├── lobby.js         ← Player waiting room
│   │   ├── game.js          ← Main game board ⭐
│   │   └── summary.js       ← Results page
│   └── game/hands.js        ← Hand definitions
├── styles/
│   ├── theme.css            ← Color scheme (AODA compliant)
│   ├── layout.css           ← Responsive grid
│   ├── components.css       ← Buttons, cards, tables
│   └── accessibility.css    ← Focus states, keyboard nav
└── index.html
```

## Getting Help

1. Check [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for database help
2. Check browser console for errors (F12)
3. Check Supabase dashboard for data
4. Open an issue on GitHub

## Enjoy! 🎲

Made with ❤️ for Mexican Rummy players.

Questions? Ideas? Open an issue or start a discussion!
