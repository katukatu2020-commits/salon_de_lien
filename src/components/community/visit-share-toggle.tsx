"use client";

import { Globe2, Loader2, LockKeyhole } from "lucide-react";
import { useState } from "react";

export function VisitShareToggle({
  visitId,
  initialPublished,
  canShare
}: {
  visitId: string;
  initialPublished: boolean;
  canShare: boolean;
}) {
  const [published, setPublished] = useState(initialPublished);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function updateSharing(nextPublished: boolean) {
    if (pending || (nextPublished && !canShare)) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/customer/community/visits/${visitId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: nextPublished })
      });
      const result = (await response.json().catch(() => null)) as { error?: string; published?: boolean } | null;
      if (!response.ok) throw new Error(result?.error || "共有設定を変更できませんでした。");
      setPublished(Boolean(result?.published));
      setMessage(nextPublished ? "スタイル共有へ投稿しました。" : "投稿を非公開にしました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "共有設定を変更できませんでした。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-[#e8ded2] bg-[#fffdf9] p-3">
      <label className={`flex min-h-11 items-center gap-3 ${canShare ? "cursor-pointer" : "cursor-not-allowed opacity-65"}`}>
        <input
          type="checkbox"
          checked={published}
          disabled={pending || !canShare}
          onChange={(event) => void updateSharing(event.target.checked)}
          className="peer sr-only"
        />
        <span className="relative h-7 w-12 shrink-0 rounded-full bg-[#d9d0c8] transition peer-checked:bg-[#8f4f42] peer-focus-visible:ring-4 peer-focus-visible:ring-[#e9c9be]/70 after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:after:translate-x-5" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-semibold text-[#2f2a25]">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : published ? <Globe2 className="h-4 w-4 text-[#8f4f42]" /> : <LockKeyhole className="h-4 w-4 text-[#8b8178]" />}
            スタイル共有に公開する
          </span>
          <span className="mt-1 block text-xs leading-5 text-[#7c7168]">
            {canShare ? "メニュー・担当者・施術後写真を同じ店舗の利用者へ共有します。" : "施術後写真が追加されると共有できます。"}
          </span>
        </span>
      </label>
      {message ? <p className="mt-2 text-xs font-medium text-[#8f4f42]" role="status">{message}</p> : null}
    </div>
  );
}
