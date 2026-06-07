# Mexican Rummy Scoring App

A real-time multiplayer scoring tracker for Mexican Rummy card game. Players can host or join games, track hand progress through all 10 hands, and manage scores collaboratively.

![AODA Compliant](https://img.shields.io/badge/AODA-Compliant-brightgreen)
![Open Source](https://img.shields.io/badge/License-MIT-blue)

## Features

✨ **Real-Time Multiplayer**
- Host creates a game and shares code with players
- Real-time synchronization across all devices
- Up to 8 players per game
- Instant score and hand progress updates

📊 **Complete Hand Tracking**
- 10 Mexican Rummy hands:
  1. 2 Sets of 3
  2. 2 Runs of 3
  3. Run of 3 + Set of 3
  4. 2 Sets of 4
  5. 3 Sets of 3
  6. 2 Runs of 4
  7. 2 Runs of 5
  8. 2 Sets of 5
  9. Run of 5 + Set of 5
  10. Run of 10

- Host marks hands as complete
- Automatic score tracking
- Player view shows personal progress
- Host view shows all players simultaneously

♿ **AODA Compliant (WCAG 2.1 AA)**
- Full keyboard navigation (Tab, Enter, Escape)
- High contrast bright color scheme (4.5:1 text ratio)
- Screen reader friendly (ARIA labels, semantic HTML)
- Visible focus indicators (4px minimum)
- Mobile responsive design

🚀 **Easy Deployment**
- Hosted on GitHub Pages (free)
- Real-time database via Supabase (free tier)
- No backend server needed
- One-click setup for self-hosting

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/mexican-rummy-scoring.git
cd mexican-rummy-scoring
npm install
```

### 2. Set Up Supabase

Follow the detailed guide in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md):
- Create a free Supabase account
- Get your API credentials
- Run the SQL schema
- Add credentials to `.env`

### 3. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser

### 4. Deploy to GitHub Pages (Optional)

```bash
npm run build
npm run deploy
```

## How to Play

### For the Host:
1. Click "Host a Game" and enter your name
2. Share the game code with other players
3. Players join using the code
4. Click "Start Game" when ready (minimum 2 players, maximum 8)
5. As each player completes a hand, check the hand off in your view
6. Update scores as hands are completed
7. Game ends when all hands are completed

### For Players:
1. Click "Join a Game" and enter the game code
2. Enter your name
3. Wait for the host to start the game
4. View your hand progress and current score
5. Inform the host when you complete each hand
6. Track your progress through all 10 hands

## Technology Stack

- **Frontend**: Vanilla JavaScript + Vite (minimal dependencies)
- **Styling**: CSS3 with CSS Variables (AODA compliant)
- **Database**: Supabase (PostgreSQL + Real-time)
- **Hosting**: GitHub Pages (static)
- **Real-time**: Supabase Realtime Subscriptions

## File Structure

```
.
├── src/
│   ├── index.html              # Main HTML
│   ├── js/
│   │   ├── main.js             # Entry point
│   │   ├── app.js              # App initialization & router
│   │   ├── config.js           # Supabase config
│   │   ├── db/
│   │   │   ├── supabase.js    # Client initialization
│   │   │   ├── queries.js     # Database CRUD operations
│   │   │   └── realtime.js    # Real-time subscriptions
│   │   ├── game/
│   │   │   ├── hands.js       # Hand definitions
│   │   │   └── state.js       # Game state management
│   │   ├── ui/
│   │   │   ├── router.js      # Page router
│   │   │   ├── components.js  # Reusable components
│   │   │   └── pages/
│   │   │       ├── landing.js # Home page
│   │   │       ├── lobby.js   # Waiting room
│   │   │       ├── game.js    # Game board
│   │   │       └── summary.js # Results
│   │   └── utils/
│   │       ├── format.js      # Format utilities
│   │       └── a11y.js        # Accessibility helpers
│   └── styles/
│       ├── theme.css          # Color scheme & variables
│       ├── layout.css         # Grid & layout
│       ├── components.css     # Component styles
│       └── accessibility.css  # Focus & a11y
├── package.json
├── vite.config.js
├── .env.example               # Environment template
├── supabase-setup.sql         # Database schema
└── SUPABASE_SETUP.md          # Setup instructions
```

## Accessibility Features

### Color Scheme
- **Background**: Pure white (#ffffff) for maximum contrast
- **Primary**: Vibrant Blue (#0066cc) - 4.5:1 contrast
- **Secondary**: Vibrant Orange (#ff6b35) - high visibility
- **Text**: Dark text (#1a1a1a) on light backgrounds

### Keyboard Navigation
- Tab through all interactive elements
- Enter to activate buttons
- Escape to close dialogs/cancel actions
- All focus states clearly visible (4px blue outline)

### Screen Reader Support
- Semantic HTML (`<button>`, `<form>`, `<table>`)
- ARIA labels for dynamic content
- Skip link to jump to main content
- Screen reader announcements for page changes

### Mobile & Responsive
- Works on phones, tablets, and desktop
- Touch targets minimum 44x44px
- Responsive grid layouts
- Scales well with browser zoom

## Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Test Accessibility
1. Use axe DevTools browser extension
2. Test with keyboard only (no mouse)
3. Test with screen reader (Mac VoiceOver, Windows Narrator)
4. Verify color contrast with Wave plugin

### Database Management
- Visit [Supabase Dashboard](https://supabase.com/dashboard)
- View/edit data in Table Editor
- Query with SQL Editor
- Monitor real-time subscriptions

## Troubleshooting

### "Supabase credentials not found"
- Create `.env` file (copy from `.env.example`)
- Add your Supabase URL and anon key
- Restart dev server

### Games not syncing in real-time
- Enable Replication in Supabase Settings
- Check browser console for errors
- Verify tables exist in Table Editor

### Game code not working
- Game codes are the first 8 characters of game ID
- Ensure player joined correct game
- Check that game is in 'waiting' or 'active' status

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Test accessibility (WCAG 2.1 AA)
4. Submit a pull request

## License

MIT - Free for personal and commercial use

## Roadmap

- [ ] Custom game codes (shorter, shareable)
- [ ] Undo/history for hand changes
- [ ] Statistics and leaderboards
- [ ] Hand descriptions with card examples
- [ ] Dark mode support
- [ ] Player avatars/colors
- [ ] Chat between players
- [ ] Mobile app (React Native)
- [ ] Multi-language support

## Support

- 📖 Read the [Supabase Setup Guide](./SUPABASE_SETUP.md)
- 🐛 Report issues on GitHub
- 💬 Discussions for questions
- 📧 Contact via email

---

Made with ❤️ for Mexican Rummy players everywhere.

[Report an Issue](https://github.com/yourusername/mexican-rummy-scoring/issues) • [View Roadmap](./ROADMAP.md) • [Visit Supabase](https://supabase.com)
