"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PackagePlus, Plus, X } from "lucide-react";

type ProductCreateDialogProps = {
  action: (formData: FormData) => void | Promise<void>;
  categories: readonly string[];
  tagOptions: readonly string[];
  buttonLabel?: string;
  buttonClassName?: string;
};

export function ProductCreateDialog({
  action,
  categories,
  tagOptions,
  buttonLabel = "新しい商品を追加",
  buttonClassName = "lien-button-primary"
}: ProductCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => firstInputRef.current?.focus(), 50);

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button type="button" className={buttonClassName} onClick={() => setOpen(true)}>
        <PackagePlus className="h-4 w-4" />
        {buttonLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] grid items-end bg-[#2f2a25]/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="flex max-h-[calc(100dvh-0.75rem)] w-full flex-col overflow-hidden rounded-t-[26px] border border-lien bg-[#fffdfa] shadow-[0_28px_80px_rgba(47,42,37,0.22)] sm:mx-auto sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-3xl sm:rounded-[26px]"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-lien bg-white px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lien-soft text-lien-primary">
                  <PackagePlus className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-lien-primary">商品マスタ登録</p>
                  <h2 id={titleId} className="mt-0.5 text-lg font-semibold text-lien-ink">
                    新しい商品を商品棚へ追加
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-lien-muted sm:text-sm">
                    価格と在庫は、会計の商品選択にも反映されます。
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-lien bg-white text-lien-muted transition hover:bg-lien-soft hover:text-lien-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E9C9BE]/60"
                aria-label="商品登録を閉じる"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form action={action} className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              <div className="grid gap-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-lien-ink">
                    メーカー名 <span className="text-xs font-normal text-lien-muted">必須</span>
                    <input
                      ref={firstInputRef}
                      name="manufacturerName"
                      className="lien-input"
                      placeholder="例: ミルボン"
                      maxLength={80}
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-lien-ink">
                    商品名 <span className="text-xs font-normal text-lien-muted">必須</span>
                    <input
                      name="name"
                      className="lien-input"
                      placeholder="例: オージュア クエンチ シャンプー"
                      maxLength={140}
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-lien-ink">
                    カテゴリ <span className="text-xs font-normal text-lien-muted">必須</span>
                    <select name="category" defaultValue="" className="lien-input" required>
                      <option value="" disabled>
                        カテゴリを選択
                      </option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-lien-ink">
                    店頭価格 <span className="text-xs font-normal text-lien-muted">必須</span>
                    <input
                      name="retailPrice"
                      className="lien-input tabular-nums"
                      type="number"
                      min="1"
                      max="10000000"
                      step="1"
                      inputMode="numeric"
                      placeholder="例: 3300"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-lien-ink">
                    在庫数 <span className="text-xs font-normal text-lien-muted">必須</span>
                    <input
                      name="stockQuantity"
                      className="lien-input tabular-nums"
                      type="number"
                      min="0"
                      max="100000"
                      step="1"
                      inputMode="numeric"
                      defaultValue="0"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-lien-ink">
                    独自タグ
                    <input
                      name="concernTags"
                      className="lien-input"
                      placeholder="例: 細毛、熱ダメージ（読点区切り）"
                      maxLength={300}
                    />
                  </label>
                </div>

                <fieldset className="grid gap-3">
                  <legend className="text-sm font-semibold text-lien-ink">よく使う悩み・効果タグ</legend>
                  <div className="flex flex-wrap gap-2">
                    {tagOptions.map((tag) => (
                      <label key={tag} className="cursor-pointer">
                        <input type="checkbox" name="concernTags" value={tag} className="peer sr-only" />
                        <span className="inline-flex min-h-10 items-center rounded-full border border-lien bg-white px-3 text-xs font-semibold text-lien-muted transition peer-checked:border-lien-primary peer-checked:bg-[#fff2ed] peer-checked:text-lien-primary-dark peer-focus-visible:ring-4 peer-focus-visible:ring-[#E9C9BE]/50">
                          {tag}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="grid gap-2 text-sm font-semibold text-lien-ink">
                  商品説明・提案時の補足
                  <textarea
                    name="description"
                    className="lien-input min-h-28 resize-y py-3 leading-6"
                    placeholder="商品の特徴、向いている髪質、スタッフが提案時に伝えたい内容など"
                    maxLength={1200}
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-lien-ink">
                  この商品が合わない場合の代替提案
                  <input
                    name="alternativeRecommendation"
                    className="lien-input"
                    placeholder="例: 重く感じる場合は、スムースタイプを提案"
                    maxLength={180}
                  />
                  <span className="text-xs font-normal leading-5 text-lien-muted">
                    接客時に次の候補として案内する商品名や提案理由を入力します。
                  </span>
                </label>
              </div>

              <footer className="sticky bottom-0 -mx-5 mt-6 flex gap-3 border-t border-lien bg-[#fffdfa]/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:-mx-6 sm:px-6">
                <button type="button" onClick={() => setOpen(false)} className="lien-button-secondary flex-1 sm:flex-none">
                  キャンセル
                </button>
                <button type="submit" className="lien-button-primary flex-1 sm:ml-auto sm:flex-none">
                  <Plus className="h-4 w-4" />
                  商品を登録
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
