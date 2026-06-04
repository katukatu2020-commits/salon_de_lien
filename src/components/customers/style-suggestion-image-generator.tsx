"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { generateStyleSuggestionImageAction } from "@/lib/actions";
import { ProgressFlow } from "@/components/ui/progress-flow";

type ImageGenerationStatus = "idle" | "running" | "success" | "error";

const STEPS = [
  "3方向参照写真を確認中",
  "髪型プロンプトを準備中",
  "斜め正面イメージを生成中",
  "横イメージを生成中",
  "斜め後ろイメージを生成中",
  "画像を保存中",
  "完了"
];

function stepForProgress(progress: number) {
  if (progress >= 100) {
    return STEPS[6];
  }
  if (progress >= 90) {
    return STEPS[5];
  }
  if (progress >= 70) {
    return STEPS[4];
  }
  if (progress >= 50) {
    return STEPS[3];
  }
  if (progress >= 30) {
    return STEPS[2];
  }
  if (progress >= 15) {
    return STEPS[1];
  }
  return STEPS[0];
}

export function StyleSuggestionImageGenerator({
  styleSuggestionId,
  customerId,
  disabled = false,
  disabledReason
}: {
  styleSuggestionId: string;
  customerId: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<ImageGenerationStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const currentStep = useMemo(() => stepForProgress(progress), [progress]);

  useEffect(() => {
    if (status !== "running") {
      return;
    }

    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(current + (current < 30 ? 4 : current < 70 ? 3 : 1), 94));
    }, 520);

    return () => window.clearInterval(timer);
  }, [status]);

  function runImageGeneration() {
    if (disabled) {
      return;
    }

    setStatus("running");
    setProgress(5);
    setMessage("");

    startTransition(() => {
      void (async () => {
        const result = await generateStyleSuggestionImageAction(styleSuggestionId, customerId, {
          ok: false,
          message: ""
        });

        if (result.ok) {
          setProgress(100);
          setStatus("success");
          setMessage(result.message);
          router.replace(`/customers/${customerId}?suggestionId=${result.selectedSuggestionId ?? styleSuggestionId}`, {
            scroll: false
          });
          router.refresh();
          return;
        }

        setStatus("error");
        setMessage(result.message);
      })().catch((error: unknown) => {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "画像生成に失敗しました。");
      });
    });
  }

  const isRunning = isPending || status === "running";
  const buttonDisabled = disabled || isRunning;
  const buttonLabel = isRunning
    ? "生成中..."
    : disabledReason
      ? "生成不可"
      : disabled
        ? "3方向画像を生成済み"
        : "3方向画像を生成";

  return (
    <div className="grid gap-3 rounded-md border border-teal-100 bg-teal-50 p-3 sm:grid-cols-[1fr_auto] sm:items-start">
      <div className="text-sm leading-6 text-teal-950">
        <p>本人写真と顔型・骨格バランスの印象を参考にした、相談用の角度別イメージを作成します。</p>
        <p className="mt-1 text-xs font-semibold text-teal-900">
          本人らしさを最優先して髪型のみを変えるモードです。生成結果が本人から離れて見える場合は、参照写真を撮り直すか、再生成してください。
        </p>
        <ul className="mt-2 grid gap-1 text-xs text-teal-800">
          <li>・背景・ライティングは比較しやすいよう統一して生成されます。</li>
          <li>・参照写真の不足部分は、他の角度を参考に最小限だけ補完されます。</li>
          <li>・顔の骨格・目鼻口・耳・首・頭部形状は、元写真の印象を優先します。</li>
        </ul>
        <p className="mt-1 text-xs text-teal-800">画像生成にはAPI利用料が発生します。必要な提案だけ生成してください。</p>
      </div>
      <div className="grid gap-2 sm:justify-items-end">
        <button
          type="button"
          disabled={buttonDisabled}
          onClick={runImageGeneration}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ImagePlus className="h-4 w-4" />
          {buttonLabel}
        </button>
        {disabledReason ? <p className="text-xs font-semibold text-red-700">{disabledReason}</p> : null}
      </div>
      <div className="sm:col-span-2">
        <ProgressFlow
          active={status !== "idle"}
          status={status}
          progress={progress}
          currentStep={currentStep}
          steps={STEPS}
          errorMessage={message}
        />
        {message && status !== "running" ? (
          <p className={`mt-2 text-xs font-semibold ${status === "success" ? "text-emerald-700" : "text-red-700"}`}>
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
