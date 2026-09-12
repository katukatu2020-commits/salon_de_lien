"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

export function CommunityOrderControl({ postId, displayOrder }: { postId: string; displayOrder: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(displayOrder));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(String(displayOrder));
  }, [displayOrder]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestedOrder = Number(value);
    if (!Number.isInteger(requestedOrder) || requestedOrder < 1) {
      setError("1以上の整数を入力してください。");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/community/posts/${encodeURIComponent(postId)}/order`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayOrder: requestedOrder })
      });
      const payload = await response.json().catch(() => ({})) as { displayOrder?: number; error?: string };
      if (!response.ok) throw new Error(payload.error || "表示順を変更できませんでした。");
      setValue(String(payload.displayOrder));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "表示順を変更できませんでした。");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-[#eee4dc] bg-white p-2">
      <label className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 rounded-md border border-[#dacec4] bg-[#faf8f6] px-2 text-[11px] font-bold text-[#665a52]">
        <span>No.</span>
        <input aria-label="表示するNo" type="number" min={1} step={1} required value={value} onChange={(event) => setValue(event.target.value)} className="h-9 min-w-0 bg-transparent text-right text-sm outline-none" />
      </label>
      <button type="submit" disabled={pending} className="min-h-10 rounded-md border border-[#dacec4] px-3 text-xs font-bold text-[#8f4058] disabled:opacity-50">移動</button>
      {error ? <p role="alert" className="col-span-2 text-xs text-red-700">{error}</p> : null}
    </form>
  );
}
