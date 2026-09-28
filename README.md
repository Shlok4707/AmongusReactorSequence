# Reactor Sequence

Memory game built with **React + Vite + Tailwind CSS** (frontend only).

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Page flow

`home page bg` → (Start Game) → `timer bg` (3·2·1) → `main game bg` (90 s) → `final bg` → (Back to Home) → `home page bg`

## Where things live

| What | File |
| --- | --- |
| Round lengths, timings, speed | `src/game/constants.js` |
| Game logic (timer, rounds, retry) | `src/pages/MainGamePage.jsx` |
| Left grid / right keypad / indicators | `src/components/Panel.jsx` |
| 2 s kill animation | `src/components/KillAnimation.jsx` + keyframes in `src/index.css` |
| Background + sprite mapping | `src/assets.js` |

## Assets

`src/assets/screen bg/` — `home pg bg.jpeg`, `timer bg.PNG`, `main game bg.jpg`, `final bg.jpg`
`src/assets/kill animation/` — `killer.png`, `lost.png`, `fire.png`

`killer.png` and `lost.png` are the originals with the black background cut out.
`fire.png` is the fire with the black made transparent and the ends blended so it tiles seamlessly.
To swap an image, replace the file with the same name (update the pixel size in `src/assets.js` if a background changes dimensions).
