# Chrome Web Store submission: Flow Observer for Freedom 1.0.0

Copy each block into the matching field of the Chrome Web Store Developer Dashboard.

## Package
Upload `flow-observer-1.0.0.zip` (it is built from `extension/`; the README is left out).

## Store listing tab

**Name** (taken from the manifest): Flow Observer for Freedom

**Summary** (from the manifest, 122/132 characters):
See when you actually focus. Turns your Freedom session history into a timeline, heatmap and weekly stats. Nothing to log.

**Category:** Productivity → Workflow & Planning

**Language:** English

**Description:**

```
Freedom blocks the distractions. Flow Observer for Freedom shows you what happened next.

It reads the session history you already have in your Freedom account and turns it into stats you can see at a glance. You don't start timers, fill in forms or log anything. Keep using Freedom the way you do now.

WHAT YOU GET
• Popup: today's focus, the last 7 days with a trend line, and your streak. One click to your full stats or to your Freedom dashboard.
• 21-day timeline: every session laid out across the 24 hours, so you can see when you really focus.
• Daily heatmap and weekly totals: spot your good weeks and the gaps.
• Totals per session name: see how your "Deep Work Morning" compares with your ad-hoc sessions.
• Session types: mark any session as Focus, Sleep or Ignore. Sleep blocks stay on the timeline but don't inflate your focus hours.

PRIVATE BY DESIGN
• Your data stays in your browser (chrome.storage). There's no server, no account, no analytics and no tracking.
• The extension only talks to freedom.to, using the login you already have there.
• It syncs once an hour and whenever you open it.

HOW IT WORKS
Sign in at freedom.to in Chrome once. Flow Observer reads the same session history you see on Freedom's "Session History" tab and keeps a local copy to chart.

Flow Observer for Freedom is an independent, free project. It is not made by, affiliated with or endorsed by Freedom (80pct Solutions). "Freedom" is their trademark and is used here only to say which app this extension works with.
```

**Screenshots** (1280×800, in this order):
1. `screenshot-1-stats.png`: Stats page, overview and 21-day timeline
2. `screenshot-2-charts.png`: Heatmap, weekly totals, session names and session types
3. `screenshot-3-popup.png`: Toolbar popup

**Small promo tile** (440×280): `promo-small-440x280.png`

**Marquee promo tile** (1400×560): `promo-marquee-1400x560.png`

**Store icon** (128×128, artwork 96×96 with 16px transparent padding): `store-icon-128.png`

**Official URL / Homepage:** https://github.com/MichaelXi3/flow-observer
**Support URL:** https://github.com/MichaelXi3/flow-observer/issues

## Privacy practices tab

**Single purpose:**
```
Show the user charts and statistics of their own Freedom (freedom.to) focus-session history.
```

**Permission justifications:**

- `storage`:
  ```
  Keeps a local copy of the user's Freedom session history and their Focus/Sleep/Ignore choices so the popup and stats page can draw charts without re-downloading everything.
  ```
- `alarms`:
  ```
  Runs one sync per hour in the background so the stats are current when the user opens the popup.
  ```
- Host permission `https://freedom.to/*`:
  ```
  Reads the user's own session history from freedom.to (the same data shown on Freedom's Session History page), using the user's existing freedom.to login. No other site is accessed.
  ```

**Remote code:** No, I am not using remote code. (All JavaScript is in the package; no external scripts, fonts or eval.)

**Data usage:**
- Tick **"Personal communications"**: no. **"Website content"**: no. Tick **"User activity"**, because the extension reads the user's focus-session times from freedom.to. It processes them locally only.
- Certify all three:
  - I do not sell or transfer user data to third parties, outside of the approved use cases.
  - I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
  - I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** https://github.com/MichaelXi3/flow-observer/blob/main/PRIVACY.md

## Distribution tab
- Visibility: **Public** (or **Unlisted** for a quiet first release that only people with the link can install).
- Regions: all.
- Price: free.
