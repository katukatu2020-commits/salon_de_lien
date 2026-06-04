"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw, WandSparkles } from "lucide-react";
import {
  createAiStyleSuggestion,
  regenerateStyleSuggestionsAction
} from "@/lib/actions";
import { ProgressFlow } from "@/components/ui/progress-flow";

type GenerationStatus = "idle" | "running" | "success" | "error";

const STEPS = [
  "カルテ情報を読み込み中",
  "髪質・好み・NG条件を整理中",
  "本命・安全・挑戦の3案を作成中",
  "提案を保存中",
  "完了"
];

function stepForProgress(progress: number) {
  if (progress >= 100) {
    return STEPS[4];
  }
  if (progress >= 75) {
    return STEPS[3];
  }
  if (progress >= 50) {
    return STEPS[2];
  }
  if (progress >= 25) {
    return STEPS[1];
  }
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
  const currentStep = useMemo(() => stepForProgress(progress), [progress]);

  useEffect(() => {
    if (status !== "running") {
      return;
    }

    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(current + (current < 50 ? 5 : current < 80 ? 3 : 1), 92));
    }, 420);

    return () => window.clearInterval(timer);
  }, [status]);

  function runGeneration(mode: "create" | "regenerate") {
    if (mode === "regenerate") {
      const confirmed = window.confirm(
        "未採用のAI提案を整理し、新しく3案を作成します。\n採用候補にした提案は残ります。\nよろしいですか？"
      );

      if (!confirmed) {
        return;
      }
    }

    setStatus("running");
    setProgress(8);
    setMessage("");

    startTransition(() => {
      void (async () => {
        const result =
          mode === "regenerate"
            ? await regenerateStyleSuggestionsAction(customerId)
            : await createAiStyleSuggestion(customerId);

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
        setMessage(error instanceof Error ? error.message : "AI髪型提案の生成に失敗しました。");
      });
    });
  }

  const disabled = isPending || status === "running";

  return (
    <div className="mt-3 grid gap-3">
      <div className="flex flex-wrap gap-2">
        {!hasVisibleSuggestions ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => runGeneration("create")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <WandSparkles className="h-4 w-4" />
            {disabled ? "生成中..." : "AIで3案を生成"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={disabled}
          onClick={() => runGeneration("regenerate")}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-teal-200 bg-white px-4 text-sm font-semibold text-teal-950 shadow-sm hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw className="h-4 w-4" />
          {disabled ? "再作成中..." : "3案を再作成"}
        </button>
      </div>
      <ProgressFlow
        active={status !== "idle"}
        status={status}
        progress={progress}
        currentStep={currentStep}
        steps={STEPS}
        errorMessage={message}
      />
      {message && status !== "running" ? (
        <p className={`text-xs font-semibold ${status === "success" ? "text-emerald-700" : "text-red-700"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
