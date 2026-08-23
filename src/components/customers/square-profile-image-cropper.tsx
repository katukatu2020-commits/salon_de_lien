"use client";

import { Check, LoaderCircle, Move, RotateCcw, X, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { calculateSquareCropRegion } from "@/lib/image/square-crop";

const OUTPUT_SIZE = 720;

function drawCrop(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  positionX: number,
  positionY: number,
  zoom: number
) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("画像編集を開始できませんでした。");

  const region = calculateSquareCropRegion({
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight,
    positionX,
    positionY,
    zoom
  });

  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  context.fillStyle = "#f6efe6";
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.drawImage(
    image,
    region.sourceX,
    region.sourceY,
    region.sourceSize,
    region.sourceSize,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );
}

export function SquareProfileImageCropper({
  file,
  onCancel,
  onConfirm
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [positionX, setPositionX] = useState(50);
  const [positionY, setPositionY] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const renderPreview = useCallback(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas || !ready) return;
    drawCrop(image, canvas, positionX, positionY, zoom);
  }, [positionX, positionY, ready, zoom]);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setReady(true);
      setError("");
    };
    image.onerror = () => setError("この画像を読み込めませんでした。JPG、PNG、WebPを選択してください。");
    image.src = objectUrl;

    return () => {
      imageRef.current = null;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onCancel]);

  async function confirmCrop() {
    const canvas = canvasRef.current;
    if (!canvas || !ready || processing) return;
    setProcessing(true);
    setError("");

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error("画像を書き出せませんでした。"))),
          "image/jpeg",
          0.9
        );
      });
      const baseName = file.name.replace(/\.[^.]+$/, "") || "profile";
      onConfirm(new File([blob], `${baseName}-square.jpg`, { type: "image/jpeg", lastModified: Date.now() }));
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : "画像を切り抜けませんでした。");
      setProcessing(false);
    }
  }

  function resetPosition() {
    setPositionX(50);
    setPositionY(50);
    setZoom(1);
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/45 p-4 backdrop-blur-sm sm:grid sm:place-items-center" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-crop-title"
        className="mx-auto w-full max-w-lg overflow-hidden rounded-[24px] border border-[#e8ded2] bg-white shadow-[0_24px_80px_rgba(47,42,37,0.24)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#eee5dc] px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-[#8f4f42]">プロフィールアイコン</p>
            <h2 id="profile-crop-title" className="mt-1 text-lg font-semibold text-[#2f2a25]">
              正方形に切り抜く
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#7c7168]">位置と拡大率を調整して、表示範囲を決めてください。</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onCancel}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#e8ded2] bg-white text-[#5b5149] transition hover:bg-[#f6efe6] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]/60"
            aria-label="画像編集を閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-5 p-5">
          <div className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-[20px] border border-[#e8ded2] bg-[#f6efe6] shadow-inner">
            <canvas ref={canvasRef} className="h-full w-full" aria-label="プロフィール画像の切り抜きプレビュー" />
            {!ready && !error ? (
              <div className="absolute inset-0 grid place-items-center text-sm text-[#7c7168]">
                <LoaderCircle className="h-6 w-6 animate-spin" />
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 rounded-[18px] bg-[#f8f3ed] p-4">
            <label className="grid gap-2 text-xs font-semibold text-[#4f463f]">
              <span className="flex items-center gap-2"><ZoomIn className="h-4 w-4" />拡大率</span>
              <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="h-11 w-full accent-[#8f4f42]" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-xs font-semibold text-[#4f463f]">
                <span className="flex items-center gap-2"><Move className="h-4 w-4" />左右</span>
                <input type="range" min="0" max="100" value={positionX} onChange={(event) => setPositionX(Number(event.target.value))} className="h-11 w-full accent-[#8f4f42]" />
              </label>
              <label className="grid gap-2 text-xs font-semibold text-[#4f463f]">
                <span className="flex items-center gap-2"><Move className="h-4 w-4 rotate-90" />上下</span>
                <input type="range" min="0" max="100" value={positionY} onChange={(event) => setPositionY(Number(event.target.value))} className="h-11 w-full accent-[#8f4f42]" />
              </label>
            </div>
          </div>

          {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button type="button" onClick={resetPosition} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#e8ded2] bg-white px-5 text-sm font-semibold text-[#4f463f] transition hover:bg-[#f6efe6]">
              <RotateCcw className="h-4 w-4" />中央に戻す
            </button>
            <button type="button" onClick={confirmCrop} disabled={!ready || processing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#8f4f42] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7d453a] disabled:cursor-wait disabled:opacity-60">
              {processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {processing ? "切り抜き中..." : "この範囲で決定"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
