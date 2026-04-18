import { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Check, X } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const C   = 300;   // container px (square)
const CR  = 120;   // crop circle radius
const CS  = CR * 2; // crop circle diameter
const OUTPUT = 300; // canvas output size

// ─── ImageCropper ─────────────────────────────────────────────────────────────
/**
 * Props:
 *   src       {string}   — data-URL or object URL of the image to crop
 *   onConfirm {fn(b64)}  — called with cropped JPEG base64 string
 *   onCancel  {fn}       — called when user dismisses without cropping
 */
export default function ImageCropper({ src, onConfirm, onCancel }) {
  // ── rendering state (triggers re-renders)
  const [scale, setScale]       = useState(1);
  const [offsetUI, setOffsetUI] = useState({ x: 0, y: 0 });
  const [imgNat, setImgNat]     = useState({ w: 1, h: 1 });
  const [ready, setReady]       = useState(false);

  // ── refs (kept current inside event handlers — no stale closures)
  const scaleRef    = useRef(1);
  const offsetRef   = useRef({ x: 0, y: 0 });
  const imgNatRef   = useRef({ w: 1, h: 1 });
  const dragRef     = useRef({ active: false, startX: 0, startY: 0, startOff: { x: 0, y: 0 } });
  const containerRef = useRef(null);
  const imgRef      = useRef(null);   // hidden <img> for canvas copy

  // ── sync scale to ref
  const syncScale = (v) => { scaleRef.current = v; setScale(v); };
  const syncOffset = (o) => { offsetRef.current = o; setOffsetUI(o); };

  // ── constrain offset so image always covers crop circle
  const constrain = useCallback((off, sc, nat) => {
    const iW = nat.w * sc;
    const iH = nat.h * sc;
    const halfC = C / 2;
    // image left/top in container coords = halfC + off.x - iW/2, halfC + off.y - iH/2
    // crop circle occupies [halfC - CR, halfC + CR] in both axes
    // constraint: imgLeft <= halfC - CR  AND  imgLeft + iW >= halfC + CR
    const minX = CR - iW / 2;    // off.x lower bound (image right edge must reach halfC+CR)
    const maxX = iW / 2 - CR;    // off.x upper bound (image left edge must be at most halfC-CR)
    const minY = CR - iH / 2;
    const maxY = iH / 2 - CR;
    return {
      x: Math.max(minX, Math.min(maxX, off.x)),
      y: Math.max(minY, Math.min(maxY, off.y)),
    };
  }, []);

  // ── load image → measure natural size → center-fit
  useEffect(() => {
    setReady(false);
    const img = new Image();
    img.onload = () => {
      const nat = { w: img.naturalWidth, h: img.naturalHeight };
      imgNatRef.current = nat;
      setImgNat(nat);

      // initial scale: fill the crop circle (cover)
      const fitScale = Math.max(CS / nat.w, CS / nat.h);
      const initialScale = Math.max(fitScale, 1);
      scaleRef.current = initialScale;
      setScale(initialScale);

      const center = { x: 0, y: 0 };
      offsetRef.current = center;
      setOffsetUI(center);
      setReady(true);
    };
    img.src = src;
    if (imgRef.current) imgRef.current.src = src;
  }, [src]);

  // ── zoom helpers
  const doZoom = (factor) => {
    const nat = imgNatRef.current;
    const newScale = Math.min(5, Math.max(
      Math.max(CS / nat.w, CS / nat.h),   // min: always cover circle
      scaleRef.current * factor
    ));
    const constrained = constrain(offsetRef.current, newScale, nat);
    scaleRef.current = newScale;
    offsetRef.current = constrained;
    setScale(newScale);
    setOffsetUI(constrained);
  };

  // ── pointer drag handlers (works for both mouse and touch)
  const onPtrDown = useCallback((e) => {
    // only start drag on the container, not on buttons
    if (e.target.closest('button')) return;
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    dragRef.current = {
      active: true,
      startX: pt.clientX,
      startY: pt.clientY,
      startOff: { ...offsetRef.current },
    };
  }, []);

  const onPtrMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - dragRef.current.startX;
    const dy = pt.clientY - dragRef.current.startY;
    const raw = {
      x: dragRef.current.startOff.x + dx,
      y: dragRef.current.startOff.y + dy,
    };
    const constrained = constrain(raw, scaleRef.current, imgNatRef.current);
    offsetRef.current = constrained;
    setOffsetUI({ ...constrained });
  }, [constrain]);

  const onPtrUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  // ── wheel zoom
  const onWheel = useCallback((e) => {
    e.preventDefault();
    doZoom(e.deltaY < 0 ? 1.08 : 0.93);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [constrain]);

  // attach non-passive wheel listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  // ── pinch-to-zoom (two-finger)
  const pinchRef = useRef({ active: false, startDist: 1, startScale: 1 });

  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { active: true, startDist: Math.hypot(dx, dy), startScale: scaleRef.current };
      dragRef.current.active = false;
    } else {
      onPtrDown(e);
    }
  }, [onPtrDown]);

  const onTouchMove = useCallback((e) => {
    if (pinchRef.current.active && e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const nat = imgNatRef.current;
      const newScale = Math.min(5, Math.max(
        Math.max(CS / nat.w, CS / nat.h),
        pinchRef.current.startScale * (dist / pinchRef.current.startDist)
      ));
      const constrained = constrain(offsetRef.current, newScale, nat);
      scaleRef.current = newScale;
      offsetRef.current = constrained;
      setScale(newScale);
      setOffsetUI({ ...constrained });
    } else {
      onPtrMove(e);
    }
  }, [constrain, onPtrMove]);

  const onTouchEnd = useCallback((e) => {
    pinchRef.current.active = false;
    onPtrUp(e);
  }, [onPtrUp]);

  // ── confirm: draw crop to canvas → get base64
  const handleConfirm = () => {
    const nat = imgNatRef.current;
    const sc  = scaleRef.current;
    const off = offsetRef.current;

    // top-left of image in container coords
    const imgLeft = C / 2 + off.x - (nat.w * sc) / 2;
    const imgTop  = C / 2 + off.y - (nat.h * sc) / 2;

    // crop circle top-left in container coords
    const cropLeft = C / 2 - CR;
    const cropTop  = C / 2 - CR;

    // source rect in image natural coords
    const srcX = (cropLeft - imgLeft) / sc;
    const srcY = (cropTop  - imgTop)  / sc;
    const srcW = CS / sc;
    const srcH = CS / sc;

    const canvas = document.createElement('canvas');
    canvas.width  = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d');

    // Circular clip
    ctx.beginPath();
    ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2);
    ctx.clip();

    const img = imgRef.current;
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUTPUT, OUTPUT);

    onConfirm(canvas.toDataURL('image/jpeg', 0.85));
  };

  // ── computed image style
  const iW = imgNat.w * scale;
  const iH = imgNat.h * scale;
  const imgStyle = {
    width:  iW,
    height: iH,
    left:   C / 2 + offsetUI.x - iW / 2,
    top:    C / 2 + offsetUI.y - iH / 2,
    userSelect: 'none',
    pointerEvents: 'none',
    touchAction: 'none',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
         onClick={onCancel}>
      <div className="bg-slate-900 rounded-3xl shadow-2xl p-5 flex flex-col items-center gap-4 w-[340px] max-w-[95vw]"
           onClick={e => e.stopPropagation()}>

        {/* Title */}
        <div className="text-center">
          <h3 className="text-white font-bold text-lg leading-tight">Ritaglia foto</h3>
          <p className="text-white/40 text-xs mt-0.5">Trascina per posizionare · Pizzica o scorri per zoom</p>
        </div>

        {/* Crop zone */}
        <div
          ref={containerRef}
          className="relative overflow-hidden bg-black rounded-2xl select-none"
          style={{ width: C, height: C, cursor: 'grab', touchAction: 'none' }}
          onMouseDown={onPtrDown}
          onMouseMove={onPtrMove}
          onMouseUp={onPtrUp}
          onMouseLeave={onPtrUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Image */}
          {ready && (
            <img
              alt="crop"
              src={src}
              className="absolute"
              style={imgStyle}
              draggable={false}
            />
          )}

          {/* Circular cutout overlay */}
          <div
            className="absolute pointer-events-none rounded-full border-2 border-white/70"
            style={{
              width:  CS,
              height: CS,
              left:   C / 2 - CR,
              top:    C / 2 - CR,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.62)',
            }}
          />

          {/* Zoom buttons — right side, inside crop zone */}
          <div className="absolute flex flex-col gap-2"
               style={{ right: C / 2 - CR - 44, top: C / 2 - 32 }}>
            <button
              onClick={e => { e.stopPropagation(); doZoom(1.15); }}
              className="w-9 h-9 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center hover:bg-black/80 active:scale-90 transition-all"
              title="Zoom +"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); doZoom(0.87); }}
              className="w-9 h-9 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center hover:bg-black/80 active:scale-90 transition-all"
              title="Zoom -"
            >
              <ZoomOut size={16} />
            </button>
          </div>

          {/* Confirm button — bottom-right of crop zone */}
          <button
            onClick={e => { e.stopPropagation(); handleConfirm(); }}
            className="absolute w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-90 border-2 border-white/30 text-white flex items-center justify-center shadow-lg transition-all"
            style={{ right: C / 2 - CR - 50, bottom: C / 2 - CR - 50 }}
            title="Conferma"
          >
            <Check size={22} strokeWidth={2.5} />
          </button>
        </div>

        {/* Hint + cancel */}
        <div className="flex items-center justify-between w-full px-1">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors"
          >
            <X size={14} /> Annulla
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md"
          >
            <Check size={16} strokeWidth={2.5} /> Usa questa foto
          </button>
        </div>
      </div>

      {/* Hidden img element used by Canvas for drawImage */}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <img ref={imgRef} src={src} style={{ display: 'none' }} crossOrigin="anonymous" />
    </div>
  );
}
