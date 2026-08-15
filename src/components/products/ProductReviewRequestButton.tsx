"use client";

import { useState, useTransition } from "react";
import { Copy, Link2, Loader2 } from "lucide-react";

type ProductReviewRequestButtonProps = {
  proposalId: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

export function ProductReviewRequestButton({ proposalId }: ProductReviewRequestButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [reviewUrl, setReviewUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function issueReviewRequest() {
    setError("");
    setCopied(false);

    startTransition(async () => {
      const response = await fetch(`/api/admin/product-proposals/${proposalId}/review-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      const data = (await response.json()) as {
        reviewUrl?: string;
        expiresAt?: string;
        error?: string;
      };

      if (!response.ok || !data.reviewUrl || !data.expiresAt) {
        setError(data.error ?? "レビューURLを発行できませんでした。");
        return;
      }

      setReviewUrl(data.reviewUrl);
      setExpiresAt(data.expiresAt);
    });
  }

  async function copyUrl() {
    if (!reviewUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(reviewUrl);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = reviewUrl;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={issueReviewRequest}
          disabled={isPending}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-teal-800 px-3 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
          レビューURLを発行
        </button>
        {reviewUrl ? (
          <button
            type="button"
            onClick={copyUrl}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "コピー済み" : "URLをコピー"}
          </button>
        ) : null}
      </div>
      {reviewUrl ? (
        <div className="rounded-md border border-teal-100 bg-teal-50 p-3 text-xs leading-5 text-teal-950">
          <p className="font-semibold">お客様への案内文</p>
          <p className="mt-1">
            先日おすすめした商品の感想を教えてください。お名前などの個人情報はメーカーには共有されず、匿名の集計データとして商品改善に活用されます。
          </p>
          <p className="mt-2 break-all font-mono">{reviewUrl}</p>
          <p className="mt-1 text-teal-800">期限: {formatDate(expiresAt)}</p>
        </div>
      ) : null}
      {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}

