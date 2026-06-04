"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { generateStyleSuggestionImageAction } from "@/lib/actions";
import { ProgressFlow } from "@/components/ui/progress-flow";

type ImageGenerationStatus = "idle" | "running" | "success" | "error";

const STEPS = [
  "正面・横顔の参照写真を確認中",
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
  providerLabel = "OpenAI fallback",
  disabled = false,
  disabledReason,
  hasLowIdentityScore = false
}: {
  styleSuggestionId: string;
  customerId: string;
  providerLabel?: string;
  disabled?: boolean;
  disabledReason?: string;
  hasLowIdentityScore?: boolean;
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

    if (hasLowIdentityScore) {
      const confirmed = window.confirm(
        "本人らしさが低い画像を再生成します。\n画像生成にはAPI利用料が発生します。\nよろしいですか？"
      );

      if (!confirmed) {
        return;
      }
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
        : hasLowIdentityScore
          ? "本人性を優先して再生成"
        : "3方向画像を生成";
  const isFaceIdEdit = providerLabel.includes("FaceID基準");

  return (
    <div className="grid gap-3 rounded-md border border-teal-100 bg-teal-50 p-3 sm:grid-cols-[1fr_auto] sm:items-start">
      <div className="text-sm leading-6 text-teal-950">
        <p>正面写真と横顔写真を中心に、本人性を高めた相談用の角度別イメージを作成します。</p>
        <p className="mt-1 text-xs font-semibold text-teal-800">生成エンジン: {providerLabel}</p>
        <p className="mt-1 text-xs font-semibold text-teal-900">
          {isFaceIdEdit
            ? "FaceID基準画像を作成した後、顔保護マスクを使って髪周辺だけを編集します。"
            : "本人らしさを最優先し、顔パーツを保ったまま髪型のみを変更する方針で生成します。"}
          生成画像は相談用の参考であり、本人性や仕上がりを完全に保証するものではありません。
        </p>
        <ul className="mt-2 grid gap-1 text-xs text-teal-800">
          <li>・背景・ライティングは比較しやすいよう統一して生成されます。</li>
          <li>・参照写真の不足部分は、他の登録写真を参考に最小限だけ補完されます。</li>
          <li>・顔の骨格・目鼻口・耳・首・頭部形状は、元写真の印象を優先します。</li>
          {isFaceIdEdit ? <li>・顔パーツを保護するため、マスク生成に失敗した場合は編集を中止します。</li> : null}
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
