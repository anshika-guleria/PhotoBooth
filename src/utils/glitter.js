import { BORDER_CORNERS, GLOW_COLORS, STAR_POSITIONS, BORDER_T } from '../constants/borders';

export function hash(n) {
  n = ((n >> 16) ^ n) * 0x45d9f3b;
  n = ((n >> 16) ^ n) * 0x45d9f3b;
  n = (n >> 16) ^ n;
  return (n >>> 0) / 0xffffffff;
}

function cornerColor(px, py, W, H, corners) {
  const tx = px / W, ty = py / H;
  const { tl, tr, bl, br } = corners;
  return [
    tl[0]*(1-tx)*(1-ty) + tr[0]*tx*(1-ty) + bl[0]*(1-tx)*ty + br[0]*tx*ty,
    tl[1]*(1-tx)*(1-ty) + tr[1]*tx*(1-ty) + bl[1]*(1-tx)*ty + br[1]*tx*ty,
    tl[2]*(1-tx)*(1-ty) + tr[2]*tx*(1-ty) + bl[2]*(1-tx)*ty + br[2]*tx*ty,
  ];
}

function fillBorderPixels(imageData, W, H, corners) {
  const d = imageData.data;
  const T = BORDER_T;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      if (px >= T && px < W - T && py >= T && py < H - T) continue;
      const [r, g, b] = cornerColor(px, py, W, H, corners);
      const n1 = hash(py * W + px);
      const n2 = hash(py * W + px + 5555555);
      let fr, fg, fb;
      if (n1 > 0.988) {
        fr = fg = fb = 255;
      } else {
        const br = 0.88 + n2 * 0.24;
        fr = Math.min(255, Math.round(r * br));
        fg = Math.min(255, Math.round(g * br));
        fb = Math.min(255, Math.round(b * br));
      }
      const i4 = (py * W + px) * 4;
      d[i4] = fr; d[i4+1] = fg; d[i4+2] = fb; d[i4+3] = 255;
    }
  }
}

function drawBorderStars(ctx, W, H) {
  const T = BORDER_T;
  const totalPerim = 2 * (W + H);
  STAR_POSITIONS.forEach(([nx, ny], i) => {
    const pos = nx * totalPerim;
    let sx, sy;
    if      (pos < W)         { sx = pos;           sy = ny * T; }
    else if (pos < W + H)     { sx = W - ny * T;    sy = pos - W; }
    else if (pos < 2*W + H)   { sx = 2*W + H - pos; sy = H - ny * T; }
    else                      { sx = ny * T;         sy = totalPerim - pos; }
    const sr = 4 + hash(i * 7 + 99) * 9;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = sr * 0.8;
    ctx.beginPath();
    for (let p = 0; p < 8; p++) {
      const ang = p * Math.PI / 4;
      const rad = p % 2 === 0 ? sr : sr * 0.1;
      ctx.lineTo(sx + Math.cos(ang) * rad, sy + Math.sin(ang) * rad);
    }
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(sx, sy, sr * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}

export function drawArtBorder(ctx, w, h, style) {
  if (style === "none") return;
  const corners = BORDER_CORNERS[style];
  if (!corners) return;
  const T = BORDER_T;
  const imageData = ctx.getImageData(0, 0, w, h);
  fillBorderPixels(imageData, w, h, corners);
  ctx.putImageData(imageData, 0, 0);
  drawBorderStars(ctx, w, h);
  const gc = GLOW_COLORS[style] || "#ffffff";
  ctx.save();
  ctx.strokeStyle = gc; ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.6;
  ctx.shadowColor = gc; ctx.shadowBlur = 8;
  ctx.strokeRect(T + 1, T + 1, w - T*2 - 2, h - T*2 - 2);
  ctx.restore();
}
