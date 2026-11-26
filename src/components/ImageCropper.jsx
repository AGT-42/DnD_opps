import { useEffect, useRef, useState } from "react";
import { btnPrimary, btnOutline, label } from "../utils/ui.js";

// Modal square cropper: drag the picture to reposition it, use the slider to zoom, then "Use crop".
//   src      data URL of the picture to crop
//   outSize  width/height in pixels of the saved square
//   onDone   called with the cropped JPEG data URL
//   onCancel called when the user backs out
export default function ImageCropper({ src, outSize = 400, onDone, onCancel }) {
  const V = Math.min(300, window.innerWidth - 80); // size of the square crop window on screen
  const [nat, setNat] = useState(null); // natural size of the picture
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // top-left of the picture inside the window
  const imgRef = useRef(null);
  const drag = useRef(null);

  // scale so the picture always covers the whole window, times the zoom
  const scaleFor = (z, n = nat) => (V / Math.min(n.w, n.h)) * z;
  const clamp = (p, s, n = nat) => ({
    x: Math.min(0, Math.max(V - n.w * s, p.x)),
    y: Math.min(0, Math.max(V - n.h * s, p.y)),
  });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const n = { w: img.naturalWidth, h: img.naturalHeight };
      const s = V / Math.min(n.w, n.h);
      imgRef.current = img;
      setNat(n);
      setPos({ x: (V - n.w * s) / 2, y: (V - n.h * s) / 2 }); // start centred
    };
    img.src = src;
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = nat ? scaleFor(zoom) : 1;

  const changeZoom = (z) => {
    // keep whatever is in the middle of the window in the middle while zooming
    const cx = (V / 2 - pos.x) / s;
    const cy = (V / 2 - pos.y) / s;
    const ns = scaleFor(z);
    setZoom(z);
    setPos(clamp({ x: V / 2 - cx * ns, y: V / 2 - cy * ns }, ns));
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    setPos(clamp({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y }, s));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const finish = () => {
    const canvas = document.createElement("canvas");
    canvas.width = outSize;
    canvas.height = outSize;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, outSize, outSize);
    ctx.drawImage(imgRef.current, -pos.x / s, -pos.y / s, V / s, V / s, 0, 0, outSize, outSize);
    onDone(canvas.toDataURL("image/jpeg", 0.85));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div role="dialog" aria-label="Crop image" className="space-y-4 bg-white p-5 shadow-xl">
        <h3 className="font-display text-2xl">Crop image</h3>
        <p className="text-sm text-mute">Drag to reposition, use the slider to zoom.</p>
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative mx-auto cursor-grab touch-none select-none overflow-hidden border border-ink bg-paper active:cursor-grabbing"
          style={{ width: V, height: V }}
        >
          {nat ? (
            <img
              src={src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{ left: pos.x, top: pos.y, width: nat.w * s, height: nat.h * s }}
            />
          ) : (
            <p className="p-4 text-sm text-mute">Loading...</p>
          )}
        </div>
        <label className="flex items-center gap-3">
          <span className={`${label} text-mute`}>Zoom</span>
          <input type="range" min="1" max="4" step="0.01" value={zoom} onChange={(e) => changeZoom(Number(e.target.value))} disabled={!nat} className="flex-1" />
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={finish} disabled={!nat} className={`${btnPrimary} disabled:opacity-50`}>Use crop</button>
          <button type="button" onClick={onCancel} className={btnOutline}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
