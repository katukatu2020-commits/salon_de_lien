"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Brush, Eraser, Palette, RotateCcw, SlidersHorizontal } from "lucide-react";

export type HairColorPreviewImage = {
  angle: string;
  url: string;
};

type PaintMode = "paint" | "erase";

type MaskEllipse = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotation?: number;
  blur?: number;
  alpha?: number;
};

const MASK_CANVAS_WIDTH = 900;
const MASK_CANVAS_HEIGHT = 675;

const COLOR_PRESETS = [
  { name: "ナチュラルブラック", value: "#1f1a17" },
  { name: "ダークブラウン", value: "#473226" },
  { name: "アッシュブラウン", value: "#746858" },
  { name: "ベージュ", value: "#b89367" },
  { name: "オリーブ", value: "#6f7359" },
  { name: "カッパー", value: "#a65334" },
  { name: "ピンクベージュ", value: "#b87a76" },
  { name: "シルバー", value: "#a7a8a3" }
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized,
    16
  );

  if (Number.isNaN(value)) {
    return { r: 91, g: 65, b: 45 };
  }

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function colorLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function maskPreset(angle: string, index: number): MaskEllipse[] {
  if (angle.includes("横") || index === 1) {
    return [
      { cx: 0.52, cy: 0.31, rx: 0.24, ry: 0.27, rotation: -0.08, blur: 28, alpha: 0.95 },
      { cx: 0.45, cy: 0.25, rx: 0.19, ry: 0.13, rotation: -0.1, blur: 18, alpha: 0.75 },
      { cx: 0.59, cy: 0.45, rx: 0.17, ry: 0.18, rotation: 0.08, blur: 24, alpha: 0.55 }
    ];
  }

  if (angle.includes("後ろ") || index === 2) {
    return [
      { cx: 0.5, cy: 0.36, rx: 0.32, ry: 0.31, blur: 30, alpha: 0.95 },
      { cx: 0.5, cy: 0.24, rx: 0.27, ry: 0.13, blur: 22, alpha: 0.7 },
      { cx: 0.5, cy: 0.57, rx: 0.24, ry: 0.12, blur: 26, alpha: 0.42 }
    ];
  }

  return [
    { cx: 0.5, cy: 0.31, rx: 0.29, ry: 0.27, blur: 30, alpha: 0.95 },
    { cx: 0.5, cy: 0.21, rx: 0.24, ry: 0.13, blur: 20, alpha: 0.72 },
    { cx: 0.37, cy: 0.42, rx: 0.12, ry: 0.18, rotation: 0.2, blur: 22, alpha: 0.48 },
    { cx: 0.63, cy: 0.42, rx: 0.12, ry: 0.18, rotation: -0.2, blur: 22, alpha: 0.48 }
  ];
}

function drawEllipse(ctx: CanvasRenderingContext2D, ellipse: MaskEllipse) {
  ctx.save();
  ctx.globalAlpha = ellipse.alpha ?? 1;
  ctx.fillStyle = "#fff";
  ctx.filter = `blur(${ellipse.blur ?? 18}px)`;
  ctx.translate(ellipse.cx * MASK_CANVAS_WIDTH, ellipse.cy * MASK_CANVAS_HEIGHT);
  ctx.rotate(ellipse.rotation ?? 0);
  ctx.beginPath();
  ctx.ellipse(
    0,
    0,
    ellipse.rx * MASK_CANVAS_WIDTH,
    ellipse.ry * MASK_CANVAS_HEIGHT,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

function drawPresetMask(canvas: HTMLCanvasElement, angle: string, index: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, MASK_CANVAS_WIDTH, MASK_CANVAS_HEIGHT);
  maskPreset(angle, index).forEach((ellipse) => drawEllipse(ctx, ellipse));
  ctx.filter = "none";
}

function pointerPosition(event: ReactPointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * MASK_CANVAS_WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * MASK_CANVAS_HEIGHT
  };
}

function paintMask(
  event: ReactPointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
  mode: PaintMode,
  brushSize: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const { x, y } = pointerPosition(event, canvas);
  const radius = clamp(brushSize, 12, 96);

  ctx.save();
  ctx.globalCompositeOperation = mode === "paint" ? "source-over" : "destination-out";
  ctx.globalAlpha = mode === "paint" ? 0.85 : 0.95;
  ctx.filter = `blur(${Math.max(5, radius * 0.18)}px)`;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.filter = "none";
}

function HairColorPreviewCard({
  image,
  index,
  color,
  strength,
  mode,
  brushSize,
  resetVersion
}: {
  image: HairColorPreviewImage;
  index: number;
  color: string;
  strength: number;
  mode: PaintMode;
  brushSize: number;
  resetVersion: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [maskDataUrl, setMaskDataUrl] = useState("");
  const normalizedStrength = strength / 100;
  const luminance = colorLuminance(color);
  const colorLayerOpacity = clamp(normalizedStrength, 0.15, 0.95);
  const shadowOpacity = clamp((0.48 - luminance) * normalizedStrength * 0.65, 0, 0.22);
  const highlightOpacity = clamp((luminance - 0.62) * normalizedStrength * 0.45, 0, 0.18);

  const maskStyle: CSSProperties = maskDataUrl
    ? {
        WebkitMaskImage: `url(${maskDataUrl})`,
        maskImage: `url(${maskDataUrl})`,
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%"
      }
    : {};

  const colorLayerStyle: CSSProperties = {
    ...maskStyle,
    backgroundColor: color,
    mixBlendMode: "color",
    opacity: colorLayerOpacity
  };

  const shadowLayerStyle: CSSProperties = {
    ...maskStyle,
    backgroundColor: color,
    mixBlendMode: "multiply",
    opacity: shadowOpacity
  };

  const highlightLayerStyle: CSSProperties = {
    ...maskStyle,
    backgroundColor: "#fff",
    mixBlendMode: "screen",
    opacity: highlightOpacity
  };

  function updateMaskDataUrl() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    setMaskDataUrl(canvas.toDataURL("image/png"));
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.width = MASK_CANVAS_WIDTH;
    canvas.height = MASK_CANVAS_HEIGHT;
    drawPresetMask(canvas, image.angle, index);
    updateMaskDataUrl();
  }, [image.angle, image.url, index, resetVersion]);

  function startDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    isDrawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    paintMask(event, event.currentTarget, mode, brushSize);
    updateMaskDataUrl();
  }

  function draw(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) {
      return;
    }

    event.preventDefault();
    paintMask(event, event.currentTarget, mode, brushSize);
    updateMaskDataUrl();
  }

  function stopDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) {
      return;
    }

    isDrawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    updateMaskDataUrl();
  }

  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
      <div className="relative aspect-[4/3] bg-[#ede7dc]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.url} alt={`${image.angle} 髪色プレビュー`} draggable={false} className="h-full w-full select-none object-cover" />
        <div className="pointer-events-none absolute inset-0" style={colorLayerStyle} />
        <div className="pointer-events-none absolute inset-0" style={shadowLayerStyle} />
        <div className="pointer-events-none absolute inset-0" style={highlightLayerStyle} />
        <canvas
          ref={canvasRef}
          aria-label={`${image.angle} の髪色範囲`}
          className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onPointerLeave={stopDrawing}
        />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-stone-200 px-3 py-2">
        <p className="text-xs font-semibold text-stone-700">{image.angle}</p>
        <p className="text-[11px] font-semibold text-stone-500">{mode === "paint" ? "塗る" : "消す"}</p>
      </div>
    </div>
  );
}

export function HairColorAdjustmentPanel({
  images,
  title = "髪色プレビュー"
}: {
  images: HairColorPreviewImage[];
  title?: string;
}) {
  const normalizedImages = useMemo(() => {
    const seen = new Set<string>();
    return images
      .filter((image) => image.url.trim())
      .filter((image) => {
        if (seen.has(image.url)) {
          return false;
        }

        seen.add(image.url);
        return true;
      })
      .slice(0, 3);
  }, [images]);
  const [color, setColor] = useState<string>(COLOR_PRESETS[1].value);
  const [strength, setStrength] = useState(78);
  const [brushSize, setBrushSize] = useState(42);
  const [mode, setMode] = useState<PaintMode>("paint");
  const [resetVersion, setResetVersion] = useState(0);

  if (normalizedImages.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-3 rounded-md border border-stone-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-stone-950">
          <Palette className="h-4 w-4 text-teal-800" />
          {title}
        </h4>
        <button
          type="button"
          onClick={() => setResetVersion((current) => current + 1)}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          リセット
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-md border border-stone-200 bg-stone-50">
          <button
            type="button"
            title="髪の範囲を塗る"
            aria-label="髪の範囲を塗る"
            onClick={() => setMode("paint")}
            className={`inline-flex h-9 items-center gap-2 px-3 text-xs font-semibold ${
              mode === "paint" ? "bg-teal-900 text-white" : "bg-white text-stone-700 hover:bg-stone-100"
            }`}
          >
            <Brush className="h-3.5 w-3.5" />
            塗る
          </button>
          <button
            type="button"
            title="髪以外の範囲を消す"
            aria-label="髪以外の範囲を消す"
            onClick={() => setMode("erase")}
            className={`inline-flex h-9 items-center gap-2 border-l border-stone-200 px-3 text-xs font-semibold ${
              mode === "erase" ? "bg-teal-900 text-white" : "bg-white text-stone-700 hover:bg-stone-100"
            }`}
          >
            <Eraser className="h-3.5 w-3.5" />
            消す
          </button>
        </div>

        <label className="flex h-9 min-w-[190px] flex-1 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700">
          <SlidersHorizontal className="h-3.5 w-3.5 text-stone-500" />
          濃さ
          <input
            type="range"
            min="25"
            max="100"
            value={strength}
            onChange={(event) => setStrength(Number(event.target.value))}
            className="min-w-0 flex-1 accent-teal-800"
          />
          <span className="w-9 text-right tabular-nums">{strength}%</span>
        </label>

        <label className="flex h-9 min-w-[180px] flex-1 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700">
          <Brush className="h-3.5 w-3.5 text-stone-500" />
          サイズ
          <input
            type="range"
            min="18"
            max="88"
            value={brushSize}
            onChange={(event) => setBrushSize(Number(event.target.value))}
            className="min-w-0 flex-1 accent-teal-800"
          />
          <span className="w-8 text-right tabular-nums">{brushSize}</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            title={preset.name}
            aria-label={preset.name}
            onClick={() => setColor(preset.value)}
            className={`h-8 w-8 rounded-full border shadow-sm transition ${
              color === preset.value ? "border-teal-900 ring-2 ring-teal-200" : "border-white ring-1 ring-stone-200"
            }`}
            style={{ backgroundColor: preset.value }}
          />
        ))}
        <label className="inline-flex h-9 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700">
          <span>自由色</span>
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            aria-label="自由に髪色を選択"
            className="h-6 w-8 cursor-pointer rounded border border-stone-200 bg-white p-0"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {normalizedImages.map((image, index) => (
          <HairColorPreviewCard
            key={`${image.angle}-${image.url}`}
            image={image}
            index={index}
            color={color}
            strength={strength}
            mode={mode}
            brushSize={brushSize}
            resetVersion={resetVersion}
          />
        ))}
      </div>
    </section>
  );
}
