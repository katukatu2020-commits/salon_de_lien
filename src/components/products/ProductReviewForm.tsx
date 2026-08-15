"use client";

import { Send } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  BAD_POINT_OPTIONS,
  GOOD_POINT_OPTIONS,
  PRODUCT_REVIEW_COMMENT_MAX_LENGTH,
  PRODUCT_REVIEW_COMMENT_MIN_LENGTH
} from "@/lib/products/product-review";
import { ReviewRewardRoulette } from "@/components/products/review-reward-roulette";
import type { ReviewRewardPrize } from "@/lib/points/review-reward";

type ProductReviewFormProps = {
  token?: string;
  customerAppUrl?: string;
  submissionUrl?: string;
  completionUrl?: string;
};

export function ProductReviewForm({ token, customerAppUrl, submissionUrl, completionUrl }: ProductReviewFormProps) {
  const [usedStatus, setUsedStatus] = useState("used");
  const [rewardResult, setRewardResult] = useState<{ awardedPoints: number; pointExpiresAt?: string; destination?: string; rewardPrizes?: ReviewRewardPrize[] } | null>(null);
  const [commentLength, setCommentLength] = useState(0);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const rouletteDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rewardResult) return;
    rouletteDialogRef.current?.focus({ preventScroll: true });
  }, [rewardResult]);

  function submitReview(formData: FormData) {
    setError("");

    const freeComment = String(formData.get("freeComment") ?? "").trim();
    if (freeComment.length < PRODUCT_REVIEW_COMMENT_MIN_LENGTH) {
      setError(`コメントは${PRODUCT_REVIEW_COMMENT_MIN_LENGTH}文字以上入力してください。`);
      return;
    }

    const payload = {
      usedStatus: String(formData.get("usedStatus") ?? ""),
      rating: formData.get("rating") ? Number(formData.get("rating")) : null,
      goodPoints: formData.getAll("goodPoints").map(String),
      badPoints: formData.getAll("badPoints").map(String),
      repeatIntent: formData.get("repeatIntent") ? String(formData.get("repeatIntent")) : null,
      freeComment,
      allowAnonymousShare: formData.get("allowAnonymousShare") === "on",
      allowAnonymousQuote: formData.get("allowAnonymousQuote") === "on"
    };

    startTransition(async () => {
      const endpoint = submissionUrl ?? (token ? `/api/public/review/product/${encodeURIComponent(token)}` : "");
      if (!endpoint) {
        setError("アンケートの送信先を確認できませんでした。");
        return;
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = (await response.json()) as { error?: string; awardedPoints?: number; pointExpiresAt?: string; rewardPrizes?: ReviewRewardPrize[] };

      if (!response.ok) {
        setError(data.error ?? "送信できませんでした。");
        return;
      }

      const destination = completionUrl ?? customerAppUrl;
      if (!Number.isInteger(data.awardedPoints) || (data.awardedPoints ?? 0) <= 0) {
        setError("抽選結果を確認できませんでした。ポイント残高をご確認ください。");
        return;
      }

      setRewardResult({ awardedPoints: data.awardedPoints!, pointExpiresAt: data.pointExpiresAt, destination, rewardPrizes: data.rewardPrizes });
    });
  }

  if (rewardResult) {
    return (
      <div
        ref={rouletteDialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="アンケート回答ポイント宝箱"
        tabIndex={-1}
        className="fixed inset-0 z-[100] overflow-y-auto bg-[#fbf7f0]/95 px-4 py-[max(24px,env(safe-area-inset-top))] outline-none backdrop-blur-sm"
      >
        <div className="mx-auto flex min-h-full w-full max-w-md items-center justify-center py-6">
          <ReviewRewardRoulette {...rewardResult} />
        </div>
      </div>
    );
  }

  return (
    <form action={submitReview} className="grid gap-5">
      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold text-lien-ink">使ってみましたか？</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            ["used", "使った"],
            ["not_yet", "まだ使っていない"],
            ["forgot", "覚えていない"]
          ].map(([value, label]) => (
            <label
              key={value}
              className={`flex min-h-14 items-center gap-3 rounded-[18px] border px-3 py-3 text-sm font-semibold shadow-sm ${
                usedStatus === value
                  ? "border-[color:var(--lien-primary-soft)] bg-[#fff2ed] text-[color:var(--lien-primary-dark)]"
                  : "border-lien bg-white text-lien-muted"
              }`}
            >
              <input
                type="radio"
                name="usedStatus"
                value={value}
                checked={usedStatus === value}
                onChange={() => setUsedStatus(value)}
                className="h-4 w-4 accent-[color:var(--lien-primary)]"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {usedStatus === "used" ? (
        <div className="grid gap-5 rounded-[24px] border border-lien bg-lien-soft p-4">
          <label className="grid gap-2 text-sm font-semibold text-lien-ink">
            満足度
            <select name="rating" required className="lien-input">
              <option value="">選択してください</option>
              <option value="5">5 とても満足</option>
              <option value="4">4 満足</option>
              <option value="3">3 普通</option>
              <option value="2">2 やや不満</option>
              <option value="1">1 不満</option>
            </select>
          </label>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-lien-ink">良かった点</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {GOOD_POINT_OPTIONS.map((option) => (
                <label key={option} className="flex min-h-11 items-center gap-2 rounded-2xl bg-white px-3 text-sm text-lien-muted shadow-sm">
                  <input type="checkbox" name="goodPoints" value={option} className="h-4 w-4 accent-[color:var(--lien-primary)]" />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-lien-ink">気になった点</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {BAD_POINT_OPTIONS.map((option) => (
                <label key={option} className="flex min-h-11 items-center gap-2 rounded-2xl bg-white px-3 text-sm text-lien-muted shadow-sm">
                  <input type="checkbox" name="badPoints" value={option} className="h-4 w-4 accent-[color:var(--lien-primary)]" />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="grid gap-2 text-sm font-semibold text-lien-ink">
            また使いたいですか？
            <select name="repeatIntent" required className="lien-input">
              <option value="">選択してください</option>
              <option value="yes">はい</option>
              <option value="maybe">迷う</option>
              <option value="no">いいえ</option>
            </select>
          </label>
        </div>
      ) : null}

      <label className="grid gap-2 text-[0px] font-semibold text-lien-ink">
        <span className="flex items-center justify-between gap-3 text-sm">
          <span>コメント（必須・50文字以上）</span>
          <span className={`text-xs tabular-nums ${commentLength >= PRODUCT_REVIEW_COMMENT_MIN_LENGTH ? "text-[#47704f]" : "text-[#8f4f42]"}`}>
            {commentLength}/{PRODUCT_REVIEW_COMMENT_MAX_LENGTH}文字
          </span>
        </span>
        <textarea
          name="freeComment"
          rows={4}
          required
          minLength={PRODUCT_REVIEW_COMMENT_MIN_LENGTH}
          maxLength={PRODUCT_REVIEW_COMMENT_MAX_LENGTH}
          onChange={(event) => setCommentLength(event.currentTarget.value.trim().length)}
          className="lien-input py-3 text-sm"
          placeholder="使用した場面、良かった点や気になった点などを50文字以上で教えてください"
        />
        <span className="text-xs font-normal leading-5 text-lien-muted">
          商品改善の参考になるよう、実際に使って感じたことを具体的にご入力ください。
        </span>
      </label>

      <div className="grid gap-3 rounded-[22px] border border-lien bg-white p-4">
        <label className="flex items-start gap-2 text-sm font-semibold text-lien-ink">
          <input type="checkbox" name="allowAnonymousShare" required className="mt-1 h-4 w-4 accent-[color:var(--lien-primary)]" />
          <span>匿名の集計データとしてメーカーの商品改善に利用してよい</span>
        </label>
        <label className="flex items-start gap-2 text-sm text-lien-muted">
          <input type="checkbox" name="allowAnonymousQuote" className="mt-1 h-4 w-4 accent-[color:var(--lien-primary)]" />
          <span>個人が分からない形のコメントとしてメーカーに共有してよい</span>
        </label>
      </div>

      {error ? <p className="rounded-[18px] border border-[#edc2bd] bg-[color:var(--lien-danger-soft)] p-3 text-sm font-semibold text-[#884039]">{error}</p> : null}

      <button type="submit" disabled={isPending} className="lien-button-primary min-h-12 disabled:opacity-60">
        {isPending ? (
          "送信中..."
        ) : (
          <>
            <Send className="h-4 w-4" />
            回答を送信する
          </>
        )}
      </button>
    </form>
  );
}
