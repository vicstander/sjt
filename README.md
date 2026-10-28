# Seeing Jesus Together — 2026 Solitude Schedule

A small web app that shows today's reading from the *Seeing Jesus Together*
2026 plan (Old Testament chapter, New Testament chapter, and a short
meditation passage), and lets you read or listen to each one via the ESV
API. It's now an installable PWA (Progressive Web App), so it can sit on
your Android home screen and open like a normal app.

## Files
- `index.html` — the app
- `app.js` — app logic
- `manifest.json` — tells Android/Chrome how to install it
- `service-worker.js` — caches the app shell so it opens instantly and
  works offline (Read/Listen still need a live connection)
- `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `icon-180.png` —
  app icons

All files must stay together in the same folder.

## Step 1: Put it online (needed for install + offline support)

Installing as an app and the offline cache both require the site to be
served over **https**, not opened as a local file. Two easy free options:

### Option A — Netlify Drop (fastest, no account needed)
1. Go to **https://app.netlify.com/drop** on your computer.
2. Drag the whole folder (all the files above) onto the page.
3. Netlify gives you a live `https://…netlify.app` URL immediately.
   (You can claim/keep it permanently later by creating a free account,
   or just leave it as a temporary drop — it stays live either way unless
   you delete it.)

### Option B — GitHub Pages (permanent, tied to your GitHub account)
1. Create a free account at github.com if you don't have one.
2. Create a new repository (e.g. `sjt-2026`), and upload all the files
   from this folder to it (drag-and-drop works in GitHub's web UI, or
   `git push` if you're comfortable with git).
3. In the repo, go to **Settings → Pages**, set Source to the `main`
   branch (root folder), and save.
4. GitHub gives you a URL like `https://yourname.github.io/sjt-2026/`
   after a minute or two.

## Step 2: Install it on your Android phone
1. Open the https URL from Step 1 in **Chrome** on your phone.
2. Tap the **⋮** menu in the top right.
3. Tap **Install app** (or **Add to Home screen** on older Chrome versions).
4. Confirm — an icon appears on your home screen and app drawer.
5. Open it from there. It launches full-screen, without Chrome's address
   bar, like any other app.

## Step 3: Add your API key on the phone
Local storage is per-browser-install, so the API key you entered on
desktop won't carry over automatically. Open the installed app once, tap
**API Key** in the top right, and paste your ESV key in — same as before.

## Notes
- The app shell (layout, today's readings, navigation) loads instantly
  and works offline once it's been opened once, thanks to the service
  worker. Tapping Read or Listen still needs an internet connection,
  since that's a live request to api.esv.org.
- If you ever update the files, re-upload them to your host; the service
  worker will pick up the new version the next time the app is opened
  (it may take one extra reload to fully refresh).
- Per ESV's terms, the app includes their copyright notice and a link to
  esv.org in the footer — please keep that intact if you customize things.
