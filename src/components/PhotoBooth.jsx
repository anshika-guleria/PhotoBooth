import { useCallback, useEffect, useRef, useState } from "react";
import { CAMERA_FILTERS } from '../constants/filters';
import { STICKERS_PER_THEME, STICKER_FALLBACK } from '../constants/stickers';
import { THEMES } from '../constants/themes';
import useCamera from '../hooks/useCamera';
import { applyFilterToPixels } from '../utils/filterUtils';
import { drawArtBorder } from '../utils/glitter';
import { getCachedImage } from '../utils/stickerCache';
import BorderPreview from './BorderPreview';

export default function PhotoBooth() {

  const [selectedTheme,  setSelectedTheme]  = useState("forest");
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [selectedBorder, setSelectedBorder] = useState("none");
  const [placedStickers, setPlacedStickers] = useState([]);
  const [photoStrip,     setPhotoStrip]     = useState([null, null, null]);
  const [activeSlot,     setActiveSlot]     = useState(0);
  const [countdown,      setCountdown]      = useState(null);
  const [showFlash,      setShowFlash]      = useState(false);
  const [draggingUid,    setDraggingUid]    = useState(null);
  const [dragOffset,     setDragOffset]     = useState({ x: 0, y: 0 });
  const [isMobile,       setIsMobile]       = useState(false);

  const stickerLayer  = useRef(null);
  const countdownRef  = useRef(null);

  const { videoRef, canvasRef, cameraError } = useCamera(selectedFilter, selectedBorder);

  const theme = THEMES[selectedTheme];

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Cleanup countdown on unmount
  useEffect(() => () => clearInterval(countdownRef.current), []);

  // ── Capture photo ──────────────────────────────────────────────────────────
  const capturePhoto = useCallback(() => {
    const photoCanvas = document.createElement("canvas");
    photoCanvas.width = 480; photoCanvas.height = 360;
    const ctx = photoCanvas.getContext("2d");
    ctx.save(); ctx.translate(480, 0); ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, 480, 360); ctx.restore();
    if (selectedFilter !== "none") {
      const filterFn = CAMERA_FILTERS.find(f => f.id === selectedFilter)?.fn;
      const imageData = ctx.getImageData(0, 0, 480, 360);
      applyFilterToPixels(imageData, filterFn);
      ctx.putImageData(imageData, 0, 0);
    }
    placedStickers.forEach(sticker => {
      const img = getCachedImage(sticker.key);
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, sticker.x - sticker.size/2, sticker.y - sticker.size/2, sticker.size, sticker.size);
      }
    });
    drawArtBorder(ctx, 480, 360, selectedBorder);
    return photoCanvas.toDataURL("image/png");
  }, [selectedFilter, placedStickers, selectedBorder, videoRef]);

  // ── Snap ───────────────────────────────────────────────────────────────────
  const handleSnap = useCallback(() => {
    if (countdown !== null || activeSlot >= 3) return;
    let count = 3;
    setCountdown(count);
    countdownRef.current = setInterval(() => {
      count -= 1;
      if (count === 0) {
        clearInterval(countdownRef.current);
        setCountdown(null);
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 350);
        const photoUrl = capturePhoto();
        setPhotoStrip(prev => { const u = [...prev]; u[activeSlot] = photoUrl; return u; });
        setActiveSlot(prev => Math.min(prev + 1, 3));
      } else { setCountdown(count); }
    }, 1000);
  }, [countdown, activeSlot, capturePhoto]);

  // ── Redo slot ──────────────────────────────────────────────────────────────
  const handleRedo = (i) => {
    setPhotoStrip(prev => { const u = [...prev]; u[i] = null; return u; });
    setActiveSlot(i);
  };

  // ── Download strip ─────────────────────────────────────────────────────────
  const handleDownload = async () => {
    const PW=480, PH=360, PAD=16, GAP=10, HH=60, FH=40;
    const sw = PW + PAD*2;
    const sh = HH + PAD + (PH+GAP)*3 - GAP + FH + PAD;
    const sc = document.createElement("canvas");
    sc.width=sw; sc.height=sh;
    const ctx = sc.getContext("2d");
    ctx.fillStyle=theme.background; ctx.fillRect(0,0,sw,sh);
    ctx.fillStyle=theme.accent; ctx.font=`bold 18px ${theme.font}`;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.shadowColor=theme.glow; ctx.shadowBlur=14;
    ctx.fillText(`${theme.emoji} ${theme.name} Photo Booth`, sw/2, HH/2+PAD/2);
    ctx.shadowBlur=0;
    for (let i=0; i<3; i++) {
      const slotY = HH+PAD+i*(PH+GAP);
      if (photoStrip[i]) {
        await new Promise(resolve => {
          const img = new Image();
          img.onload=()=>{ ctx.drawImage(img,PAD,slotY,PW,PH); resolve(); };
          img.src=photoStrip[i];
        });
      } else {
        ctx.fillStyle=theme.accentDim; ctx.fillRect(PAD,slotY,PW,PH);
        ctx.fillStyle=theme.mutedColor; ctx.font="16px sans-serif";
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("— empty —", sw/2, slotY+PH/2);
      }
    }
    ctx.fillStyle=theme.mutedColor; ctx.font=`12px ${theme.font}`;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(new Date().toLocaleDateString(), sw/2, sh-FH/2);
    const link=document.createElement("a");
    link.href=sc.toDataURL("image/png");
    link.download=`photobooth-${selectedTheme}-${Date.now()}.png`;
    link.click();
  };

  // ── Stickers ───────────────────────────────────────────────────────────────
  const handleAddSticker = (key) => {
    setPlacedStickers(prev => [...prev, {
      uid: Date.now()+Math.random(), key,
      x: 80+Math.random()*310, y: 50+Math.random()*250, size: 60,
    }]);
  };

  const handleStickerDragStart = (event, uid) => {
    event.preventDefault();
    const layerRect = stickerLayer.current.getBoundingClientRect();
    const sticker = placedStickers.find(s => s.uid === uid);
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    setDraggingUid(uid);
    setDragOffset({ x: clientX-layerRect.left-sticker.x, y: clientY-layerRect.top-sticker.y });
  };

  const handleDragMove = useCallback((event) => {
    if (!draggingUid || !stickerLayer.current) return;
    const layerRect = stickerLayer.current.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    const newX = Math.max(0, Math.min(460, clientX-layerRect.left-dragOffset.x));
    const newY = Math.max(0, Math.min(330, clientY-layerRect.top-dragOffset.y));
    setPlacedStickers(prev => prev.map(s => s.uid===draggingUid ? {...s,x:newX,y:newY} : s));
  }, [draggingUid, dragOffset]);

  const handleDragEnd = () => setDraggingUid(null);

  // ── Derived values ─────────────────────────────────────────────────────────
  const filledPhotoCount = photoStrip.filter(Boolean).length;
  const canSnap = activeSlot < 3 && countdown === null;
  const currentStickerKeys = STICKERS_PER_THEME[selectedTheme];

  const sz = isMobile ? {
    titleFont:22, themeFont:12, themePad:"6px 12px", labelFont:12, chipFont:13,
    chipPad:"6px 14px", snapFont:17, snapPad:"14px 28px", btnFont:13, btnPad:"11px 18px",
    stripW:"100%", slotFont:20, redoFont:11, dlFont:15, dlPad:"13px 0",
    panelPad:"14px", gap:12, mainPad:"14px 12px",
    stickerCols:"repeat(auto-fill, minmax(56px, 1fr))", tipFont:12,
  } : {
    titleFont:34, themeFont:14, themePad:"8px 18px", labelFont:13, chipFont:14,
    chipPad:"8px 16px", snapFont:19, snapPad:"17px 40px", btnFont:15, btnPad:"14px 24px",
    stripW:230, slotFont:24, redoFont:13, dlFont:16, dlPad:"15px 0",
    panelPad:"20px", gap:18, mainPad:"20px 20px",
    stickerCols:"repeat(auto-fill, minmax(72px, 1fr))", tipFont:13,
  };

  return (
    <div
      style={{
        minHeight:"100vh", background:theme.backgroundGradient,
        fontFamily:theme.font, display:"flex", flexDirection:"column",
        alignItems:"center", overflowX:"hidden",
      }}
      onMouseMove={handleDragMove} onMouseUp={handleDragEnd}
      onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}
    >
      {/* HEADER */}
      <div style={{ width:"100%", padding:isMobile?"16px 12px":"24px 32px", textAlign:"center", borderBottom:`1px solid ${theme.accent}30` }}>
        <h1 style={{ fontSize:sz.titleFont, color:theme.textColor, fontWeight:"bold", textShadow:`0 0 30px ${theme.glow}`, margin:0, letterSpacing:2 }}>
          ✦ Photo Booth ✦
        </h1>
      </div>

      {/* THEME BAR */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", padding:isMobile?"10px":"14px 24px", borderBottom:`1px solid ${theme.accent}20`, width:"100%", boxSizing:"border-box" }}>
        {Object.entries(THEMES).map(([k,v]) => (
          <button key={k} onClick={() => { setSelectedTheme(k); setPlacedStickers([]); }} style={{
            padding:sz.themePad, borderRadius:999,
            border:`2px solid ${k===selectedTheme ? theme.accent : theme.accent+"30"}`,
            background:k===selectedTheme ? theme.accent+"25" : "transparent",
            color:k===selectedTheme ? theme.accent : theme.mutedColor,
            cursor:"pointer", fontSize:sz.themeFont, fontFamily:"inherit",
            fontWeight:k===selectedTheme?"bold":"normal", whiteSpace:"nowrap", transition:"all 0.15s",
          }}>{v.emoji} {v.name}</button>
        ))}
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display:"flex", flexDirection:isMobile?"column":"row", gap:sz.gap, padding:sz.mainPad, width:"100%", maxWidth:1280, alignItems:"flex-start", justifyContent:"center", boxSizing:"border-box" }}>

        {/* LEFT: Camera + controls */}
        <div style={{ display:"flex", flexDirection:"column", gap:sz.gap, flex:isMobile?"none":"1 1 0", minWidth:0, width:isMobile?"100%":undefined, maxWidth:isMobile?"100%":640 }}>

          {/* Camera viewport */}
          <div style={{ position:"relative", width:"100%", aspectRatio:"4/3", borderRadius:16, overflow:"hidden", border:`3px solid ${theme.accent}`, boxShadow:`0 0 44px ${theme.glow}55, 0 8px 32px rgba(0,0,0,0.45)`, background:"#000" }}>
            <video ref={videoRef} autoPlay muted playsInline style={{ position:"absolute", opacity:0, top:0, left:0, width:1, height:1 }} />
            {cameraError ? (
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:theme.mutedColor, gap:14 }}>
                <span style={{ fontSize:56 }}>📷</span>
                <span style={{ fontSize:17, textAlign:"center", padding:"0 28px" }}>Camera unavailable — please allow permission</span>
              </div>
            ) : (
              <canvas ref={canvasRef} width={480} height={360} style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%" }} />
            )}

            {/* Sticker layer */}
            <div ref={stickerLayer} style={{ position:"absolute", inset:0 }}>
              {placedStickers.map(sticker => {
                const img = getCachedImage(sticker.key);
                return (
                  <div key={sticker.uid} style={{ position:"absolute", left:`${(sticker.x/480)*100}%`, top:`${(sticker.y/360)*100}%`, width:`${(sticker.size/480)*100}%`, aspectRatio:"1", cursor:"grab", zIndex:5, transform:"translate(-50%,-50%)", filter:"drop-shadow(0 3px 8px rgba(0,0,0,0.6))" }}
                    onMouseDown={e => handleStickerDragStart(e,sticker.uid)}
                    onTouchStart={e => handleStickerDragStart(e,sticker.uid)}
                    onDoubleClick={() => setPlacedStickers(prev => prev.filter(s => s.uid!==sticker.uid))}
                    title="Drag · Double-click to remove"
                  >
                    <img src={img.src} alt={sticker.key} style={{ width:"100%", height:"100%", pointerEvents:"none" }} />
                  </div>
                );
              })}
            </div>

            {/* Flash overlay */}
            <div style={{ position:"absolute", inset:0, background:"white", opacity:showFlash?1:0, transition:showFlash?"none":"opacity 0.35s", pointerEvents:"none", zIndex:8 }} />

            {/* Countdown */}
            {countdown !== null && (
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", zIndex:9 }}>
                <span style={{ fontSize:"min(24vw,130px)", fontWeight:"bold", color:theme.accent, textShadow:`0 0 60px ${theme.glow}`, lineHeight:1 }}>{countdown}</span>
              </div>
            )}
          </div>

          {/* Filters */}
          <div>
            <div style={{ fontSize:sz.labelFont, fontWeight:"bold", color:theme.accent, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>Filters</div>
            <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
              {CAMERA_FILTERS.map(f => (
                <button key={f.id} onClick={() => setSelectedFilter(f.id)} style={{
                  padding:sz.chipPad, borderRadius:999,
                  border:`2px solid ${f.id===selectedFilter ? theme.accent : theme.accent+"35"}`,
                  background:f.id===selectedFilter ? theme.accent+"25" : "transparent",
                  color:f.id===selectedFilter ? theme.accent : theme.mutedColor,
                  fontSize:sz.chipFont, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
                }}>{f.name}</button>
              ))}
            </div>
          </div>

          {/* Border picker */}
          <BorderPreview selectedBorder={selectedBorder} onSelect={setSelectedBorder} theme={theme} />

          {/* Action buttons */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
            <button onClick={handleSnap} disabled={!canSnap} style={{
              padding:sz.snapPad, borderRadius:999, border:"none",
              background:canSnap ? theme.accent : theme.mutedColor,
              color:"#000", fontWeight:"bold", fontSize:sz.snapFont,
              cursor:canSnap?"pointer":"default", fontFamily:"inherit",
              boxShadow:canSnap?`0 0 26px ${theme.glow}bb`:"none",
              opacity:canSnap?1:0.45, flex:isMobile?"1":undefined, transition:"all 0.2s",
            }}>
              {countdown!==null ? `⏱ ${countdown}` : activeSlot>=3 ? "Strip Full!" : `📸 Snap  (${3-activeSlot} left)`}
            </button>
            <button onClick={() => setPlacedStickers([])} style={{ padding:sz.btnPad, borderRadius:999, border:`2px solid ${theme.accent}`, background:"transparent", color:theme.accent, fontSize:sz.btnFont, cursor:"pointer", fontFamily:"inherit" }}>
              Clear Stickers
            </button>
            <button onClick={() => { setPhotoStrip([null,null,null]); setActiveSlot(0); }} style={{ padding:sz.btnPad, borderRadius:999, border:`2px solid ${theme.accent}`, background:"transparent", color:theme.accent, fontSize:sz.btnFont, cursor:"pointer", fontFamily:"inherit" }}>
              Reset
            </button>
          </div>
        </div>

        {/* MIDDLE: Strip */}
        <div style={{ display:"flex", flexDirection:"column", gap:10, background:theme.panelBackground, borderRadius:18, border:`2px solid ${theme.accent}`, padding:sz.panelPad, flex:"0 0 auto", width:isMobile?"100%":sz.stripW, alignItems:"center", boxSizing:"border-box", boxShadow:`0 0 32px ${theme.glow}28` }}>
          <div style={{ fontSize:sz.labelFont+2, fontWeight:"bold", color:theme.accent, letterSpacing:"0.1em", textTransform:"uppercase", textAlign:"center" }}>{theme.emoji} Strip</div>
          <div style={{ display:"flex", flexDirection:isMobile?"row":"column", gap:8, width:"100%" }}>
            {[0,1,2].map(i => {
              const filled=!!photoStrip[i], active=i===activeSlot&&!filled;
              return (
                <div key={i} style={{ position:"relative", flex:isMobile?"1":undefined, width:isMobile?undefined:"100%", aspectRatio:"4/3", borderRadius:10, border:`2px ${filled?"solid":"dashed"} ${active?theme.accent:filled?theme.accent+"80":theme.accent+"30"}`, background:filled?"#000":theme.accentDim+"22", overflow:"hidden", boxShadow:active?`0 0 18px ${theme.glow}70`:"none" }}>
                  {filled ? (
                    <>
                      <img src={photoStrip[i]} alt={`Photo ${i+1}`} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                      <button onClick={() => handleRedo(i)} style={{ position:"absolute", top:5, right:5, background:"rgba(0,0,0,0.82)", border:"none", color:theme.accent, borderRadius:999, fontSize:sz.redoFont, cursor:"pointer", padding:"4px 10px", fontFamily:"inherit", zIndex:3, fontWeight:"bold" }}>↺ Redo</button>
                    </>
                  ) : (
                    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:theme.mutedColor, fontSize:sz.slotFont, fontWeight:"bold" }}>{i+1}</div>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={handleDownload} disabled={filledPhotoCount===0} style={{ width:"100%", padding:sz.dlPad, borderRadius:999, border:"none", background:theme.accent, color:"#000", fontWeight:"bold", fontSize:sz.dlFont, cursor:filledPhotoCount===0?"default":"pointer", fontFamily:"inherit", boxShadow:`0 0 20px ${theme.glow}66`, opacity:filledPhotoCount===0?0.4:1 }}>
            ⬇ Download Strip
          </button>
          <div style={{ fontSize:sz.labelFont, color:theme.mutedColor, textAlign:"center" }}>{filledPhotoCount} / 3 photos</div>
        </div>

        {/* RIGHT: Stickers */}
        <div style={{ display:"flex", flexDirection:"column", gap:10, background:theme.panelBackground, borderRadius:18, border:`2px solid ${theme.accent}30`, padding:sz.panelPad, flex:"0 0 auto", width:isMobile?"100%":270, boxSizing:"border-box", overflow:"hidden", minWidth:0 }}>
          <div style={{ fontSize:sz.labelFont+2, fontWeight:"bold", color:theme.accent, letterSpacing:"0.1em", textTransform:"uppercase" }}>Stickers</div>
          <div style={{ display:"grid", gridTemplateColumns:sz.stickerCols, gap:8, width:"100%", minWidth:0 }}>
            {currentStickerKeys.map(key => {
              const img = getCachedImage(key);
              return (
                <button key={key} onClick={() => handleAddSticker(key)} title={`Add ${key}`} style={{ minWidth:0, width:"100%", aspectRatio:"1", borderRadius:12, border:`2px solid ${theme.accent}30`, background:theme.accentDim+"28", cursor:"pointer", padding:7, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", transition:"transform 0.12s, border-color 0.12s", boxSizing:"border-box", fontSize:28 }}
                  onMouseEnter={e => { e.currentTarget.style.transform="scale(1.1)"; e.currentTarget.style.borderColor=theme.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.transform="scale(1)";   e.currentTarget.style.borderColor=theme.accent+"30"; }}
                >
                  {img.complete&&img.naturalWidth>0&&!img.dataset.failed
                    ? <img src={img.src} alt={key} style={{ width:"100%",height:"100%",objectFit:"contain",pointerEvents:"none",display:"block" }} />
                    : STICKER_FALLBACK[key]||"?"
                  }
                </button>
              );
            })}
          </div>
          <div style={{ fontSize:sz.tipFont, color:theme.mutedColor, lineHeight:1.6 }}>Tap to place · Drag to move · Double-tap removes</div>
        </div>
<div style={{ width:"100%", padding:"10px", borderTop:`1px solid ${theme.accent}15`, textAlign:"center", fontSize:11, color:theme.mutedColor }}>
  Icons & stickers by <a href="https://www.flaticon.com" target="_blank" rel="noreferrer" style={{ color:theme.accent }}>Flaticon</a> · Built with React & Canvas API
</div>
      </div>
    </div>
  );
}
