"use client";

type ProgressFlowProps = {
  active: boolean;
  status: "idle" | "running" | "success" | "error";
  progress: number;
  currentStep: string;
  steps: string[];
  errorMessage?: string;
};

export function ProgressFlow({ active, status, progress, currentStep, errorMessage }: ProgressFlowProps) {
  if (!active && status === "idle") {
    return null;
  }

  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const label =
    status === "success"
      ? "完了しました"
      : status === "error"
        ? "失敗しました"
        : currentStep;
  const tone =
    status === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : status === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-teal-100 bg-teal-50 text-teal-950";
  const barTone = status === "error" ? "bg-red-600" : status === "success" ? "bg-emerald-600" : "bg-teal-700";

  return (
    <div className={`rounded-md border p-3 ${tone}`} aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm font-semibold">
        <span>{label}</span>
        <span>{clampedProgress}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barTone}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-5 opacity-80">
        {status === "error" ? errorMessage : status === "success" ? "画面を更新しました。" : "処理中です。完了までこの画面で待ってください。"}
      </p>
    </div>
  );
}
