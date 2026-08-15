export const REVIEW_REWARD_ROLL_MAX = 10_000;

export const REVIEW_REWARD_PRIZES = [
  { tier: 1, points: 1_000, weight: 100, probabilityLabel: "1%" },
  { tier: 2, points: 200, weight: 900, probabilityLabel: "9%" },
  { tier: 3, points: 80, weight: 9_000, probabilityLabel: "90%" }
] as const;

export type ReviewRewardPrize = {
  tier: number;
  points: number;
  weight: number;
  probabilityLabel: string;
};

export type ReviewRewardSettings = {
  firstPoints: number;
  firstRate: number;
  secondPoints: number;
  secondRate: number;
  thirdPoints: number;
  thirdRate: number;
};

export function reviewRewardPrizesFromSettings(settings: ReviewRewardSettings): ReviewRewardPrize[] {
  return [
    { tier: 1, points: settings.firstPoints, weight: settings.firstRate * 100, probabilityLabel: `${settings.firstRate}%` },
    { tier: 2, points: settings.secondPoints, weight: settings.secondRate * 100, probabilityLabel: `${settings.secondRate}%` },
    { tier: 3, points: settings.thirdPoints, weight: settings.thirdRate * 100, probabilityLabel: `${settings.thirdRate}%` }
  ];
}

export function reviewRewardForRoll(roll: number): 1_000 | 200 | 80;
export function reviewRewardForRoll(roll: number, prizes: readonly ReviewRewardPrize[]): number;
export function reviewRewardForRoll(roll: number, prizes: readonly ReviewRewardPrize[] = REVIEW_REWARD_PRIZES): number {
  if (!Number.isInteger(roll) || roll < 0 || roll >= REVIEW_REWARD_ROLL_MAX) {
    throw new Error("抽選値が正しくありません。");
  }

  let threshold = 0;
  for (const prize of prizes) {
    threshold += prize.weight;
    if (roll < threshold) return prize.points;
  }
  return prizes[prizes.length - 1]?.points ?? 0;
}

export function reviewRewardTier(points: number, prizes: readonly ReviewRewardPrize[] = REVIEW_REWARD_PRIZES) {
  return prizes.find((prize) => prize.points === points)?.tier ?? 3;
}
