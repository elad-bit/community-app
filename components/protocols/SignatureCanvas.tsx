"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface SignatureCanvasProps {
  label: string;
  existingSignature?: string | null;
  onSave: (dataUrl: string) => Promise<void>;
  onClear?: () => Promise<void>;
  readOnly?: boolean;
}

export function SignatureCanvas({
  label,
  existingSignature,
  onSave,
  onClear,
  readOnly = false,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(!!existingSignature);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"view" | "draw">(existingSignature ? "view" : "draw");
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Draw existing signature on canvas when in view mode
  useEffect(() => {
    if (mode === "view" && existingSignature && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = existingSignature;
    }
  }, [mode, existingSignature]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly || mode !== "draw") return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPos(e, canvas);
    lastPos.current = pos;
    setIsDrawing(true);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "#1e3a5f";
    ctx.fill();
  }, [readOnly, mode]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly || mode !== "draw") return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || !lastPos.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  }, [isDrawing, readOnly, mode]);

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Check if anything was drawn
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = data.data.some((v, i) => i % 4 === 3 && v > 0);
    if (!hasContent) return;

    setSaving(true);
    try {
      const dataUrl = canvas.toDataURL("image/png");
      await onSave(dataUrl);
      setHasSig(true);
      setMode("view");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    clearCanvas();
    if (onClear) await onClear();
    setMode("draw");
  };

  return (
    <div className="border border-secondary-200 rounded-xl overflow-hidden" dir="rtl">
      <div className="bg-secondary-50 px-3 py-2 flex items-center justify-between border-b border-secondary-200">
        <span className="text-sm font-medium text-secondary-700">{label}</span>
        <div className="flex items-center gap-2">
          {hasSig && !readOnly && (
            <>
              {mode === "view" && (
                <button
                  onClick={() => setMode("draw")}
                  className="text-xs text-primary-600 hover:underline"
                >
                  ערוך
                </button>
              )}
              <button
                onClick={handleClear}
                className="text-xs text-red-500 hover:underline"
              >
                מחק
              </button>
            </>
          )}
          {hasSig && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              חתום
            </span>
          )}
        </div>
      </div>

      <div className="relative bg-white">
        <canvas
          ref={canvasRef}
          width={400}
          height={120}
          className={`w-full h-28 touch-none ${mode === "draw" && !readOnly ? "cursor-crosshair" : "cursor-default"}`}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {mode === "draw" && !readOnly && !hasSig && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-secondary-300 text-sm">חתום כאן</span>
          </div>
        )}
      </div>

      {mode === "draw" && !readOnly && (
        <div className="px-3 py-2 border-t border-secondary-100 flex gap-2 justify-end bg-secondary-50">
          <button
            onClick={clearCanvas}
            className="text-xs px-3 py-1.5 border border-secondary-200 rounded-lg text-secondary-600 hover:bg-white transition-colors"
          >
            נקה
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "שומר..." : "שמור חתימה"}
          </button>
        </div>
      )}
    </div>
  );
}
