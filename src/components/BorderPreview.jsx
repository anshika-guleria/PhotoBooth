import { useEffect, useRef } from "react";
import { BORDER_T, PHOTO_BORDERS } from '../constants/borders';
import { drawArtBorder } from '../utils/glitter';

export default function BorderPreview({ selectedBorder, onSelect, theme }) {
  const canvasRefs = useRef({});
  const T = BORDER_T;

  useEffect(() => {
    PHOTO_BORDERS.forEach(b => {
      if (b.id === "none") return;
      const canvas = canvasRefs.current[b.id];
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const W = canvas.width, H = canvas.height;
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, W, H);
      const innerGrad = ctx.createLinearGradient(T, T, W - T, H - T);
      innerGrad.addColorStop(0, "#1a1a2e");
      innerGrad.addColorStop(1, "#16213e");
      ctx.fillStyle = innerGrad;
      ctx.fillRect(T, T, W - T*2, H - T*2);
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.font = `${Math.floor(H * 0.3)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("📷", W/2, H/2);
      drawArtBorder(ctx, W, H, b.id);
    });
  }, []);

  return (
    <div>
      <div style={{
        fontSize: 12, fontWeight: "bold", color: theme.accent,
        letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10,
      }}>
        Border Preview
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
        gap: 8,
      }}>
        {/* None option */}
        <div
          onClick={() => onSelect("none")}
          style={{
            cursor: "pointer", borderRadius: 8,
            border: `2px solid ${"none" === selectedBorder ? theme.accent : theme.accent + "40"}`,
            background: "none" === selectedBorder ? theme.accent + "20" : "transparent",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "8px 4px", gap: 4,
          }}
        >
          <div style={{
            width: 72, height: 54, borderRadius: 6,
            border: `1px dashed ${theme.mutedColor}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: theme.mutedColor, fontSize: 18,
          }}>○</div>
          <span style={{ fontSize: 10, color: theme.mutedColor }}>None</span>
        </div>

        {PHOTO_BORDERS.filter(b => b.id !== "none").map(b => (
          <div
            key={b.id}
            onClick={() => onSelect(b.id)}
            style={{
              cursor: "pointer", borderRadius: 8,
              border: `2px solid ${b.id === selectedBorder ? theme.accent : theme.accent + "40"}`,
              background: b.id === selectedBorder ? theme.accent + "20" : "transparent",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 4,
              padding: "4px 4px 6px", transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (b.id !== selectedBorder) e.currentTarget.style.borderColor = theme.accent + "80"; }}
            onMouseLeave={e => { if (b.id !== selectedBorder) e.currentTarget.style.borderColor = theme.accent + "40"; }}
          >
            <canvas
              ref={el => canvasRefs.current[b.id] = el}
              width={72} height={54}
              style={{ borderRadius: 5, display: "block" }}
            />
            <span style={{ fontSize: 10, color: b.id === selectedBorder ? theme.accent : theme.mutedColor }}>
              {b.preview} {b.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
