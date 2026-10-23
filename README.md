# Sky Hopper

## Run the game and backend

Install Node.js 20 or newer, then run these commands from this folder:

```sh
npm install
npm start
```

Open <http://localhost:3000>. The SQLite database is created automatically at
`data/skyhopper.sqlite`. Keep the database file private and back it up if you
want to preserve player accounts.
The development server binds to `127.0.0.1` and is only reachable from this
computer. Cross-device accounts require deploying the game and backend to a
shared HTTPS host.

## Install on Android

Deploy the game to a public HTTPS host, or use a secure local development host.
On an Android phone, open the game URL in Chrome, then select **Install app**
when offered (or open the browser menu and choose **Install app** or
**Add to Home screen**). Launch Sky Hopper from its new home-screen icon.
The first visit downloads the game shell; after that, the adventure can be
played offline. Account sign-in, cloud progress sync, and the leaderboard need
an internet connection and a reachable backend.
Use the fullscreen icon in the game header to expand the play interface;
press Escape or tap the icon again to return.

## Publish with GitHub Pages

The included GitHub Actions workflow publishes the static game when changes are
pushed to the `main` branch. In the GitHub repository, open **Settings → Pages**
and select **GitHub Actions** as the build and deployment source. The game will
then be available at `https://<owner>.github.io/<repository>/`.

GitHub Pages does not run the Node.js/SQLite backend. The game remains playable
with browser-local progress, but accounts, cloud sync, and the leaderboard
require a separately hosted backend.

The backend provides username/password accounts, cross-device stage progress,
side-quest badges, and a public leaderboard. Passwords are hashed with Node's
built-in scrypt; sign-in sessions use HTTP-only cookies.

The leaderboard is intended for a casual local game: progress is reported by
the browser and is not protected against score tampering. Do not expose this
development server publicly without HTTPS, production hosting safeguards, and
server-side game-score verification.

Run the backend tests with:

```sh
npm test
```

Opening `index.html` directly with a `file://` URL still supports local
browser progress, but account and leaderboard features require the server.
