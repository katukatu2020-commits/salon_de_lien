"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { ImagePlus } from "lucide-react";
import { generateStyleSuggestionImageAction } from "@/lib/actions";

type ImageGenerationState = {
  ok: boolean;
  message: string;
  imageUrls?: string[];
};

const initialState: ImageGenerationState = {
  ok: false,
  message: ""
};

function GenerateButton({ disabled, disabledReason }: { disabled: boolean; disabledReason?: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-950 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <ImagePlus className="h-4 w-4" />
      {pending
        ? "生成中..."
        : disabledReason
          ? "生成不可"
          : disabled
            ? "3方向画像を生成済み"
            : "3方向参照写真からシミュレーション生成"}
    </button>
  );
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
  const [state, formAction] = useFormState(
    generateStyleSuggestionImageAction.bind(null, styleSuggestionId, customerId),
    initialState
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  return (
    <form action={formAction} className="grid gap-2 rounded-md border border-teal-100 bg-teal-50 p-3 sm:flex sm:items-center sm:justify-between">
      <p className="text-sm leading-6 text-teal-950">
        本人写真と顔型・骨格バランスの印象を参考にした、相談用の角度別イメージを作成します。
        <span className="mt-1 block text-xs text-teal-800">画像生成にはAPI利用料が発生します。必要な提案だけ生成してください。</span>
      </p>
      <div className="grid gap-2 sm:justify-items-end">
        <GenerateButton disabled={disabled} disabledReason={disabledReason} />
        {disabledReason ? <p className="text-xs font-semibold text-red-700">{disabledReason}</p> : null}
        {state.message ? (
          <p className={`text-xs font-semibold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
