# Seeing Jesus Together — Solitude Scripture Schedule

A small web app that shows today's reading from the *Seeing Jesus Together*
Solitude plan and lets you read or listen via the ESV API. Sections, top to bottom:
**Old Testament**, **New Testament**, **Combined passages** (both back to back), and
**A Passage for Meditation** (can be switched off in Settings). It's now an installable PWA (Progressive Web App), so it can sit on
your Android home screen and open like a normal app.

## Combined passages and Settings
- **Combined passages**: Read shows the OT then NT text in one panel. Listen plays them as one
  continuous track with a single seek bar and total time. (The two ESV audio files can't be merged
  in the browser, so they are queued in one player and roll over automatically.)
- **Settings ⚙** (top right) holds your ESV API key and a **Show meditation passage** switch.
- The layout is compact so the first three sections fit on a phone screen without scrolling.

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

## Step 1: Put it online with GitHub Pages
Installing as an app and the offline cache both need the site to be served over **https**. GitHub Pages
provides that for free, at a permanent address.

1. Sign in at github.com (or create a free account).
2. Click **+ → New repository**. Name it (for example `sjt-readings`), set it to **Public**, tick
   **Add a README file**, and click **Create repository**.
3. Click **Add file → Upload files**, drag in all the app files (`index.html`, `app.js`, `plan.js`,
   `manifest.json`, `service-worker.js` and the four `icon-*.png` files), and click **Commit changes**.
4. Go to **Settings → Pages**. Under "Build and deployment", set Source to **Deploy from a branch**,
   choose branch **main** and folder **/ (root)**, and click **Save**.
5. After a minute or two the page shows your address, like `https://yourname.github.io/sjt-readings/`.

## Step 2: Install it on your phone

### Android (Chrome)
1. Open the https URL from Step 1 in **Chrome** on your phone.
2. Tap the **⋮** menu in the top right.
3. Tap **Install app** (or **Add to Home screen** on older Chrome versions).
4. Confirm — an icon appears on your home screen and app drawer.
5. Open it from there. It launches full-screen, without Chrome's address
   bar, like any other app.

### iPhone (Safari)
Use **Safari** for this; other iPhone browsers don't offer a proper install.
1. Open the https address in Safari.
2. Tap the **Share** button (the square with an arrow pointing up) at the bottom of the screen.
3. Scroll down and tap **Add to Home Screen**. (If you don't see it, tap **Edit Actions** to add it.)
4. Edit the name if you like (for example "SJT Daily"), leave **Open as Web App** on if it appears, and tap **Add**.
5. Open it from the new home-screen icon. It launches full-screen like any other app.

Note: the installed iPhone app keeps its own storage, separate from Safari, so add your API key again inside
the installed app (Step 3).

## Step 3: Add your API key on your phone
Local storage is per-browser-install, so the API key you entered on
desktop won't carry over automatically. Open the installed app once, tap
**Settings** in the top right, and paste your ESV key in — same as before.

## Notes
- The app shell (layout, today's readings, navigation) loads instantly
  and works offline once it's been opened once, thanks to the service
  worker. Tapping Read or Listen still needs an internet connection,
  since that's a live request to api.esv.org.
- Per ESV's terms, the app includes their copyright notice and a link to
  esv.org in the footer — please keep that intact if you customize things.

## Updating the app
1. Open your repository on github.com.
2. Click **Add file → Upload files** and drag in only the files that changed. Files with the same name
   replace the old ones.
3. Add a short note describing the change (for example "Updated how-to wording") and click **Commit changes**.
4. Wait a minute or two for the live site to update. You can watch progress under the **Actions** tab.
5. On your phone, open the installed app. It may need one extra reload (close it and reopen) to show the new version.

**Good to know**
- Every commit is saved as a new version, and the old ones are kept. Open any file and click **History** to see
  or restore an earlier version.
- Your friends always get the newest files. Nobody has to reinstall; installed copies update themselves.
- When you change `app.js`, `index.html` or `plan.js`, also bump the version number in `service-worker.js`
  (for example `sjt-shell-v8` to `sjt-shell-v9`) so phones pick up the change.
- Your API key is never stored in the repository. Each person's key stays on their own device.
