# Mental Math Arena MVP

A dependency-free public-beta prototype for validating a mental math training arena.

## What Is Included

- Solo 60-second drills for addition, subtraction, multiplication, division, and mixed sets.
- Five difficulty levels with progressively larger numbers and harder operations.
- Bot-backed 45-second arena battles so early users always get a match.
- Separate local rankings by operation and level, with board-specific rating, record, and best score.
- Editable player name persisted locally and reflected in battles and rankings.
- Mock Pro subscription CTA that records purchase intent without collecting payment.
- PWA manifest and service worker for installable/offline behavior when served over HTTP.

## Visual Direction

The current redesign branch tests a competitive math arcade identity: hard scoreboard borders, retro calculator answer panels, chess-clock battle timing, and sports league standings. It intentionally removes the earlier glassy/gradient SaaS look.

## Run Locally

Open `index.html` directly in a browser, or serve the folder over HTTP:

```sh
/Applications/Codex.app/Contents/Resources/node -e "require('http').createServer((req,res)=>{const fs=require('fs');const path=require('path');const file=path.join(process.cwd(),req.url==='/'?'index.html':req.url);fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.end(data);});}).listen(4173,()=>console.log('http://localhost:4173'))"
```

## Market-Test Signals

Use this MVP to measure:

- Drill starts and completion quality.
- Battle starts and repeat battles.
- Pro CTA taps at `$4.99/month` and `$29.99/year`.
- Whether users return after trying ranked battles.

All current data is stored in `localStorage`; no backend or payment provider is connected yet.

## Analytics

The app now sends privacy-friendly Plausible custom events when the Plausible script is active, and also keeps the latest 120 events in `localStorage` under `mentalMathArenaState.v1`.

Live site domain used in the Plausible snippet:

```text
pakshingho.github.io
```

Create these custom event goals in Plausible with names that match exactly:

- `Solo Start`
- `Solo Finish`
- `Battle Queue`
- `Battle Start`
- `Battle Finish`
- `Pro Intent`

Event properties include operation, level, score, accuracy, result, rating, and price fields where relevant. In a browser console, inspect the local event log with:

```js
JSON.parse(localStorage.getItem("mentalMathArenaState.v1")).analytics.events
```

For the GitHub Pages project path, filter Plausible reports to `/mental_math_arena/` if the dashboard also tracks other pages on `pakshingho.github.io`.

## Deploy With GitHub Pages

1. Create an empty public repository named `mental_math_arena` under `pakshingho`.
2. Push this local repo:

```sh
git remote add origin https://github.com/pakshingho/mental_math_arena.git
git push -u origin main
```

3. In GitHub, open repository settings, go to Actions > General > Workflow permissions, and select Read and write permissions.
4. After the first production workflow creates the `gh-pages` branch, open Settings > Pages and set the source to Deploy from a branch, branch `gh-pages`, folder `/ (root)`.
5. The included production workflow deploys `main` to the root of `gh-pages`.

## Preview Pull Requests

PR previews deploy to the same GitHub Pages site under a separate path:

```text
https://pakshingho.github.io/mental_math_arena/pr-preview/pr-<number>/
```

When a pull request is opened, updated, reopened, or closed, the `Deploy PR preview to GitHub Pages` workflow builds the static files, writes them to `gh-pages/pr-preview/pr-<number>/`, comments the preview URL on the PR, and removes the preview after the PR closes.
