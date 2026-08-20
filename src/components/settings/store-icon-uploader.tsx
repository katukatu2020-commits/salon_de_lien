"use client";

import { ImagePlus, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { uploadOrganizationIconAction } from "@/lib/actions";

type StoreIconState = {
  ok: boolean;
  message: string;
  imageUrl?: string;
  cacheKey?: number;
};

const initialState: StoreIconState = { ok: false, message: "" };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--lien-primary)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--lien-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "保存中..." : "店舗画像を保存"}
    </button>
  );
}

export function StoreIconUploader({ imageUrl }: { imageUrl: string | null }) {
  const [state, formAction] = useFormState(uploadOrganizationIconAction, initialState);
  const [previewUrl, setPreviewUrl] = useState(imageUrl ?? "");
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (!state.ok || !state.imageUrl) return;
    setPreviewUrl(`${state.imageUrl}${state.imageUrl.includes("?") ? "&" : "?"}v=${state.cacheKey ?? Date.now()}`);
    setFileName("");
  }, [state]);

  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-[7rem_1fr] sm:items-center">
      <div
        role="img"
        aria-label="現在の店舗アイコン"
        className="grid h-28 w-28 place-items-center overflow-hidden rounded-[24px] border border-[color:var(--lien-border)] bg-[color:var(--lien-surface-soft)] bg-cover bg-center text-[color:var(--lien-primary-dark)] shadow-sm"
        style={previewUrl ? { backgroundImage: `url(${JSON.stringify(previewUrl).slice(1, -1)})` } : undefined}
      >
        {!previewUrl ? <Store className="h-9 w-9" /> : null}
      </div>

      <form action={formAction} encType="multipart/form-data" className="grid gap-3">
        <div>
          <p className="text-sm font-semibold text-[color:var(--lien-ink)]">店舗プロフィール画像</p>
          <p className="mt-1 text-xs leading-5 text-[color:var(--lien-muted)]">
            店舗一覧やお客様画面に表示する店舗固有の画像です。左上のSalon de Lienサービスロゴは変更されません。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-[color:var(--lien-border)] bg-white px-4 text-sm font-semibold text-[color:var(--lien-ink)] shadow-sm transition hover:bg-[color:var(--lien-surface-soft)]">
            <ImagePlus className="h-4 w-4" />
            画像を選ぶ
            <input
              type="file"
              name="storeIcon"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              required
              onChange={(event) => {
                const file = event.target.files?.[0];
                setFileName(file?.name ?? "");
                if (file) setPreviewUrl(URL.createObjectURL(file));
              }}
            />
          </label>
          <SaveButton />
        </div>
        {fileName ? <p className="truncate text-xs text-[color:var(--lien-muted)]">選択中: {fileName}</p> : null}
        <p className="text-xs text-[color:var(--lien-muted)]">JPG / PNG / WebP、5MB以下</p>
        {state.message ? (
          <p className={`text-sm font-semibold ${state.ok ? "text-emerald-700" : "text-red-700"}`} role="status">
            {state.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
