"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, LoaderCircle, RefreshCcw, WandSparkles } from "lucide-react";
import { createAiStyleSuggestion, regenerateStyleSuggestionsAction } from "@/lib/actions";
import { ProgressFlow } from "@/components/ui/progress-flow";

type GenerationStatus = "idle" | "running" | "success" | "error";

const STEPS = ["顧客情報を確認中", "提案を作成中", "保存中", "完了"];

function stepForProgress(progress: number) {
  if (progress >= 100) return STEPS[3];
  if (progress >= 75) return STEPS[2];
  if (progress >= 35) return STEPS[1];
  return STEPS[0];
}

export function StyleSuggestionGenerator({
  customerId,
  hasVisibleSuggestions
}: {
  customerId: string;
  hasVisibleSuggestions: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [activeMode, setActiveMode] = useState<"create" | "regenerate" | null>(null);
  const currentStep = useMemo(() => stepForProgress(progress), [progress]);

  useEffect(() => {
    if (status !== "running") return;

    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(current + (current < 50 ? 5 : current < 80 ? 3 : 1), 92));
    }, 420);

    return () => window.clearInterval(timer);
  }, [status]);

  function runGeneration(mode: "create" | "regenerate") {
    if (mode === "regenerate") {
      const confirmed = window.confirm("未採用の提案を整理して、新しく3案を作成します。続行しますか？");
      if (!confirmed) return;
    }

    setActiveMode(mode);
    setStatus("running");
    setProgress(8);
    setMessage("");

    startTransition(() => {
      void (async () => {
        const result =
          mode === "regenerate" ? await regenerateStyleSuggestionsAction(customerId) : await createAiStyleSuggestion(customerId);

        if (result.ok) {
          setProgress(100);
          setStatus("success");
          setMessage(result.message);

          const nextUrl = result.selectedSuggestionId
            ? `/customers/${customerId}?suggestionId=${result.selectedSuggestionId}`
            : `/customers/${customerId}`;
          router.replace(nextUrl, { scroll: false });
          router.refresh();
          return;
        }

        setStatus("error");
        setMessage(result.message);
      })().catch((error: unknown) => {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "提案の作成に失敗しました。");
      });
    });
  }

  const isRunning = isPending || status === "running";
  const disabled = isRunning;
  const primaryMode: "create" | "regenerate" = hasVisibleSuggestions ? "regenerate" : "create";
  const buttonText = isRunning
    ? `${activeMode === "regenerate" ? "再作成中" : "作成中"} ${Math.round(progress)}%`
    : hasVisibleSuggestions
      ? "提案を再作成"
      : "提案を作成";

  return (
    <div className="mt-3 grid gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => runGeneration(primaryMode)}
        aria-busy={isRunning}
        className={`inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold shadow-sm transition-colors disabled:cursor-wait ${
          status === "success"
            ? "bg-emerald-700 text-white"
            : status === "error"
              ? "bg-red-700 text-white"
              : "bg-teal-900 text-white hover:bg-teal-950 disabled:bg-teal-800"
        }`}
      >
        {isRunning ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : status === "success" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : status === "error" ? (
          <AlertCircle className="h-4 w-4" />
        ) : hasVisibleSuggestions ? (
          <RefreshCcw className="h-4 w-4" />
        ) : (
          <WandSparkles className="h-4 w-4" />
        )}
        {buttonText}
      </button>

      <ProgressFlow active={status !== "idle"} status={status} progress={progress} currentStep={currentStep} steps={STEPS} errorMessage={message} />
      {message && status !== "running" ? (
        <p className={`text-xs font-semibold ${status === "success" ? "text-emerald-700" : "text-red-700"}`}>{message}</p>
      ) : null}
    </div>
  );
}
