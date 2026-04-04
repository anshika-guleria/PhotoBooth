import { useCallback, useEffect, useRef, useState } from "react";
import { CAMERA_FILTERS } from '../constants/filters';
import { STICKERS_PER_THEME } from '../constants/stickers';
import { THEMES } from '../constants/themes';
import useCamera from '../hooks/useCamera';
import { drawMirroredVideoCover } from '../utils/drawMirroredVideoCover';
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
  const [selectedUid,    setSelectedUid]    = useState(null); // which sticker is selected
  const [isMobile,       setIsMobile]       = useState(false);

  const stickerLayer  = useRef(null);
  const countdownRef  = useRef(null);

  const { videoRef, canvasRef, cameraError } = useCamera(selectedFilter, selectedBorder);
  const theme = THEMES[selectedTheme];
useEffect(() => {
  preloadAllStickers();
}, []);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => () => clearInterval(countdownRef.current), []);

  // Deselect sticker when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest("[data-sticker]")) setSelectedUid(null);
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("touchstart", handleClick, { passive: true });
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("touchstart", handleClick);
    };
  }, []);

  // ── Capture photo — bakes rotation into canvas ─────────────────────────────
  const capturePhoto = useCallback(() => {
    const photoCanvas = document.createElement("canvas");
    photoCanvas.width = 480; photoCanvas.height = 360;
    const ctx = photoCanvas.getContext("2d");
    drawMirroredVideoCover(ctx, videoRef.current, 480, 360);
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
      size: 64,
      rotation: 0,
      flipX: false,
      flipY: false,
    }]);
    setSelectedUid(uid);
  };

  const updateSticker = (uid, changes) => {
    setPlacedStickers(prev => prev.map(s => s.uid === uid ? { ...s, ...changes } : s));
  };

  const handleStickerDragStart = (event, uid) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedUid(uid);
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
    const newX = Math.max(0, Math.min(480, clientX-layerRect.left-dragOffset.x));
    const newY = Math.max(0, Math.min(360, clientY-layerRect.top-dragOffset.y));
    updateSticker(draggingUid, { x: newX, y: newY });
  }, [draggingUid, dragOffset]);

  const handleDragEnd = () => setDraggingUid(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const filledPhotoCount = photoStrip.filter(Boolean).length;
  const canSnap = activeSlot < 3 && countdown === null;
  const currentStickerKeys = STICKERS_PER_THEME[selectedTheme];
  const selectedSticker = placedStickers.find(s => s.uid === selectedUid);

  /* Pixel / arcade font is illegible below ~14px on phones — use system UI there */
  const uiFont =
    isMobile && selectedTheme === "pixel"
      ? "system-ui, -apple-system, 'Segoe UI', sans-serif"
      : theme.font;

  const sz = isMobile ? {
    titleFont: 26, themeFont: 14, themePad: "10px 16px", labelFont: 14, chipFont: 14,
    chipPad: "10px 16px", snapFont: 16, snapPad: "14px 22px", btnFont: 14, btnPad: "12px 18px",
    stripW: "100%", slotFont: 22, redoFont: 13, dlFont: 16, dlPad: "14px 0",
    panelPad: "16px", gap: 14, mainPad: "14px 12px max(18px, env(safe-area-inset-bottom))",
    stickerCols: "repeat(auto-fill, minmax(52px, 1fr))", tipFont: 13,
    stickerPanelFont: 13, controlFont: 13, controlBtnPad: "8px 12px",
  } : {
    titleFont:34, themeFont:14, themePad:"8px 18px", labelFont:13, chipFont:14,
    chipPad:"8px 16px", snapFont:19, snapPad:"17px 40px", btnFont:15, btnPad:"14px 24px",
    stripW:230, slotFont:24, redoFont:13, dlFont:16, dlPad:"15px 0",
    panelPad:"20px", gap:18, mainPad:"20px 20px",
    stickerCols:"repeat(auto-fill, minmax(58px, 1fr))", tipFont:12,
    stickerPanelFont: 12, controlFont: 12, controlBtnPad: "4px 10px",
  };

  return (
    <div
      style={{
        minHeight:"100dvh", background:theme.backgroundGradient,
        fontFamily:uiFont, display:"flex", flexDirection:"column",
        alignItems:"center", overflowX:"hidden",
        paddingLeft:"env(safe-area-inset-left)", paddingRight:"env(safe-area-inset-right)",
      }}
      onMouseMove={handleDragMove} onMouseUp={handleDragEnd}
      onTouchMove={handleDragMove} onTouchEnd={handleDragEnd}
    >

      {/* HEADER */}
      <div style={{ width:"100%", padding:isMobile?"max(16px, env(safe-area-inset-top)) 12px 16px":"24px 32px", textAlign:"center", borderBottom:`1px solid ${theme.accent}30` }}>
        <h1 style={{ fontSize:sz.titleFont, color:theme.textColor, fontWeight:"bold", textShadow:`0 0 30px ${theme.glow}`, margin:0, letterSpacing:isMobile?1:2, lineHeight:1.2 }}>
          ✦ Photo Booth ✦
        </h1>
      </div>

      {/* THEME BAR — scroll one row on narrow screens so it stays scannable */}
      <div style={{
        width:"100%", boxSizing:"border-box", borderBottom:`1px solid ${theme.accent}20`,
        padding:isMobile?"10px 0":"14px 24px",
        overflowX:isMobile?"auto":"visible",
        WebkitOverflowScrolling:"touch",
        scrollbarWidth:"thin",
      }}>
        <div style={{
          display:"flex", gap:8, flexWrap:isMobile?"nowrap":"wrap",
          justifyContent:isMobile?"flex-start":"center",
          padding:isMobile?"0 12px":"0", width:isMobile?"max-content":"100%",
          minWidth:0,
        }}>
        {Object.entries(THEMES).map(([k,v]) => (
          <button key={k} type="button" onClick={() => { setSelectedTheme(k);  setSelectedUid(null); }} style={{
            padding:sz.themePad, borderRadius:999, flexShrink:0,
            border:`2px solid ${k===selectedTheme ? theme.accent : theme.accent+"30"}`,
            background:k===selectedTheme ? theme.accent+"25" : "transparent",
            color:k===selectedTheme ? theme.accent : theme.mutedColor,
            cursor:"pointer", fontSize:sz.themeFont, fontFamily:"inherit",
            fontWeight:k===selectedTheme?"bold":"normal", whiteSpace:"nowrap", transition:"all 0.15s",
            touchAction:"manipulation",
          }}>{v.emoji} {v.name}</button>
        ))}
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ display:"flex", flexDirection:isMobile?"column":"row", gap:sz.gap, padding:sz.mainPad, width:"100%", maxWidth:1280, alignItems:"flex-start", justifyContent:"center", boxSizing:"border-box" }}>

        {/* LEFT: Camera + controls */}
        <div style={{ display:"flex", flexDirection:"column", gap:sz.gap, flex:isMobile?"none":"1 1 0", minWidth:0, width:isMobile?"100%":undefined, maxWidth:isMobile?"100%":640 }}>

          {/* Camera viewport */}
          <div style={{
            position:"relative", width:"100%", aspectRatio:"4/3", borderRadius:16, overflow:"hidden",
            border:`3px solid ${theme.accent}`, boxShadow:`0 0 44px ${theme.glow}55, 0 8px 32px rgba(0,0,0,0.45)`, background:"#000",
            touchAction: draggingUid ? "none" : "manipulation",
          }}>
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
            <div ref={stickerLayer} style={{ position:"absolute", inset:0, touchAction: draggingUid ? "none" : "manipulation" }}>
              {placedStickers.map(sticker => {
                const img = getCachedImage(sticker.key);
                const isSelected = sticker.uid === selectedUid;
                const pct = (v, base) => `${(v/base)*100}%`;
                return (
                  <div
                    key={sticker.uid}
                    data-sticker="true"
                    style={{
                      position:"absolute",
                      left: pct(sticker.x, 480),
                      top:  pct(sticker.y, 360),
                      width: pct(sticker.size, 480),
                      aspectRatio:"1",
                      transform:`translate(-50%,-50%) rotate(${sticker.rotation||0}deg) scaleX(${sticker.flipX ? -1 : 1}) scaleY(${sticker.flipY ? -1 : 1})`,
                      cursor:"grab",
                      zIndex: isSelected ? 10 : 5,
                      filter:"drop-shadow(0 3px 8px rgba(0,0,0,0.5))",
                      outline: isSelected ? `2px dashed ${theme.accent}` : "none",
                      outlineOffset: "3px",
                      borderRadius: 4,
                    }}
                    onMouseDown={e => handleStickerDragStart(e, sticker.uid)}
                    onTouchStart={e => handleStickerDragStart(e, sticker.uid)}
                    onDoubleClick={() => {
                      setPlacedStickers(prev => prev.filter(s => s.uid !== sticker.uid));
                      setSelectedUid(null);
                    }}
                    title="Drag · Double-click to remove"
                  >
                    <img src={img.src} alt={sticker.key} style={{ width:"100%", height:"100%", pointerEvents:"none", display:"block" }} />
                  </div>
                );
              })}
            </div>

            {/* Flash */}
            <div style={{ position:"absolute", inset:0, background:"white", opacity:showFlash?1:0, transition:showFlash?"none":"opacity 0.35s", pointerEvents:"none", zIndex:8 }} />

            {/* Countdown */}
            {countdown !== null && (
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", zIndex:9 }}>
                <span style={{ fontSize:"min(24vw,130px)", fontWeight:"bold", color:theme.accent, textShadow:`0 0 60px ${theme.glow}`, lineHeight:1 }}>{countdown}</span>
              </div>
            )}
          </div>

          {/* ── Sticker resize + rotate controls (shows when a sticker is selected) ── */}
          {selectedSticker && (
              <div data-sticker="true" style={{
              display:"flex", flexDirection:"column", gap:8,
              background: theme.panelBackground,
              border:`1.5px solid ${theme.accent}50`,
              borderRadius:12, padding:"12px 14px",
            }}>
              <div style={{ fontSize:sz.stickerPanelFont, fontWeight:"bold", color:theme.accent, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                Selected sticker
              </div>

              {/* Size slider */}
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:sz.controlFont, color:theme.mutedColor, width:isMobile?48:44, flexShrink:0 }}>Size</span>
                <input type="range" min={24} max={200} value={selectedSticker.size}
                  onChange={e => updateSticker(selectedUid, { size: Number(e.target.value) })}
                  style={{ flex:1, accentColor: theme.accent }}
                />
                <span style={{ fontSize:sz.controlFont, color:theme.mutedColor, width:36, textAlign:"right", flexShrink:0 }}>{selectedSticker.size}px</span>
              </div>

              {/* Rotation slider */}
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:sz.controlFont, color:theme.mutedColor, width:isMobile?48:44, flexShrink:0 }}>Rotate</span>
                <input type="range" min={-180} max={180} value={selectedSticker.rotation||0}
                  onChange={e => updateSticker(selectedUid, { rotation: Number(e.target.value) })}
                  style={{ flex:1, accentColor: theme.accent }}
                />
                <span style={{ fontSize:sz.controlFont, color:theme.mutedColor, width:36, textAlign:"right", flexShrink:0 }}>{selectedSticker.rotation||0}°</span>
              </div>

              {/* Quick rotate buttons + delete */}
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {[
                  { label:"↺ -15°", delta:-15 },
                  { label:"↻ +15°", delta:+15 },
                  { label:"↺ -45°", delta:-45 },
                  { label:"↻ +45°", delta:+45 },
                  { label:"Reset",  reset:true },
                ].map(btn => (
                  <button key={btn.label} type="button"
                    onClick={() => {
                      if (btn.reset) updateSticker(selectedUid, { rotation:0, size:64, flipX:false, flipY:false });
                      else updateSticker(selectedUid, { rotation: ((selectedSticker.rotation||0) + btn.delta + 360) % 360 });
                    }}
                    style={{
                      padding:sz.controlBtnPad, borderRadius:999, fontSize:sz.controlFont,
                      border:`1.5px solid ${theme.accent}50`,
                      background:"transparent", color:theme.accent,
                      cursor:"pointer", fontFamily:"inherit", touchAction:"manipulation",
                    }}
                  >{btn.label}</button>
                ))}
                <button type="button"
                  onClick={() => { setPlacedStickers(prev => prev.filter(s => s.uid !== selectedUid)); setSelectedUid(null); }}
                  style={{
                    padding:sz.controlBtnPad, borderRadius:999, fontSize:sz.controlFont,
                    border:"1.5px solid #ef4444",
                    background:"transparent", color:"#ef4444",
                    cursor:"pointer", fontFamily:"inherit", marginLeft:"auto", touchAction:"manipulation",
                  }}
                >🗑 Remove</button>
              </div>

              {/* Flip buttons */}
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <button type="button"
                  onClick={() => updateSticker(selectedUid, { flipX: !selectedSticker.flipX })}
                  style={{
                    padding:sz.controlBtnPad, borderRadius:999, fontSize:sz.controlFont,
                    border:`1.5px solid ${selectedSticker.flipX ? theme.accent : theme.accent+"50"}`,
                    background: selectedSticker.flipX ? theme.accent+"25" : "transparent",
                    color: theme.accent, cursor:"pointer", fontFamily:"inherit", touchAction:"manipulation",
                  }}
                >⇔ Flip Horizontal</button>
                <button type="button"
                  onClick={() => updateSticker(selectedUid, { flipY: !selectedSticker.flipY })}
                  style={{
                    padding:sz.controlBtnPad, borderRadius:999, fontSize:sz.controlFont,
                    border:`1.5px solid ${selectedSticker.flipY ? theme.accent : theme.accent+"50"}`,
                    background: selectedSticker.flipY ? theme.accent+"25" : "transparent",
                    color: theme.accent, cursor:"pointer", fontFamily:"inherit", touchAction:"manipulation",
                  }}
                >⇕ Flip Vertical</button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div>
            <div style={{ fontSize:sz.labelFont, fontWeight:"bold", color:theme.accent, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>Filters</div>
            <div style={{
              display:"flex", gap:7, flexWrap:isMobile?"nowrap":"wrap",
              overflowX:isMobile?"auto":"visible", WebkitOverflowScrolling:"touch", paddingBottom:isMobile?4:0,
              scrollbarWidth:"thin",
            }}>
              {CAMERA_FILTERS.map(f => (
                <button key={f.id} type="button" onClick={() => setSelectedFilter(f.id)} style={{
                  padding:sz.chipPad, borderRadius:999, flexShrink:0,
                  border:`2px solid ${f.id===selectedFilter ? theme.accent : theme.accent+"35"}`,
                  background:f.id===selectedFilter ? theme.accent+"25" : "transparent",
                  color:f.id===selectedFilter ? theme.accent : theme.mutedColor,
                  fontSize:sz.chipFont, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
                  touchAction:"manipulation",
                }}>{f.name}</button>
              ))}
            </div>
          </div>

          {/* Border picker */}
          <BorderPreview selectedBorder={selectedBorder} onSelect={setSelectedBorder} theme={theme} isMobile={isMobile} />

          {/* Action buttons */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"stretch" }}>
            <button type="button" onClick={handleSnap} disabled={!canSnap} style={{
              padding:sz.snapPad, borderRadius:999, border:"none",
              background:canSnap ? theme.accent : theme.mutedColor,
              color:"#000", fontWeight:"bold", fontSize:sz.snapFont,
              cursor:canSnap?"pointer":"default", fontFamily:"inherit",
              boxShadow:canSnap?`0 0 26px ${theme.glow}bb`:"none",
              opacity:canSnap?1:0.45, flex:isMobile?"1 1 100%":undefined, minHeight:48, transition:"all 0.2s", touchAction:"manipulation",
            }}>
              {countdown!==null ? `⏱ ${countdown}` : activeSlot>=3 ? "Strip Full!" : `📸 Snap  (${3-activeSlot} left)`}
            </button>
            <button type="button" onClick={() => { setPlacedStickers([]); setSelectedUid(null); }} style={{ padding:sz.btnPad, borderRadius:999, border:`2px solid ${theme.accent}`, background:"transparent", color:theme.accent, fontSize:sz.btnFont, cursor:"pointer", fontFamily:"inherit", flex:isMobile?"1 1 calc(50% - 5px)":undefined, minHeight:48, touchAction:"manipulation" }}>
              Clear Stickers
            </button>
            <button type="button" onClick={() => { setPhotoStrip([null,null,null]); setActiveSlot(0); }} style={{ padding:sz.btnPad, borderRadius:999, border:`2px solid ${theme.accent}`, background:"transparent", color:theme.accent, fontSize:sz.btnFont, cursor:"pointer", fontFamily:"inherit", flex:isMobile?"1 1 calc(50% - 5px)":undefined, minHeight:48, touchAction:"manipulation" }}>
              Reset
            </button>
          </div>
        </div>

        {/* MIDDLE: Strip */}
        <div style={{ display:"flex", flexDirection:"column", gap:10, background:theme.panelBackground, borderRadius:18, border:`2px solid ${theme.accent}`, padding:sz.panelPad, flex:"0 0 auto", width:isMobile?"100%":sz.stripW, alignItems:"center", boxSizing:"border-box", boxShadow:`0 0 32px ${theme.glow}28` }}>
          <div style={{ fontSize:sz.labelFont+2, fontWeight:"bold", color:theme.accent, letterSpacing:"0.1em", textTransform:"uppercase", textAlign:"center" }}>{theme.emoji} Strip</div>
          {/* Column on mobile too — three slots in a row were too narrow on phones */}
          <div style={{ display:"flex", flexDirection:"column", gap:8, width:"100%" }}>
            {[0,1,2].map(i => {
              const filled=!!photoStrip[i], active=i===activeSlot&&!filled;
              return (
                <div key={i} style={{ position:"relative", width:"100%", aspectRatio:"4/3", borderRadius:10, border:`2px ${filled?"solid":"dashed"} ${active?theme.accent:filled?theme.accent+"80":theme.accent+"30"}`, background:filled?"#000":theme.accentDim+"22", overflow:"hidden", boxShadow:active?`0 0 18px ${theme.glow}70`:"none" }}>
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
          <button type="button" onClick={handleDownload} disabled={filledPhotoCount===0} style={{ width:"100%", padding:sz.dlPad, borderRadius:999, border:"none", background:theme.accent, color:"#000", fontWeight:"bold", fontSize:sz.dlFont, cursor:filledPhotoCount===0?"default":"pointer", fontFamily:"inherit", boxShadow:`0 0 20px ${theme.glow}66`, opacity:filledPhotoCount===0?0.4:1, minHeight:48, touchAction:"manipulation" }}>
            ⬇ Download Strip
          </button>
          <div style={{ fontSize:sz.labelFont, color:theme.mutedColor, textAlign:"center" }}>{filledPhotoCount} / 3 photos</div>
        </div>

        {/* RIGHT: Stickers */}
        <div style={{ display:"flex", flexDirection:"column", gap:10, background:theme.panelBackground, borderRadius:18, border:`2px solid ${theme.accent}30`, padding:sz.panelPad, flex:"0 0 auto", width:isMobile?"100%":270, boxSizing:"border-box", overflow:"hidden", minWidth:0 }}>
          <div style={{ fontSize:sz.labelFont+2, fontWeight:"bold", color:theme.accent, letterSpacing:"0.1em", textTransform:"uppercase" }}>Stickers</div>
          <div style={{ display:"grid", gridTemplateColumns:sz.stickerCols, gap:6, width:"100%", minWidth:0 }}>
            {currentStickerKeys.map(key => {
              const img = getCachedImage(key);
              return (
                <button key={key} type="button" onClick={() => handleAddSticker(key)} title={`Add ${key}`}
                  style={{ minWidth:0, width:"100%", aspectRatio:"1", borderRadius:10, border:`2px solid ${theme.accent}30`, background:theme.accentDim+"28", cursor:"pointer", padding:5, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", transition:"transform 0.12s, border-color 0.12s", boxSizing:"border-box", fontSize:22, touchAction:"manipulation" }}
                  onMouseEnter={e => { e.currentTarget.style.transform="scale(1.1)"; e.currentTarget.style.borderColor=theme.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.transform="scale(1)";   e.currentTarget.style.borderColor=theme.accent+"30"; }}
                >
                  {img.complete && img.naturalWidth > 0 && !img.dataset.failed
                    ? <img src={img.src} alt={key} style={{ width:"70%", height:"70%", objectFit:"contain", pointerEvents:"none", display:"block", margin:"auto" }} />
                    :"⏳"
                  }
                </button>
              );
            })}
          </div>
          <div style={{ fontSize:sz.tipFont, color:theme.mutedColor, lineHeight:1.6 }}>
            Tap to place · Drag to move · Double-tap removes · Tap sticker to resize/rotate
          </div>
        </div>

      </div>

      {/* CREDITS */}
      <div style={{ width:"100%", padding:isMobile?"14px 16px max(14px, env(safe-area-inset-bottom))":"14px 20px", borderTop:`1px solid ${theme.accent}15`, textAlign:"center", fontSize:isMobile?14:12, color:theme.mutedColor, marginTop:"auto", boxSizing:"border-box", lineHeight:1.5 }}>
        Stickers by{" "}
        <a href="https://www.flaticon.com" target="_blank" rel="noreferrer" style={{ color:theme.accent, textDecoration:"none", fontWeight:"bold" }}>Flaticon</a>
        {" · "}
        Emoji by{" "}
        <a href="https://openmoji.org" target="_blank" rel="noreferrer" style={{ color:theme.accent, textDecoration:"none", fontWeight:"bold" }}>OpenMoji</a>
        {" · "}
        Built with React &amp; Canvas API
      </div>

    </div>
  );
}