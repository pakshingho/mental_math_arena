# Mental Math Arena MVP

A dependency-free public-beta prototype for validating a mental math training arena.

## What Is Included

- Solo 60-second drills for addition, subtraction, multiplication, division, and mixed sets.
- Five difficulty levels with progressively larger numbers and harder operations.
- Bot-backed 45-second arena battles so early users always get a match.
- Local seasonal leaderboard, player rating, win/loss record, streaks, and best scores.
- Mock Pro subscription CTA that records purchase intent without collecting payment.
- PWA manifest and service worker for installable/offline behavior when served over HTTP.

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

## Deploy With GitHub Pages

1. Create an empty public repository named `mental_math_arena` under `pakshingho`.
2. Push this local repo:

```sh
git remote add origin https://github.com/pakshingho/mental_math_arena.git
git push -u origin main
```

3. In GitHub, open repository settings, go to Pages, and set the source to GitHub Actions.
4. The included workflow deploys the static site from the repository root.
