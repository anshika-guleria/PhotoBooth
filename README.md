# ✦ Photo Booth

A fun, themed browser photo booth built with React. Take a 3-photo strip with your webcam, add stickers, apply filters, pick a glitter border, and download the finished strip as a PNG.

![Photo Booth](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## Features

- **10 themes** — Forest, Ocean, Anime, Halloween, Sakura, Galaxy, Pixel, Autumn, Disco, Music. Each theme has its own color palette, font, and glow style.
- **Glitter borders** — Pixel-rendered glitter texture with bilinear corner blending so colors transition smoothly around every corner. 40 white sparkle stars scattered around the frame.
- **8 camera filters** — Normal, Warm, Cool, B&W, Sepia, Vivid, Fade, Dreamy applied in real-time via canvas pixel manipulation.
- **Stickers** — 100+ themed stickers per category. Tap to place, drag to reposition, double-click to remove.
- **Border preview grid** — Live canvas thumbnails of every border style before you pick.
- **3-photo strip** — Countdown timer, flash animation, redo any slot individually.
- **Download** — Exports the full strip as a PNG with theme header and date footer.
- **Responsive** — Works on mobile and desktop.

---

## Project Structure

```
src/
├── constants/
│   ├── themes.js          # 10 theme definitions (colors, fonts, gradients)
│   ├── filters.js         # Camera filter definitions with pixel transform fns
│   ├── borders.js         # Glitter border corner colors, glow colors, star positions
│   ├── stickers.js        # Sticker URLs, per-theme lists, emoji fallbacks
│   └── camera.js          # Camera resolution constants
├── utils/
│   ├── glitter.js         # Pixel-level glitter renderer + star drawer
│   ├── filterUtils.js     # applyFilterToPixels helper
│   └── stickerCache.js    # Image cache for sticker PNGs
├── hooks/
│   └── useCamera.js       # Camera start/stop + live canvas render loop
└── components/
    ├── BorderPreview.jsx   # Visual border picker grid with canvas thumbnails
    └── PhotoBooth.jsx      # Main component — UI, state, handlers
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A modern browser with webcam access

### Install & Run

```bash
git clone https://github.com/your-username/photo-booth.git
cd photo-booth
npm install
npm run dev
```

### Google Fonts

Add these to your `index.html` `<head>` for the theme fonts to load correctly:

```html
<link href="https://fonts.googleapis.com/css2?family=Cinzel&family=Orbitron&family=Fredoka+One&family=Creepster&family=Pacifico&family=Playfair+Display:wght@700&family=Press+Start+2P&display=swap" rel="stylesheet">
```

---

## Sticker Assets

Stickers are loaded from `/public/assets/<theme>/stickers/<name>.png`. The app ships with emoji fallbacks for every sticker so it works out of the box without any image files. To use real PNG stickers, drop them in the matching path.

Free sticker sources:
- [flaticon.com/stickers](https://www.flaticon.com/stickers) — 81k+ PNG/SVG, free with attribution
- [openmoji.org](https://openmoji.org) — open-source illustrated style
- [svgrepo.com](https://svgrepo.com) — 500k+ SVGs, MIT/CC0 licensed

---

## How the Glitter Border Works

Each border style defines 4 corner RGB colors (`tl`, `tr`, `bl`, `br`). For every border pixel, the color is **bilinearly interpolated** across the full canvas from all four corners — so colors blend naturally at every corner with no hard edges.

On top of the base color, per-pixel brightness noise is applied using a fast integer hash function (no `Math.sin`, so no zebra striping). ~1.2% of pixels become pure white specks — the glitter grain. Finally, 40 fixed 4-point white star bursts are drawn spaced evenly around the perimeter.

To adjust border thickness, change `BORDER_T` in `src/constants/borders.js`.

---

## Adding a New Theme

**1. Add the theme to `src/constants/themes.js`:**

```js
myTheme: {
  name: "My Theme", emoji: "🌈",
  background: "#0a0a0a",
  backgroundGradient: "radial-gradient(ellipse at 50% 0%, #1a1a1a 0%, #0a0a0a 65%)",
  accent: "#ff6b6b", accentDim: "#4a0000", textColor: "#ffe0e0",
  mutedColor: "#8b2222", panelBackground: "rgba(10, 0, 0, 0.97)",
  glow: "#ff6b6b", font: "'Pacifico', cursive",
},
```

**2. Add corner colors to `src/constants/borders.js`:**

```js
myTheme: { tl:[255,120,120], tr:[255,180,80], bl:[200,80,200], br:[80,160,255] },
```

**3. Add a glow color to `GLOW_COLORS` in `src/constants/borders.js`:**

```js
myTheme: "#ff6b6b",
```

**4. Add a border entry to `PHOTO_BORDERS`:**

```js
{ id: "myTheme", name: "My Theme", preview: "🌈" },
```

**5. Add stickers to `src/constants/stickers.js`:**

```js
// In STICKER_URLS:
mySticker: "/assets/mytheme/stickers/mysticker.png",

// In STICKERS_PER_THEME:
myTheme: ["mySticker", ...],

// In STICKER_FALLBACK:
mySticker: "🌈",
```

---

## Customisation

| What | Where |
|---|---|
| Border thickness | `BORDER_T` in `src/constants/borders.js` |
| Number of sparkle stars | `STAR_POSITIONS` array length in `src/constants/borders.js` |
| Camera resolution | `CAMERA_WIDTH` / `CAMERA_HEIGHT` in `src/constants/camera.js` |
| Add a filter | Push a new entry to `CAMERA_FILTERS` in `src/constants/filters.js` |
| Countdown duration | `setInterval` delay in `useCamera.js` |

---

## Tech Stack

- **React 18** — UI and state
- **Canvas API** — live camera feed, pixel filters, glitter rendering, photo capture
- **No external dependencies** beyond React itself

---

## License

MIT