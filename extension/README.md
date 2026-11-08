# Flow Observer for Freedom

A Chrome extension that turns your [Freedom](https://freedom.to) session history into stats: when you actually focus, how much, and whether it's going up. You don't log anything. Keep using Freedom as you do now.

Not affiliated with Freedom.

## What you get

- **Popup** (pin it to the toolbar): today's focus, the last 7 days, your streak, plus **View stats** and **Go to dashboard** (freedom.to).
- **Stats page**:
  - Last 21 days as a 24-hour timeline
  - Daily focus heatmap
  - Weekly totals
  - Totals per session name
- **Session types**: mark each of your Freedom session names as *Focus*, *Sleep* or *Ignore*. Sleep blocks are shown but don't count toward focus. Names containing "sleep" start out as Sleep.

## How it works

- Every hour, when Chrome starts, and when you open the popup, the background worker reads `freedom.to/concluded_sessions`, the endpoint behind the "Session History" tab on Freedom's website. It uses your existing freedom.to login, so you don't need to enter a password or set anything up.
- Each sync stops at the first page it has already seen, so after the first sync it is usually a single request.
- Data is stored in `chrome.storage.local`. Nothing is sent anywhere else, and the only host permission is `freedom.to`.

## Install (developer mode)

1. Go to chrome://extensions and turn on **Developer mode**.
2. Click **Load unpacked** and choose this folder.
3. Pin **Flow Observer** from the puzzle-piece menu.

## Files

| File | Role |
|---|---|
| `lib.js` | Sync, storage, and the stats math shared by every page |
| `theme.css` | Shared look: forest, sand and cream; serif headlines, mono labels and numbers |
| `bg.js` | Service worker: hourly alarm and sync on request |
| `popup.*` | Toolbar popup |
| `stats.*` | Full stats page (plain SVG, no libraries) |

## Known limits

- `concluded_sessions` is Freedom's private web API. If Freedom changes it, sync stops and the popup shows "Sync failed".
- A scheduled session counts as focus even if you weren't at your computer.
