# Mexican Rummy Scorekeeper

A static, GitHub Pages-friendly scoring app for Mexican Rummy. One person hosts the game, players join from their own devices, and everyone can follow the live score and each player's completed hands.

## Features

- Host or join a room from a browser.
- Host can add players, mark achieved hands, and add or remove score entries.
- Players get a read-only live view of scores, completed hands, and remaining hands.
- Export and import JSON snapshots for backup.
- Works as plain static files, so it can be hosted on GitHub Pages.
- Built with accessibility in mind: semantic HTML, keyboard-friendly controls, visible focus states, color contrast, responsive layouts, and status announcements.

## Hands Tracked

1. 2 sets of 3
2. 2 runs of 3
3. A run of 3 and set of 3
4. 2 sets of 4
5. 3 sets of 3
6. 2 runs of 4
7. 2 runs of 5
8. 2 sets of 5
9. A run of 5 and a set of 5
10. A run of 10

## How Live Rooms Work

The app uses PeerJS for browser-to-browser sync. GitHub Pages can only host static files, so the host browser acts as the live game hub. Keep the host tab open during the game.

The public PeerJS script is loaded from `unpkg.com`. If it is unavailable, the app still works as a local scorecard and snapshots can be exported.

## Deploy To GitHub Pages

1. Push `index.html`, `styles.css`, `app.js`, and this `README.md` to a GitHub repository.
2. In the repository, open **Settings > Pages**.
3. Choose the branch that contains these files.
4. Choose the root folder and save.
5. Share the GitHub Pages URL with players.

## Running Locally

Open `index.html` in a browser. For the live room flow, use a browser with internet access so PeerJS can load.

## Accessibility Notes

This is designed to support AODA-aligned use, with WCAG-minded patterns such as clear labels, keyboard operation, strong contrast, responsive reflow, and non-color-only status labels. Before public use, run a final manual check with keyboard navigation, screen reader smoke testing, and an automated checker such as axe or Lighthouse.

## License

MIT
