# Seeing Jesus Together — Solitude Scripture Schedule

A small web app that shows today's reading from the *Seeing Jesus Together*
Solitude plan (Old Testament chapter, New Testament chapter, and a short
meditation passage), and lets you read or listen to each one via the ESV
API. It's now an installable PWA (Progressive Web App), so it can sit on
your Android home screen and open like a normal app.

## Files
- `index.html` — the app
- `app.js` — app logic
- `plan.js` — the reading plan: the 2025/2026/2027 schedules plus the engine that
  aligns them to any calendar year
- `manifest.json` — tells Android/Chrome how to install it
- `service-worker.js` — caches the app shell so it opens instantly and
  works offline (Read/Listen still need a live connection)
- `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `icon-180.png` —
  app icons

All files must stay together in the same folder.

## How the 3-year cycle works
The plan repeats every three years, each time re-aligned to that year's calendar:

| Plan used | Years |
|---|---|
| 2025 | 2025, 2028, 2031, 2034, ... |
| 2026 | 2026, 2029, 2032, 2035, ... |
| 2027 | 2027, 2030, 2033, 2036, ... |

Each plan is stored as an ordered list of weekday readings and an ordered list
of Saturday psalms. A year is built by pouring the weekday list into that
year's Monday-Friday slots and the psalms into its Saturdays, so **Psalms always
land on Saturdays and Sundays are always blank**. 2025, 2026 and 2027 reproduce
the published schedules exactly.

Calendars don't always match the plan's length, so:
- **One extra weekday** (e.g. 2032, 2036): the last weekday is a "catch-up day" with no new reading.
- **One extra Saturday** (e.g. 2028, 2033): that Saturday has no psalm assigned.
- **One fewer weekday** (e.g. 2028, 2033, 2034): the plan's last weekday is folded into the final
  reading day, so no chapter is skipped (in the 2025 plan that means 1 Samuel 24 and 25 on the same day).

## Reconstructed: July-December 2027
The 2027 file you supplied ends on June 30, 2027. July-December 2027 was
reconstructed from the end of the 2024 schedule:
- Old Testament continues from Lamentations 4 through Malachi 4 in the same order as 2024 (verified against it).
  Malachi 4 lands on Dec 28, so **Dec 29-31, 2027 have no Old Testament chapter** (the OT is finished).
- New Testament chapters continue in order from 1 Timothy 5 to Matthew 28, with Matthew 28 repeated on the last
  day (the same pattern as 2025 and 2026).
- Meditation passages come from the 2024 schedule (they match the 2025/2026 ones for every chapter in this stretch).
  The 2027 file revised some passages in the first half of the year, so the official July-December 2027 schedule
  may differ in a few places.
- Psalms 125-150 fall on the 26 Saturdays from July 3 to Dec 25. The 2024 schedule has no meditation excerpt for
  Psalms 146 and 147, so those two Saturdays show the full psalm only.
Days that come from this reconstruction carry a small note in the app. `reconstructed_2027_Jul-Dec.csv` lists them all
so you can compare against the official schedule when it is released; if it differs, send it over and the plan can be corrected.

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
- Updating: re-upload `index.html`, `app.js`, `plan.js`, `service-worker.js` and `manifest.json`; the service
  worker will pick up the new version the next time the app is opened
  (it may take one extra reload to fully refresh).
- Per ESV's terms, the app includes their copyright notice and a link to
  esv.org in the footer — please keep that intact if you customize things.
