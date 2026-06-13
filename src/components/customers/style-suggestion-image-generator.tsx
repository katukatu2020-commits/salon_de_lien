"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ImagePlus, LoaderCircle } from "lucide-react";
import { generateStyleSuggestionImageAction } from "@/lib/actions";
import { ProgressFlow } from "@/components/ui/progress-flow";

type ImageGenerationStatus = "idle" | "running" | "success" | "error";

const STEPS = ["写真を確認中", "髪型画像を生成中", "保存中", "完了"];

function stepForProgress(progress: number) {
  if (progress >= 100) return STEPS[3];
  if (progress >= 80) return STEPS[2];
  if (progress >= 20) return STEPS[1];
  return STEPS[0];
}

export function StyleSuggestionImageGenerator({
  styleSuggestionId,
  customerId,
  disabled = false,
  disabledReason,
  hasLowIdentityScore = false
}: {
  styleSuggestionId: string;
  customerId: string;
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
    if (status !== "running") return;

    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(current + (current < 30 ? 4 : current < 70 ? 3 : 1), 94));
    }, 520);

    return () => window.clearInterval(timer);
  }, [status]);

  function runImageGeneration() {
    if (disabled) return;

    if (hasLowIdentityScore) {
      const confirmed = window.confirm("現在の画像を差し替えて再生成しますか？");
      if (!confirmed) return;
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
    ? `生成中 ${Math.round(progress)}%`
    : disabledReason
      ? "生成できません"
      : "画像を生成";

  return (
    <div className="grid gap-3 rounded-md border border-stone-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-stone-950">髪型画像</p>
        </div>
        <button
          type="button"
          disabled={buttonDisabled}
          onClick={runImageGeneration}
          aria-busy={isRunning}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold shadow-sm transition-colors disabled:cursor-wait ${
            status === "success"
              ? "bg-emerald-700 text-white"
              : status === "error"
                ? "bg-red-700 text-white"
                : "bg-teal-900 text-white hover:bg-teal-950 disabled:bg-teal-800 disabled:opacity-80"
          }`}
        >
          {isRunning ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : status === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : status === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {buttonLabel}
        </button>
      </div>
      {disabledReason ? <p className="text-xs font-semibold text-red-700">{disabledReason}</p> : null}
      <ProgressFlow active={status !== "idle"} status={status} progress={progress} currentStep={currentStep} steps={STEPS} errorMessage={message} />
      {message && status !== "running" ? (
        <p className={`text-xs font-semibold ${status === "success" ? "text-emerald-700" : "text-red-700"}`}>{message}</p>
      ) : null}
    </div>
  );
}
