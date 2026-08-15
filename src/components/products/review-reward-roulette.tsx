"use client";

import { Gift, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { REVIEW_REWARD_PRIZES, reviewRewardTier, type ReviewRewardPrize } from "@/lib/points/review-reward";

type ReviewRewardRouletteProps = {
  awardedPoints: number;
  destination?: string;
  pointExpiresAt?: string;
  rewardPrizes?: ReviewRewardPrize[];
};

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

export function ReviewRewardRoulette({
  awardedPoints,
  destination,
  pointExpiresAt,
  rewardPrizes = [...REVIEW_REWARD_PRIZES]
}: ReviewRewardRouletteProps) {
  const [selectedChest, setSelectedChest] = useState<number | null>(null);
  const [opened, setOpened] = useState(false);
  const expiresLabel = formatDate(pointExpiresAt);
  const tier = reviewRewardTier(awardedPoints, rewardPrizes);

  useEffect(() => {
    if (selectedChest === null) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setOpened(true);
      return;
    }
    const timeoutId = window.setTimeout(() => setOpened(true), 1_050);
    return () => window.clearTimeout(timeoutId);
  }, [selectedChest]);

  function selectChest(index: number) {
    if (selectedChest !== null) return;
    setSelectedChest(index);
  }

  return (
    <section className="w-full overflow-hidden rounded-[24px] border border-[#e5cf93] bg-[#fffaf0] p-5 text-center shadow-[0_24px_70px_rgba(91,51,44,0.18)]">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-[#8f4f42] shadow-sm">
        {opened ? <Gift className="h-6 w-6" /> : <Sparkles className="h-6 w-6 motion-safe:animate-pulse" />}
      </div>

      <p className="mt-4 text-sm font-semibold text-[#7b5d1d]">
        {opened ? `${tier}等が当たりました` : "好きな宝箱を1つ選んでください"}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-[#4f3b22]">
        {opened ? "ポイント獲得" : "アンケート回答プレゼント"}
      </h2>
      {!opened ? <p className="mt-2 text-xs text-[#7c7168]">宝箱を選べるのは1回だけです</p> : null}

      <div className="mt-6 grid grid-cols-3 gap-3" aria-label="宝箱を選ぶ">
        {[0, 1, 2].map((index) => {
          const selected = selectedChest === index;
          const inactive = selectedChest !== null && !selected;
          return (
            <button
              key={index}
              type="button"
              disabled={selectedChest !== null}
              onClick={() => selectChest(index)}
              aria-label={`宝箱${index + 1}を選ぶ`}
              className={`group relative min-h-36 rounded-[20px] border px-2 py-4 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be] ${
                selected
                  ? "border-[#d8b56d] bg-[#fff4d6] shadow-[0_14px_32px_rgba(143,79,66,0.16)]"
                  : "border-[#eadfcb] bg-white shadow-sm"
              } ${inactive ? "opacity-45" : ""}`}
            >
              <span
                aria-hidden="true"
                className={`mx-auto block w-full max-w-[88px] ${selected && !opened ? "motion-safe:animate-bounce" : ""}`}
              >
                <span
                  className={`block h-7 rounded-t-xl border-2 border-[#7d5034] bg-[#d8b56d] transition-transform ${
                    selected && opened ? "-translate-y-2 -rotate-6" : ""
                  }`}
                />
                <span className="relative -mt-0.5 block h-16 rounded-b-xl border-2 border-[#7d5034] bg-[#b97350] shadow-[inset_0_8px_0_rgba(255,255,255,0.18)]">
                  <span className="absolute left-1/2 top-4 h-7 w-5 -translate-x-1/2 rounded-md border-2 border-[#7d5034] bg-[#f1ce78]" />
                </span>
              </span>
              <span className="mt-3 block text-xs font-semibold text-[#5b332c]">
                {selected && opened ? `${awardedPoints.toLocaleString("ja-JP")}pt` : `宝箱 ${index + 1}`}
              </span>
            </button>
          );
        })}
      </div>

      {selectedChest !== null && !opened ? (
        <p className="mt-5 text-sm font-semibold text-[#8f4f42] motion-safe:animate-pulse" aria-live="polite">
          宝箱を開けています...
        </p>
      ) : null}

      {opened ? (
        <div className="mt-5" aria-live="polite">
          <p className="text-4xl font-semibold tabular-nums text-[#8f4f42]">
            {awardedPoints.toLocaleString("ja-JP")}
            <span className="ml-1 text-lg">pt</span>
          </p>
          <p className="mt-3 font-semibold text-[#4f3b22]">現在使えるポイントへ加算しました</p>
          {expiresLabel ? <p className="mt-2 text-xs text-[#7c7168]">ポイント有効期限: {expiresLabel}</p> : null}
          {destination ? (
            <a
              href={destination}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#8f4f42] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7d453a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]"
            >
              アンケート受信ボックスへ戻る
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#eadfcb] pt-4">
        {rewardPrizes.map((prize) => (
          <div key={prize.tier} className="text-xs text-[#7c7168]">
            <p className="font-semibold text-[#5b332c]">{prize.tier}等</p>
            <p className="mt-1 tabular-nums">{prize.points.toLocaleString("ja-JP")}pt</p>
            <p className="mt-1 text-[10px] font-medium text-[#8b8178]">確率 {prize.probabilityLabel}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
