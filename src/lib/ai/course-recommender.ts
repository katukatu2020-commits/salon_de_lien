import type { StyleSuggestionContext } from "@/lib/ai/style-advisor";

export type AiCourseRecommendation = {
  priority: "本命" | "低負担" | "挑戦";
  title: string;
  reason: string;
  caution?: string;
  estimatedMinutes?: number;
  estimatedPrice?: number;
};

function textIncludes(source: unknown, keywords: string[]) {
  const text = JSON.stringify(source ?? "").toLowerCase();
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function normalizeRecommendation(
  recommendation: Partial<AiCourseRecommendation>,
  index: number
): AiCourseRecommendation {
  const priorities: AiCourseRecommendation["priority"][] = ["本命", "低負担", "挑戦"];

  return {
    priority: priorities.includes(recommendation.priority as AiCourseRecommendation["priority"])
      ? (recommendation.priority as AiCourseRecommendation["priority"])
      : priorities[index] ?? "本命",
    title: recommendation.title?.trim() || ["カット + 毛量調整", "カット + 炭酸スパ", "カット + ニュアンスパーマ"][index] || "カット",
    reason:
      recommendation.reason?.trim() ||
      "髪質・好み・来店履歴を参考に、スタッフが会話の中で自然に提案しやすいコースです。",
    caution:
      recommendation.caution?.trim() ||
      "価格と所要時間は目安です。顧客本人の希望・NG条件を確認してから提案してください。",
    estimatedMinutes: Number.isFinite(recommendation.estimatedMinutes) ? recommendation.estimatedMinutes : [45, 60, 90][index],
    estimatedPrice: Number.isFinite(recommendation.estimatedPrice) ? recommendation.estimatedPrice : [4500, 6000, 9000][index]
  };
}

export function fallbackCourseRecommendations(context: StyleSuggestionContext): AiCourseRecommendation[] {
  const hasHighVolume = textIncludes(context.hairProfile, ["多い", "毛量", "広が", "ボリューム"]);
  const hasScalpConcern = textIncludes(context.hairProfile, ["頭皮", "乾燥", "脂", "かゆ", "匂い"]);
  const shortStylingTime = textIncludes(context.hairProfile, ["5", "10", "短い", "時短"]) || textIncludes(context.preference, ["時短", "楽"]);
  const highMaintenance = textIncludes(context.preference, ["高", "パーマ", "変化", "挑戦"]);

  const main = hasHighVolume
    ? {
        priority: "本命" as const,
        title: "カット + 毛量調整",
        reason: "髪量が多い・広がりやすい印象があるため、長さを大きく変えすぎず扱いやすさを上げる提案です。",
        caution: "すきすぎるとまとまりにくくなる場合があるため、表面の質感と根元の収まりを確認してください。",
        estimatedMinutes: 45,
        estimatedPrice: 4500
      }
    : {
        priority: "本命" as const,
        title: "カット + 似合わせ調整",
        reason: "好み・NG条件を優先しながら、清潔感と日々の扱いやすさを整える基本提案です。",
        caution: "仕上がりイメージは写真や過去履歴を見ながら顧客本人と確認してください。",
        estimatedMinutes: 45,
        estimatedPrice: 4500
      };

  const lowLoad = hasScalpConcern
    ? {
        priority: "低負担" as const,
        title: "カット + 炭酸スパ",
        reason: "清潔感を出しながら、頭皮まわりをすっきり整えやすい低負担の追加提案です。",
        caution: "頭皮状態について医療的な判断はせず、違和感がある場合は施術前に状態確認をしてください。",
        estimatedMinutes: 60,
        estimatedPrice: 6000
      }
    : {
        priority: "低負担" as const,
        title: "カット + クイックトリートメント",
        reason: "大きな印象変更をせず、手触りとまとまりを整えて次回提案につなげやすいコースです。",
        caution: "ダメージ状態や希望する質感に合わせて薬剤・メニュー名は店舗側で調整してください。",
        estimatedMinutes: 60,
        estimatedPrice: 6500
      };

  const challenge = highMaintenance || shortStylingTime
    ? {
        priority: "挑戦" as const,
        title: "カット + ニュアンスパーマ",
        reason: "朝のセット時間を短くしつつ、自然な毛流れやトップの動きを作りやすい提案です。",
        caution: "強い刈り上げや短すぎる前髪などのNGがある場合は、長さとカール感を控えめにしてください。",
        estimatedMinutes: 90,
        estimatedPrice: 9000
      }
    : {
        priority: "挑戦" as const,
        title: "カット + ポイント質感調整",
        reason: "希望から大きく外れない範囲で、前髪・サイド・トップの印象を少し変える提案です。",
        caution: "印象変更の幅は顧客本人の反応を見ながら段階的に提案してください。",
        estimatedMinutes: 60,
        estimatedPrice: 6000
      };

  return [main, lowLoad, challenge];
}

function parseRecommendations(text: string, context: StyleSuggestionContext): AiCourseRecommendation[] {
  try {
    const parsed = JSON.parse(text) as unknown;
    const list = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { recommendations?: unknown }).recommendations)
        ? (parsed as { recommendations: unknown[] }).recommendations
        : [];

    if (list.length > 0) {
      return list.slice(0, 3).map((item, index) => normalizeRecommendation(item as Partial<AiCourseRecommendation>, index));
    }
  } catch {
    // Fall through to the deterministic MVP fallback.
  }

  return fallbackCourseRecommendations(context);
}

export async function generateCourseRecommendations(
  context: StyleSuggestionContext
): Promise<AiCourseRecommendation[]> {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackCourseRecommendations(context);
  }

  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const contextText = JSON.stringify(
    {
      customer: context.customer,
      hairProfile: context.hairProfile,
      preference: context.preference,
      recentVisits: context.recentVisits,
      recentStyleSuggestions: context.recentStyleSuggestions,
      acceptedStyleSuggestions: context.acceptedStyleSuggestions,
      hasProfileImage: Boolean(context.customer.profileImageUrl)
    },
    null,
    2
  );

  const content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string; detail: "low" | "high" | "auto" }
  > = [
    {
      type: "input_text",
      text: `Salon de Lienのスタッフ向けに、おすすめ施術コースを3件作成してください。

目的:
- 押し売りではなく、顧客の希望・髪質・悩みに対して自然に提案できるコースにする
- 価格と所要時間は目安として扱う
- 顧客本人の希望・NG条件を必ず優先する

考慮すること:
- 髪質プロフィール
- 好み・NG条件
- 来店履歴
- 髪型提案履歴
- プロフィール画像がある場合は写真上の印象
- メンテナンス許容度
- 朝のセット時間
- 顧客の反応

禁止:
- 高額メニューを無理に勧める
- 断定表現
- 医療的・身体的な診断
- NG条件に反する提案

出力はJSONのみ:
{
  "recommendations": [
    {
      "priority": "本命",
      "title": "カット + 毛量調整",
      "reason": "スタッフが会話で使いやすい理由",
      "caution": "注意点",
      "estimatedMinutes": 45,
      "estimatedPrice": 4500
    },
    {
      "priority": "低負担",
      "title": "...",
      "reason": "...",
      "caution": "...",
      "estimatedMinutes": 60,
      "estimatedPrice": 6000
    },
    {
      "priority": "挑戦",
      "title": "...",
      "reason": "...",
      "caution": "...",
      "estimatedMinutes": 90,
      "estimatedPrice": 9000
    }
  ]
}

顧客コンテキスト:
${contextText}`
    }
  ];

  if (context.customer.profileImageUrl) {
    content.push({
      type: "input_image",
      image_url: context.customer.profileImageUrl,
      detail: "low"
    });
  }

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    input: [{ role: "user", content }],
    max_output_tokens: 1000
  });

  return parseRecommendations(response.output_text, context);
}
