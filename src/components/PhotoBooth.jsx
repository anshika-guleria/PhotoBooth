import { useCallback, useEffect, useRef, useState } from "react";
import { CAMERA_FILTERS } from '../constants/filters';
import { STICKERS_PER_THEME } from '../constants/stickers';
import { THEMES } from '../constants/themes';
import useCamera from '../hooks/useCamera';
import { applyFilterToPixels } from '../utils/filterUtils';
import { drawArtBorder } from '../utils/glitter';
import { getCachedImage, preloadAllStickers } from '../utils/stickerCache';
import BorderPreview from './BorderPreview';

export default function PhotoBooth() {

  const [selectedTheme,  setSelectedTheme]  = useState("sakura");
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [selectedBorder, setSelectedBorder] = useState("none");
  const [placedStickers, setPlacedStickers] = useState([]);
  const [photoStrip,     setPhotoStrip]     = useState([null, null, null]);
  const [activeSlot,     setActiveSlot]     = useState(0);
  const [countdown,      setCountdown]      = useState(null);
  const [showFlash,      setShowFlash]      = useState(false);
  const [draggingUid,    setDraggingUid]    = useState(null);
  const [dragOffset,     setDragOffset]     = useState({ x: 0, y: 0 });
  const [selectedUid,    setSelectedUid]    = useState(null);
  const [isMobile,       setIsMobile]       = useState(false);
  const [mobileTab,      setMobileTab]      = useState("camera"); // camera | stickers | strip

  const [isLandscape, setIsLandscape] = useState(false);

  const stickerLayer = useRef(null);
  const countdownRef = useRef(null);

  const { videoRef, canvasRef, cameraError } = useCamera(selectedFilter, selectedBorder);
  const theme = THEMES[selectedTheme];

  // Mobile font is always a clean readable sans-serif regardless of theme
  const displayFont = isMobile ? "'Nunito', 'Segoe UI', sans-serif" : theme.font;

  useEffect(() => { preloadAllStickers(); }, []);

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsMobile(w < 760);
      setIsLandscape(w > h);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", () => setTimeout(check, 100));
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  useEffect(() => () => clearInterval(countdownRef.current), []);

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest("[data-sticker]")) setSelectedUid(null);
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, []);

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
        ctx.save();
        ctx.translate(sticker.x, sticker.y);
        ctx.rotate((sticker.rotation || 0) * Math.PI / 180);
        ctx.scale(sticker.flipX ? -1 : 1, sticker.flipY ? -1 : 1);
        ctx.drawImage(img, -sticker.size/2, -sticker.size/2, sticker.size, sticker.size);
        ctx.restore();
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

  const handleRedo = (i) => {
    setPhotoStrip(prev => { const u = [...prev]; u[i] = null; return u; });
    setActiveSlot(i);
  };

  // ── Download ───────────────────────────────────────────────────────────────
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

  // ── Sticker actions ────────────────────────────────────────────────────────
  const handleAddSticker = (key) => {
    const uid = Date.now()+Math.random();
    setPlacedStickers(prev => [...prev, {
      uid, key,
      x: 120+Math.random()*240,
      y: 80+Math.random()*200,
      size: 64, rotation: 0, flipX: false, flipY: false,
    }]);
    setSelectedUid(uid);
    if (isMobile) setMobileTab("camera");
  };

  const updateSticker = (uid, changes) =>
    setPlacedStickers(prev => prev.map(s => s.uid === uid ? { ...s, ...changes } : s));

  const handleStickerDragStart = (event, uid) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedUid(uid);
    const layerRect = stickerLayer.current.getBoundingClientRect();
    const sticker = placedStickers.find(s => s.uid === uid);
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    // Scale screen coords to canvas coords (480×360)
    const scaleX = 480 / layerRect.width;
    const scaleY = 360 / layerRect.height;
    setDraggingUid(uid);
    setDragOffset({
      x: (clientX - layerRect.left) * scaleX - sticker.x,
      y: (clientY - layerRect.top)  * scaleY - sticker.y,
    });
  };

  const handleDragMove = useCallback((event) => {
    if (!draggingUid || !stickerLayer.current) return;
    // Prevent page scroll while dragging sticker on mobile
    if (event.cancelable) event.preventDefault();
    const layerRect = stickerLayer.current.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    // Scale screen coords to canvas coords
    const scaleX = 480 / layerRect.width;
    const scaleY = 360 / layerRect.height;
    const newX = Math.max(0, Math.min(480, (clientX - layerRect.left) * scaleX - dragOffset.x));
    const newY = Math.max(0, Math.min(360, (clientY - layerRect.top)  * scaleY - dragOffset.y));
    updateSticker(draggingUid, { x: newX, y: newY });
  }, [draggingUid, dragOffset]);

  const handleDragEnd = () => setDraggingUid(null);

  const filledPhotoCount = photoStrip.filter(Boolean).length;
  const canSnap = activeSlot < 3 && countdown === null;
  const currentStickerKeys = STICKERS_PER_THEME[selectedTheme];
  const selectedSticker = placedStickers.find(s => s.uid === selectedUid);

  // ── Size tokens ────────────────────────────────────────────────────────────
  const sz = isMobile && isLandscape ? {
    // Mobile landscape — more compact, side by side where possible
    titleFont:16, themeFont:11, themePad:"4px 10px",
    labelFont:11, chipFont:12, chipPad:"5px 10px",
    snapFont:14, snapPad:"10px 0", btnFont:12, btnPad:"9px 12px",
    stripW:"100%", slotFont:16, redoFont:10, dlFont:13, dlPad:"10px 0",
    panelPad:"10px", gap:8, mainPad:"8px 10px",
    stickerCols:"repeat(auto-fill, minmax(52px, 1fr))", tipFont:10,
  } : isMobile ? {
    // Mobile portrait
    titleFont:20, themeFont:13, themePad:"6px 14px",
    labelFont:13, chipFont:14, chipPad:"8px 14px",
    snapFont:16, snapPad:"14px 0", btnFont:14, btnPad:"12px 16px",
    stripW:"100%", slotFont:20, redoFont:12, dlFont:15, dlPad:"13px 0",
    panelPad:"14px", gap:12, mainPad:"10px 12px",
    stickerCols:"repeat(auto-fill, minmax(58px, 1fr))", tipFont:12,
  } : {
    // Desktop
    titleFont:34, themeFont:14, themePad:"8px 18px",
    labelFont:13, chipFont:14, chipPad:"8px 16px",
    snapFont:19, snapPad:"17px 40px", btnFont:15, btnPad:"14px 24px",
    stripW:230, slotFont:24, redoFont:13, dlFont:16, dlPad:"15px 0",
    panelPad:"20px", gap:18, mainPad:"20px 20px",
    stickerCols:"repeat(auto-fill, minmax(58px, 1fr))", tipFont:12,
  };

  // ── Sticker controls panel (shared between mobile/desktop) ─────────────────
  const StickerControls = () => selectedSticker ? (
    <div data-sticker="true" style={{
      display:"flex", flexDirection:"column", gap:10,
      background: theme.panelBackground,
      border:`1.5px solid ${theme.accent}50`,
      borderRadius:14, padding:"14px 16px",
      fontFamily: displayFont,
    }}>
      <div style={{ fontSize:13, fontWeight:"bold", color:theme.accent, textTransform:"uppercase", letterSpacing:"0.06em" }}>
        ✦ Sticker Controls
      </div>

      {/* Size */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:13, color:theme.mutedColor, minWidth:50 }}>Size</span>
        <input type="range" min={24} max={200} value={selectedSticker.size}
          onChange={e => updateSticker(selectedUid, { size: Number(e.target.value) })}
          style={{ flex:1, accentColor: theme.accent, height:6 }}
        />
        <span style={{ fontSize:13, color:theme.mutedColor, minWidth:36, textAlign:"right" }}>{selectedSticker.size}px</span>
      </div>

      {/* Rotate */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:13, color:theme.mutedColor, minWidth:50 }}>Rotate</span>
        <input type="range" min={-180} max={180} value={selectedSticker.rotation||0}
          onChange={e => updateSticker(selectedUid, { rotation: Number(e.target.value) })}
          style={{ flex:1, accentColor: theme.accent, height:6 }}
        />
        <span style={{ fontSize:13, color:theme.mutedColor, minWidth:36, textAlign:"right" }}>{selectedSticker.rotation||0}°</span>
      </div>

      {/* Quick buttons row */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {[[-15,"↺ 15°"],[+15,"↻ 15°"],[-45,"↺ 45°"],[+45,"↻ 45°"]].map(([delta, label]) => (
          <button key={label}
            onClick={() => updateSticker(selectedUid, { rotation: ((selectedSticker.rotation||0) + delta + 360) % 360 })}
            style={{ padding:"6px 12px", borderRadius:999, fontSize:13, border:`1.5px solid ${theme.accent}50`, background:"transparent", color:theme.accent, cursor:"pointer", fontFamily:displayFont }}
          >{label}</button>
        ))}
        <button
          onClick={() => updateSticker(selectedUid, { rotation:0, size:64, flipX:false, flipY:false })}
          style={{ padding:"6px 12px", borderRadius:999, fontSize:13, border:`1.5px solid ${theme.accent}50`, background:"transparent", color:theme.accent, cursor:"pointer", fontFamily:displayFont }}
        >Reset</button>
      </div>

      {/* Flip + Remove row */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
        <button onClick={() => updateSticker(selectedUid, { flipX: !selectedSticker.flipX })}
          style={{ padding:"6px 14px", borderRadius:999, fontSize:13, border:`1.5px solid ${selectedSticker.flipX ? theme.accent : theme.accent+"50"}`, background: selectedSticker.flipX ? theme.accent+"25" : "transparent", color:theme.accent, cursor:"pointer", fontFamily:displayFont }}
        >⇔ Flip H</button>
        <button onClick={() => updateSticker(selectedUid, { flipY: !selectedSticker.flipY })}
          style={{ padding:"6px 14px", borderRadius:999, fontSize:13, border:`1.5px solid ${selectedSticker.flipY ? theme.accent : theme.accent+"50"}`, background: selectedSticker.flipY ? theme.accent+"25" : "transparent", color:theme.accent, cursor:"pointer", fontFamily:displayFont }}
        >⇕ Flip V</button>
        <button onClick={() => { setPlacedStickers(prev => prev.filter(s => s.uid !== selectedUid)); setSelectedUid(null); }}
          style={{ padding:"6px 14px", borderRadius:999, fontSize:13, border:"1.5px solid #ef4444", background:"transparent", color:"#ef4444", cursor:"pointer", fontFamily:displayFont, marginLeft:"auto" }}
        >🗑 Remove</button>
      </div>
    </div>
  ) : null;

  // ── Camera panel ───────────────────────────────────────────────────────────
  const CameraPanel = () => (
    <div style={{ display:"flex", flexDirection:"column", gap:sz.gap }}>

      {/* Camera viewport */}
      <div style={{ position:"relative", width:"100%", aspectRatio:"4/3", borderRadius:16, overflow:"hidden", border:`3px solid ${theme.accent}`, boxShadow:`0 0 44px ${theme.glow}55, 0 8px 32px rgba(0,0,0,0.4)`, background:"#000" }}>
        <video ref={videoRef} autoPlay muted playsInline style={{ position:"absolute", opacity:0, top:0, left:0, width:1, height:1 }} />
        {cameraError ? (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:theme.mutedColor, gap:14 }}>
            <span style={{ fontSize:52 }}>📷</span>
            <span style={{ fontSize:16, textAlign:"center", padding:"0 24px", fontFamily:displayFont }}>Camera unavailable — please allow permission</span>
          </div>
        ) : (
          <canvas ref={canvasRef} width={480} height={360} style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%" }} />
        )}

        {/* Sticker layer */}
        <div ref={stickerLayer} style={{ position:"absolute", inset:0 }}>
          {placedStickers.map(sticker => {
            const img = getCachedImage(sticker.key);
            const isSelected = sticker.uid === selectedUid;
            return (
              <div key={sticker.uid} data-sticker="true"
                style={{
                  position:"absolute",
                  left:`${(sticker.x/480)*100}%`,
                  top:`${(sticker.y/360)*100}%`,
                  width:`${(sticker.size/480)*100}%`,
                  aspectRatio:"1",
                  transform:`translate(-50%,-50%) rotate(${sticker.rotation||0}deg) scaleX(${sticker.flipX?-1:1}) scaleY(${sticker.flipY?-1:1})`,
                  cursor:"grab", zIndex:isSelected?10:5,
                  filter:"drop-shadow(0 3px 8px rgba(0,0,0,0.5))",
                  outline:isSelected?`2px dashed ${theme.accent}`:"none",
                  outlineOffset:"3px", borderRadius:4,
                }}
                onMouseDown={e => handleStickerDragStart(e, sticker.uid)}
                onTouchStart={e => handleStickerDragStart(e, sticker.uid)}
                onDoubleClick={() => { setPlacedStickers(prev => prev.filter(s => s.uid !== sticker.uid)); setSelectedUid(null); }}
                title="Drag · Double-click to remove"
              >
                <img src={img.src} alt={sticker.key} style={{ width:"100%", height:"100%", pointerEvents:"none", display:"block" }} />
              </div>
            );
          })}
        </div>

        <div style={{ position:"absolute", inset:0, background:"white", opacity:showFlash?1:0, transition:showFlash?"none":"opacity 0.35s", pointerEvents:"none", zIndex:8 }} />
        {countdown !== null && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", zIndex:9 }}>
            <span style={{ fontSize:"min(24vw,130px)", fontWeight:"bold", color:theme.accent, textShadow:`0 0 60px ${theme.glow}`, lineHeight:1 }}>{countdown}</span>
          </div>
        )}
      </div>

      {/* Sticker controls */}
      <StickerControls />

      {/* Filters */}
      <div>
        <div style={{ fontSize:sz.labelFont, fontWeight:"bold", color:theme.accent, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8, fontFamily:displayFont }}>Filters</div>
        <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
          {CAMERA_FILTERS.map(f => (
            <button key={f.id} onClick={() => setSelectedFilter(f.id)} style={{
              padding:sz.chipPad, borderRadius:999,
              border:`2px solid ${f.id===selectedFilter ? theme.accent : theme.accent+"35"}`,
              background:f.id===selectedFilter ? theme.accent+"25" : "transparent",
              color:f.id===selectedFilter ? theme.accent : theme.mutedColor,
              fontSize:sz.chipFont, cursor:"pointer", fontFamily:displayFont, transition:"all 0.15s",
            }}>{f.name}</button>
          ))}
        </div>
      </div>

      {/* Border */}
      <BorderPreview selectedBorder={selectedBorder} onSelect={setSelectedBorder} theme={theme} />

      {/* Action buttons */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        <button onClick={handleSnap} disabled={!canSnap} style={{
          padding:sz.snapPad, borderRadius:999, border:"none", flex:1,
          background:canSnap ? theme.accent : theme.mutedColor,
          color:"#000", fontWeight:"bold", fontSize:sz.snapFont,
          cursor:canSnap?"pointer":"default", fontFamily:displayFont,
          boxShadow:canSnap?`0 0 26px ${theme.glow}bb`:"none",
          opacity:canSnap?1:0.45, transition:"all 0.2s",
        }}>
          {countdown!==null ? `⏱ ${countdown}` : activeSlot>=3 ? "Strip Full!" : `📸 Snap (${3-activeSlot} left)`}
        </button>
        <button onClick={() => { setPlacedStickers([]); setSelectedUid(null); }}
          style={{ padding:sz.btnPad, borderRadius:999, border:`2px solid ${theme.accent}`, background:"transparent", color:theme.accent, fontSize:sz.btnFont, cursor:"pointer", fontFamily:displayFont }}>
          Clear
        </button>
        <button onClick={() => { setPhotoStrip([null,null,null]); setActiveSlot(0); }}
          style={{ padding:sz.btnPad, borderRadius:999, border:`2px solid ${theme.accent}`, background:"transparent", color:theme.accent, fontSize:sz.btnFont, cursor:"pointer", fontFamily:displayFont }}>
          Reset
        </button>
      </div>
    </div>
  );

  // ── Strip panel ────────────────────────────────────────────────────────────
  const StripPanel = () => (
    <div style={{ display:"flex", flexDirection:"column", gap:10, background:theme.panelBackground, borderRadius:18, border:`2px solid ${theme.accent}`, padding:sz.panelPad, alignItems:"center", boxSizing:"border-box", boxShadow:`0 0 32px ${theme.glow}28` }}>
      <div style={{ fontSize:16, fontWeight:"bold", color:theme.accent, letterSpacing:"0.08em", textTransform:"uppercase", textAlign:"center", fontFamily:displayFont }}>{theme.emoji} Strip</div>
      <div style={{ display:"flex", flexDirection:isMobile?"row":"column", gap:8, width:"100%" }}>
        {[0,1,2].map(i => {
          const filled=!!photoStrip[i], active=i===activeSlot&&!filled;
          return (
            <div key={i} style={{ position:"relative", flex:isMobile?"1":undefined, width:isMobile?undefined:"100%", aspectRatio:"4/3", borderRadius:10, border:`2px ${filled?"solid":"dashed"} ${active?theme.accent:filled?theme.accent+"80":theme.accent+"30"}`, background:filled?"#000":theme.accentDim+"22", overflow:"hidden", boxShadow:active?`0 0 18px ${theme.glow}70`:"none" }}>
              {filled ? (
                <>
                  <img src={photoStrip[i]} alt={`Photo ${i+1}`} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                  <button onClick={() => handleRedo(i)} style={{ position:"absolute", top:5, right:5, background:"rgba(0,0,0,0.82)", border:"none", color:theme.accent, borderRadius:999, fontSize:sz.redoFont, cursor:"pointer", padding:"4px 10px", fontFamily:displayFont, zIndex:3, fontWeight:"bold" }}>↺ Redo</button>
                </>
              ) : (
                <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:theme.mutedColor, fontSize:sz.slotFont, fontWeight:"bold" }}>{i+1}</div>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={handleDownload} disabled={filledPhotoCount===0}
        style={{ width:"100%", padding:sz.dlPad, borderRadius:999, border:"none", background:theme.accent, color:"#000", fontWeight:"bold", fontSize:sz.dlFont, cursor:filledPhotoCount===0?"default":"pointer", fontFamily:displayFont, boxShadow:`0 0 20px ${theme.glow}66`, opacity:filledPhotoCount===0?0.4:1 }}>
        ⬇ Download Strip
      </button>
      <div style={{ fontSize:14, color:theme.mutedColor, textAlign:"center", fontFamily:displayFont }}>{filledPhotoCount} / 3 photos</div>
    </div>
  );

  // ── Sticker picker panel ───────────────────────────────────────────────────
  const StickerPanel = () => (
    <div style={{ display:"flex", flexDirection:"column", gap:10, background:theme.panelBackground, borderRadius:18, border:`2px solid ${theme.accent}30`, padding:sz.panelPad, boxSizing:"border-box", overflow:"hidden", minWidth:0 }}>
      <div style={{ fontSize:16, fontWeight:"bold", color:theme.accent, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:displayFont }}>Stickers</div>
      <div style={{ display:"grid", gridTemplateColumns:sz.stickerCols, gap:6, width:"100%", minWidth:0 }}>
        {currentStickerKeys.map(key => {
          const img = getCachedImage(key);
          return (
            <button key={key} onClick={() => handleAddSticker(key)} title={`Add ${key}`}
              style={{ minWidth:0, width:"100%", aspectRatio:"1", borderRadius:10, border:`2px solid ${theme.accent}30`, background:theme.accentDim+"28", cursor:"pointer", padding:5, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", transition:"transform 0.12s, border-color 0.12s", boxSizing:"border-box", fontSize:22 }}
              onMouseEnter={e => { e.currentTarget.style.transform="scale(1.1)"; e.currentTarget.style.borderColor=theme.accent; }}
              onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.borderColor=theme.accent+"30"; }}
            >
              {img.complete && img.naturalWidth > 0 && !img.dataset.failed
                ? <img src={img.src} alt={key} style={{ width:"70%", height:"70%", objectFit:"contain", pointerEvents:"none", display:"block", margin:"auto" }} />
                : "⏳"
              }
            </button>
          );
        })}
      </div>
      <div style={{ fontSize:sz.tipFont, color:theme.mutedColor, lineHeight:1.6, fontFamily:displayFont }}>
        Tap to place · Drag to move · Double-tap removes · Tap sticker to resize/rotate
      </div>
    </div>
  );

  return (
    <div
      style={{
        minHeight:"100vh", background:theme.backgroundGradient,
        fontFamily:displayFont, display:"flex", flexDirection:"column",
        alignItems:"center", overflowX:"hidden",
      }}
      onMouseMove={handleDragMove} onMouseUp={handleDragEnd}
      onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}
    >

      {/* HEADER */}
      <div style={{ width:"100%", padding:isMobile?"14px 12px":"24px 32px", textAlign:"center", borderBottom:`1px solid ${theme.accent}30` }}>
        <h1 style={{ fontSize:sz.titleFont, color:theme.textColor, fontWeight:"bold", textShadow:`0 0 30px ${theme.glow}`, margin:0, letterSpacing:1, fontFamily:displayFont }}>
          ✦ Photo Booth ✦
        </h1>
      </div>

      {/* THEME BAR */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"center", padding:isMobile?"8px 10px":"14px 24px", borderBottom:`1px solid ${theme.accent}20`, width:"100%", boxSizing:"border-box" }}>
        {Object.entries(THEMES).map(([k,v]) => (
          <button key={k} onClick={() => { setSelectedTheme(k); setSelectedUid(null); }} style={{
            padding:sz.themePad, borderRadius:999,
            border:`2px solid ${k===selectedTheme ? theme.accent : theme.accent+"30"}`,
            background:k===selectedTheme ? theme.accent+"25" : "transparent",
            color:k===selectedTheme ? theme.accent : theme.mutedColor,
            cursor:"pointer", fontSize:sz.themeFont, fontFamily:displayFont,
            fontWeight:k===selectedTheme?"bold":"normal", whiteSpace:"nowrap", transition:"all 0.15s",
          }}>{v.emoji} {v.name}</button>
        ))}
      </div>

      {/* ── MOBILE LAYOUT ── */}
      {isMobile ? (
        <div style={{ width:"100%", display:"flex", flexDirection: isLandscape ? "row" : "column", flex:1, overflow:"hidden" }}>

          {/* Tab content area */}
          <div style={{ flex:1, overflowY:"auto", padding: isLandscape ? "8px 10px" : "12px 12px" }}>
            <div style={{ display: mobileTab === "camera"   ? "block" : "none" }}><CameraPanel /></div>
            <div style={{ display: mobileTab === "stickers" ? "block" : "none" }}><StickerPanel /></div>
            <div style={{ display: mobileTab === "strip"    ? "block" : "none" }}><StripPanel /></div>
          </div>

          {/* Tab bar — bottom in portrait, right side in landscape */}
          <div style={{
            display:"flex",
            flexDirection: isLandscape ? "column" : "row",
            borderTop:    isLandscape ? "none" : `1px solid ${theme.accent}30`,
            borderLeft:   isLandscape ? `1px solid ${theme.accent}30` : "none",
            background: theme.panelBackground,
            zIndex:20,
            position: isLandscape ? "sticky" : "sticky",
            bottom:0, right:0,
            minWidth: isLandscape ? 72 : undefined,
          }}>
            {[
              { id:"camera",   icon:"📷", label:"Camera" },
              { id:"stickers", icon:"🎨", label:"Stickers" },
              { id:"strip",    icon:"🖼️", label:`Strip\n${filledPhotoCount}/3` },
            ].map(tab => (
              <button key={tab.id} onClick={() => setMobileTab(tab.id)}
                style={{
                  flex: isLandscape ? "none" : 1,
                  padding: isLandscape ? "16px 8px" : "12px 4px 10px",
                  background: mobileTab===tab.id ? theme.accent+"18" : "transparent",
                  border:"none",
                  borderTop:  isLandscape ? `3px solid ${mobileTab===tab.id ? theme.accent : "transparent"}` : "none",
                  borderLeft: isLandscape ? "none" : "none",
                  borderBottom: !isLandscape ? "none" : "none",
                  borderRight: "none",
                  color: mobileTab===tab.id ? theme.accent : theme.mutedColor,
                  cursor:"pointer", fontFamily:displayFont,
                  display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                  transition:"all 0.15s",
                }}
              >
                <span style={{ fontSize: isLandscape ? 20 : 22 }}>{tab.icon}</span>
                <span style={{ fontSize:11, fontWeight: mobileTab===tab.id?"bold":"normal", textAlign:"center", whiteSpace:"pre-line" }}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

      ) : (
        // ── DESKTOP LAYOUT ──
        <>
          <div style={{ display:"flex", gap:sz.gap, padding:sz.mainPad, width:"100%", maxWidth:1280, alignItems:"flex-start", justifyContent:"center", boxSizing:"border-box" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:sz.gap, flex:"1 1 0", minWidth:0, maxWidth:640 }}>
              <CameraPanel />
            </div>
            <div style={{ flex:"0 0 auto", width:sz.stripW }}>
              <StripPanel />
            </div>
            <div style={{ flex:"0 0 auto", width:270 }}>
              <StickerPanel />
            </div>
          </div>

          {/* CREDITS */}
          <div style={{ width:"100%", padding:"14px 20px", borderTop:`1px solid ${theme.accent}15`, textAlign:"center", fontSize:12, color:theme.mutedColor, marginTop:"auto", boxSizing:"border-box", fontFamily:displayFont }}>
            Stickers by{" "}
            <a href="https://www.flaticon.com" target="_blank" rel="noreferrer" style={{ color:theme.accent, textDecoration:"none", fontWeight:"bold" }}>Flaticon</a>
            {" · "}
            Emoji by{" "}
            <a href="https://openmoji.org" target="_blank" rel="noreferrer" style={{ color:theme.accent, textDecoration:"none", fontWeight:"bold" }}>OpenMoji</a>
            {" · "}
            Built with React &amp; Canvas API
          </div>
        </>
      )}

    </div>
  );
}