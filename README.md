# ✦ Photo Booth

A fun, themed browser photo booth built with React. Take a 3-photo strip with your webcam, add stickers, apply filters, pick a glitter border, and download the finished strip as a PNG.

![Photo Booth](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## ✨ Features

- **10 themes** — Forest, Ocean, Anime, Halloween, Sakura, Galaxy, Pixel, Autumn, Disco, Music. Each theme has its own color palette, font, and glow style.
- **Glitter borders** — Pixel-rendered glitter texture with bilinear corner blending so colors transition smoothly around every corner. 40 white sparkle stars scattered around the frame.
- **8 camera filters** — Normal, Warm, Cool, B&W, Sepia, Vivid, Fade, Dreamy applied in real-time via canvas pixel manipulation.
- **Stickers** — 100+ themed stickers loaded from external sources (Flaticon). Tap to place, drag to reposition, resize, rotate, flip, and double-click to remove.
- **Border preview grid** — Live canvas thumbnails of every border style before you pick.
- **3-photo strip** — Countdown timer, flash animation, redo any slot individually.
- **Download** — Exports the full strip as a PNG with theme header and date footer.
- **Responsive** — Works on mobile and desktop.

---

## 📁 Project Structure

```
src/
├── constants/
│   ├── themes.js
│   ├── filters.js
│   ├── borders.js
│   ├── stickers.js
│   └── camera.js
├── utils/
│   ├── glitter.js
│   ├── filterUtils.js
│   └── stickerCache.js
├── hooks/
│   └── useCamera.js
└── components/
    ├── BorderPreview.jsx
    └── PhotoBooth.jsx
```

---

## 🚀 Getting Started

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

---

## 🔤 Google Fonts

Add these to your `index.html` `<head>` for the theme fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Cinzel&family=Orbitron&family=Fredoka+One&family=Creepster&family=Pacifico&family=Playfair+Display:wght@700&family=Press+Start+2P&display=swap" rel="stylesheet">
```

---

## 🧩 Sticker Assets

Stickers are loaded dynamically using external image URLs (primarily from Flaticon).

- No local image files are required  
- Images are cached in-memory for performance  
- Emoji fallbacks are used if an image fails to load  

---

## 🙏 Credits (Huge Thanks)

A **massive thank you to Flaticon** for providing the icons and stickers used in this project.

- https://www.flaticon.com/stickers  
- High-quality PNG/SVG assets  
- Huge variety across styles and themes  
- Used via direct image URLs in this project  

Additional resources:
- https://openmoji.org — open-source emoji set  
- https://svgrepo.com — large collection of free SVG assets  

---

## 🎨 How the Glitter Border Works

Each border style defines 4 corner RGB colors:

- `tl` (top-left)  
- `tr` (top-right)  
- `bl` (bottom-left)  
- `br` (bottom-right)  

For every border pixel, the color is **bilinearly interpolated** across the canvas, creating smooth gradient transitions.

On top of the base:

- Per-pixel noise adds a glitter texture  
- ~1.2% of pixels become bright white sparkles  
- 40 star bursts are rendered around the edges  

To adjust border thickness:

```
BORDER_T in src/constants/borders.js
```

---

## ➕ Adding a New Theme

### 1. Add theme to `themes.js`

```js
myTheme: {
  name: "My Theme",
  emoji: "🌈",
  background: "#0a0a0a",
  backgroundGradient: "radial-gradient(...)",
  accent: "#ff6b6b",
  accentDim: "#4a0000",
  textColor: "#ffe0e0",
  mutedColor: "#8b2222",
  panelBackground: "rgba(10, 0, 0, 0.97)",
  glow: "#ff6b6b",
  font: "'Pacifico', cursive",
}
```

---

### 2. Add border colors

```js
myTheme: { tl:[255,120,120], tr:[255,180,80], bl:[200,80,200], br:[80,160,255] }
```

---

### 3. Add glow color

```js
myTheme: "#ff6b6b"
```

---

### 4. Add border entry

```js
{ id: "myTheme", name: "My Theme", preview: "🌈" }
```

---

### 5. Add stickers

```js
// STICKER_URLS
mySticker: "https://cdn.flaticon.com/.../mysticker.png"

// STICKERS_PER_THEME
myTheme: ["mySticker"]

// STICKER_FALLBACK
mySticker: "🌈"
```

---

## ⚙️ Customisation

| What | Where |
|------|------|
| Border thickness | `BORDER_T` in `borders.js` |
| Sparkle stars | `STAR_POSITIONS` |
| Camera resolution | `camera.js` |
| Filters | `filters.js` |
| Stickers | `stickers.js` |
| Countdown timing | `useCamera.js` |

---

## 🛠 Tech Stack

- React 18  
- Canvas API  
- No external dependencies  

---

## 📄 License

MIT