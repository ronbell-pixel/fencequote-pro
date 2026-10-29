"use client";
import { useEffect, useRef, useState } from "react";

export type SignatureValue =
  | { method: "drawn"; image: string }
  | { method: "typed"; text: string }
  | null;

/** Draw-or-type signature capture. Reports null until the signer has drawn or typed something. */
export default function SignaturePad({
  name,
  onChange,
}: {
  name: string;
  onChange: (value: SignatureValue) => void;
}) {
  const [mode, setMode] = useState<"draw" | "type">("draw"),
    [typed, setTyped] = useState(name),
    [hasInk, setHasInk] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null),
    drawing = useRef(false),
    last = useRef<{ x: number; y: number } | null>(null),
    ink = useRef(false);

  useEffect(() => {
    const c = canvas.current;
    if (!c || mode !== "draw") return;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1,
        { width, height } = c.getBoundingClientRect();
      c.width = width * ratio;
      c.height = height * ratio;
      const ctx = c.getContext("2d")!;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#14213d";
      ink.current = false;
      setHasInk(false);
      onChange(null);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (mode === "type") onChange(typed.trim() ? { method: "typed", text: typed.trim() } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, typed]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = e.currentTarget.getContext("2d")!,
      p = point(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    ink.current = true;
    setHasInk(true);
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    if (canvas.current && ink.current)
      onChange({ method: "drawn", image: canvas.current.toDataURL("image/png") });
  };
  const clear = () => {
    const c = canvas.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    ink.current = false;
    setHasInk(false);
    onChange(null);
  };

  return (
    <div className="sigPad">
      <div className="sigTabs" role="tablist" aria-label="Signature method">
        <button type="button" role="tab" aria-selected={mode === "draw"} className={mode === "draw" ? "active" : ""} onClick={() => setMode("draw")}>
          Draw
        </button>
        <button type="button" role="tab" aria-selected={mode === "type"} className={mode === "type" ? "active" : ""} onClick={() => setMode("type")}>
          Type
        </button>
      </div>
      {mode === "draw" ? (
        <div className="sigCanvasWrap">
          <canvas
            ref={canvas}
            aria-label="Signature drawing area. Sign with your finger, stylus, or mouse."
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            onPointerCancel={end}
          />
          {!hasInk && <span className="sigHint">Sign here with your finger or mouse</span>}
          <i className="sigLine">✕</i>
          {hasInk && (
            <button type="button" className="sigClear" onClick={clear}>
              Clear
            </button>
          )}
        </div>
      ) : (
        <label className="sigTyped">
          <span>Type your full legal name</span>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="name" />
          <b aria-hidden="true">{typed || " "}</b>
        </label>
      )}
    </div>
  );
}
