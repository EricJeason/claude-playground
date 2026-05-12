# 暮谷镇 · Murk Valley

A generative NPC social-simulation prototype. The player inhabits 1 of 12
hand-written characters (or observes from above) and roams across four
locations in a quiet village. Other NPCs react via an LLM call (OpenRouter →
DeepSeek-v4-pro). Pure front-end, no build step, key stays in the browser.

This repo currently contains **PR 01 / scaffolding + intro screens** out of 14
planned screens.

## What's in this build

| Screen | Status        | Notes                                                    |
| ------ | ------------- | -------------------------------------------------------- |
| S1     | ✅ Implemented | Startup · LLM connect · perspective pick                 |
| S1.5   | ✅ Implemented | New / Continue / Load (only shown when a save exists)    |
| S2     | ✅ Implemented | Pick which of the 12 to embody                           |
| S3     | 🚧 Placeholder | Main screen — will land in the next PR                   |
| S4–S14 | ⬜ Not started | Movement, dialogue, mind-reading, etc.                   |

Also intentionally **not** in this PR: real LLM calls, movement logic, dialogue
generation, save management UI, responsive/mobile layout.

## Run locally

No npm, no build. Just serve the directory over HTTP (Babel-standalone needs
real URLs for the script tags):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

The page is a fixed 1280 × 800 letterboxed stage; the design assumes desktop.

## Manual smoke test

1. Open `http://localhost:8000` → S1.
2. Type any fake key, leave perspective on **扮演**, click **进入暮谷镇** → S2.
3. Pick a card (or hit 🎲), click **确认扮演** → S3 placeholder shows the picked
   name and starting location.
4. Inspect `localStorage`: `mv_api_key`, `mv_view_mode`, `mv_playing_as` are
   populated.
5. To exercise S1.5: in devtools run
   ```js
   localStorage.setItem('mv_saves', '[{"playingAs":"a04","gameDate":"第 3 天 · 黄昏","savedAt":"昨天 19:30"}]');
   location.hash = '#/s1';
   ```
   then click **进入** — you should land on S1.5 instead of S2.

## File layout

```
/
├── index.html                ← entry; loads React, Babel, fonts, CSS
├── README.md
├── css/
│   └── styles.css            ← tokens + every component class
├── js/
│   ├── app.js                ← <App/>, hash router, GameContext
│   ├── screens/
│   │   ├── s1.js
│   │   ├── s1_5.js
│   │   ├── s2.js
│   │   └── s3.js
│   └── lib/
│       ├── storage.js        ← typed wrapper over localStorage
│       └── data.js           ← fetches & caches agents.json + world.json
└── data/
    ├── agents.json           ← 12 NPC stubs
    └── world.json            ← 4 locations + constants
```

## Tech stack (hard constraints)

- **No npm, no bundler, no build step.** Everything from CDNs.
- React 18 + ReactDOM + Babel-standalone (unpkg).
- Google Fonts: Cormorant Garamond / Kalam / Caveat / IBM Plex Mono.
- Hash router (`#/s1`, `#/s1_5`, `#/s2`, `#/s3`).
- Storage: `localStorage` only, prefix `mv_`.
- Min width 1280 px, desktop only for now.

## localStorage schema

| Key               | Type             | Default                       |
| ----------------- | ---------------- | ----------------------------- |
| `mv_api_key`      | string           | `""`                          |
| `mv_api_channel`  | string           | `"openrouter"`                |
| `mv_api_model`    | string           | `"deepseek/deepseek-v4-pro"`  |
| `mv_non_thinking` | `"1"` \| `"0"`   | `"1"`                         |
| `mv_view_mode`    | string           | `"embody"`                    |
| `mv_playing_as`   | string           | `""`                          |
| `mv_saves`        | JSON array       | `[]`                          |
| `mv_settings`     | JSON object      | `{}`                          |

## Deploy to GitHub Pages

This is a static site, so any path works:

1. Settings → Pages → Source: `Deploy from a branch`.
2. Branch: `main`, folder `/ (root)`.
3. Wait for the action, then verify:
   - The font fallback ladder renders if Google Fonts is blocked.
   - All hash routes work after a hard refresh (Pages serves `index.html`
     for `/` and we never use real paths).
   - `localStorage` reads/writes survive a reload.
