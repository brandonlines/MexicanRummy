# Getting Started with Mexican Rummy Scoring

## ⚡ 10-Minute Quick Start

### Step 1: Set Up Supabase (5 minutes)

1. Go to https://supabase.com
2. Create account and new project
3. Get **Project URL** and **Anon Key** from Settings → API
4. Create `.env` file:
   ```bash
   cp .env.example .env
   ```
5. Edit `.env` and add your Supabase credentials
6. In Supabase, run the SQL from `supabase-setup.sql`

✅ **Database is ready!**

### Step 2: Run Locally (2 minutes)

```bash
npm install
npm run dev
```

Visit http://localhost:3000 in your browser

### Step 3: Test the Game (3 minutes)

1. **Open 2 browser windows** (or 2 tabs)
2. **Window 1**: Click "Host a Game" → Enter your name
3. **Window 2**: Click "Join a Game" → Enter game code and name
4. **Window 1**: Click "Start Game"
5. **Both**: See the game board!

### Step 4: Manage Scores

**As Host:**
- Click "Manage" on any player
- Check off their hands as they complete them
- Update their score
- Changes sync instantly to their view!

**As Player:**
- See your progress
- See your score
- Watch it update in real-time

✅ **You're playing!**

## 📱 Test on Mobile

1. Get your dev server IP: `ipconfig getifaddr en0` (Mac) or check network settings
2. On phone: visit `http://YOUR_IP:3000`
3. Test on portrait and landscape
4. Test touchscreen interaction

## 🌐 Deploy to the Web

Once happy with local testing:

```bash
# Create GitHub repo
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/mexican-rummy.git
git push -u origin main

# In GitHub settings, enable GitHub Pages (source: GitHub Actions)
# App auto-deploys!
```

Your app is now live at: `https://yourusername.github.io/mexican-rummy`

Share this link with friends!

## ✅ Checklist Before Playing

- [ ] `.env` file created with Supabase credentials
- [ ] Supabase database tables created
- [ ] `npm run dev` works without errors
- [ ] Landing page loads
- [ ] Can create a game
- [ ] Can join a game with code
- [ ] Game board displays for both host and player
- [ ] Host can mark hands complete
- [ ] Scores update in real-time

## 🎮 How to Host a Game

1. Click **"Host a Game"**
2. Enter your name
3. Get game code (e.g., "A1B2C3D4")
4. Share code with up to 7 other players
5. Players enter the code to join
6. Click **"Start Game"** when ready (2-8 players)
7. Use **"Manage"** to:
   - ✓ Mark hands as complete
   - Update player scores
8. Click **"End Game"** to finish

## 🎮 How to Join a Game

1. Click **"Join a Game"**
2. Enter game code from host
3. Enter your name
4. Wait for host to start game
5. See hands progress on your screen
6. Inform host when you complete each hand
7. Watch your score update

## 📊 The 10 Hands

Players go through these in order:

1. **2 Sets of 3** - Two groups of matching cards
2. **2 Runs of 3** - Two sequences (3 in a row)
3. **Run of 3 + Set of 3** - One sequence, one group
4. **2 Sets of 4** - Two larger groups
5. **3 Sets of 3** - Three matching groups
6. **2 Runs of 4** - Two longer sequences
7. **2 Runs of 5** - Even longer sequences
8. **2 Sets of 5** - Two large groups
9. **Run of 5 + Set of 5** - Big sequence + group
10. **Run of 10** - One epic 10-card sequence

First player to complete all 10 wins! 🏆

## 🆘 Troubleshooting

### "Cannot connect to Supabase"
- Check `.env` file has correct credentials
- Restart dev server after changing `.env`
- Verify URL and key copied exactly from Supabase

### "404 on localhost:3000"
- Make sure `npm run dev` is running
- Check terminal for errors
- Port might be in use: `npm run dev -- --port 3001`

### "Game code doesn't work"
- Use first 8 characters (uppercase)
- Both players must enter exact same code
- Make sure it's from the correct host

### "No real-time updates"
- Check Supabase Replication is enabled
- Refresh the page
- Check browser console for errors (F12)

### "Buttons not working"
- Click in the input field first
- Make sure you're entering a name when prompted
- Try keyboard instead of mouse (Tab + Enter)

## ♿ Accessibility

The app is fully keyboard accessible:

- **Tab** - Move between buttons
- **Shift+Tab** - Move backward
- **Enter** - Click buttons
- **Space** - Check boxes
- **Escape** - Close dialogs

Everything is readable on mobile and desktop.

## 🤝 Need Help?

1. Check [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for database help
2. Check browser console: **F12 → Console**
3. Look at Supabase dashboard to verify tables
4. Open a GitHub issue if stuck

## 🎉 Ready to Play?

1. ✅ Supabase setup
2. ✅ `npm run dev`
3. ✅ Host a game
4. ✅ Invite friends
5. ✅ Play! 🎲

Have fun and may the best hand-maker win! 🏆
