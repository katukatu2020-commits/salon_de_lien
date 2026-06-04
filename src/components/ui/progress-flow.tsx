"use client";

type ProgressFlowProps = {
  active: boolean;
  status: "idle" | "running" | "success" | "error";
  progress: number;
  currentStep: string;
  steps: string[];
  errorMessage?: string;
};

export function ProgressFlow({
  active,
  status,
  progress,
  currentStep,
  steps,
  errorMessage
}: ProgressFlowProps) {
  if (!active && status === "idle") {
    return null;
  }

  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const tone =
    status === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : status === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-teal-100 bg-white/80 text-teal-950";
  const barTone = status === "error" ? "bg-red-600" : status === "success" ? "bg-emerald-600" : "bg-teal-900";

  return (
    <div className={`rounded-md border p-3 shadow-sm ${tone}`} aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold">
        <span>{status === "success" ? "完了しました" : status === "error" ? "処理を完了できませんでした" : currentStep}</span>
        <span>{clampedProgress}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barTone}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      <div className="mt-2 text-xs leading-5 opacity-90">
        {status === "error" ? errorMessage : `現在: ${currentStep}`}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {steps.map((step) => (
          <span
            key={step}
            className={`rounded-full px-2 py-0.5 text-[11px] ${
              step === currentStep ? "bg-white font-semibold shadow-sm" : "bg-white/50"
            }`}
          >
            {step}
          </span>
        ))}
      </div>
    </div>
  );
}
