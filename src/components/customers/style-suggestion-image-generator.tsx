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

function GenerateButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-teal-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-950 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <ImagePlus className="h-4 w-4" />
      {pending ? "生成中..." : "本人写真で画像生成"}
    </button>
  );
}

export function StyleSuggestionImageGenerator({
  styleSuggestionId,
  customerId
}: {
  styleSuggestionId: string;
  customerId: string;
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
        プロフィール写真を使って、この提案の本人ベース画像を生成します。
      </p>
      <div className="grid gap-2 sm:justify-items-end">
        <GenerateButton />
        {state.message ? (
          <p className={`text-xs font-semibold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
