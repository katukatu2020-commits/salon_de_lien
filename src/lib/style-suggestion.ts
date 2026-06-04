import {
  attachSimulationImages,
  fallbackAdvisorResult,
  parseAdvisorResult,
  type StyleSuggestionContext
} from "@/lib/ai/style-advisor";
import { prisma } from "@/lib/prisma";

export async function buildStyleSuggestionContext(customerId: string): Promise<StyleSuggestionContext> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deletedAt: null },
    include: {
      hairProfile: true,
      preference: true,
      visits: {
        orderBy: { visitedAt: "desc" },
        take: 5
      },
      styleSuggestions: {
        orderBy: { createdAt: "desc" },
        take: 5
      }
    }
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  const acceptedStyleSuggestions = await prisma.styleSuggestion.findMany({
    where: {
      customerId,
      customer: { deletedAt: null },
      accepted: true
    },
    orderBy: { createdAt: "desc" }
  });

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      gender: customer.gender,
      birthYear: customer.birthYear,
      phone: customer.phone,
      profileImageUrl: customer.profileImageUrl,
      memo: customer.memo
    },
    hairProfile: customer.hairProfile,
    preference: customer.preference,
    recentVisits: customer.visits,
    recentStyleSuggestions: customer.styleSuggestions,
    acceptedStyleSuggestions
  };
}

export async function generateStyleSuggestions(customerId: string) {
  const context = await buildStyleSuggestionContext(customerId);

  return {
    context,
    suggestions: []
  };
}

export async function generateAiStyleSuggestionDrafts(customerId: string) {
  const context = await buildStyleSuggestionContext(customerId);

  if (!process.env.OPENAI_API_KEY) {
    return attachSimulationImages(customerId, context.customer.profileImageUrl, fallbackAdvisorResult(context));
  }

  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const contextText = JSON.stringify(
    {
      customer: context.customer,
      hairProfile: context.hairProfile,
      preference: context.preference,
      recentVisits: context.recentVisits.map((visit) => ({
        visitedAt: visit.visitedAt,
        requestedStyle: visit.requestedStyle,
        performedStyle: visit.performedStyle,
        cutNotes: visit.cutNotes,
        colorNotes: visit.colorNotes,
        permNotes: visit.permNotes,
        customerReaction: visit.customerReaction,
        nextRecommendation: visit.nextRecommendation
      })),
      recentStyleSuggestions: context.recentStyleSuggestions.map((suggestion) => ({
        suggestedStyleName: suggestion.suggestedStyleName,
        reason: suggestion.reason,
        caution: suggestion.caution,
        stylingAdvice: suggestion.stylingAdvice,
        accepted: suggestion.accepted
      })),
      acceptedStyleSuggestions: context.acceptedStyleSuggestions.map((suggestion) => ({
        suggestedStyleName: suggestion.suggestedStyleName,
        reason: suggestion.reason
      }))
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
      text: `顧客本人のプロフィール写真とカルテをもとに、スタッフ向けの髪型提案を作成してください。

重要:
- AI提案は参考情報です。最終判断はスタッフが行います。
- 顧客本人の希望・NG条件を必ず優先してください。
- 写真上の印象として表現し、顔型・骨格を断定しないでください。
- 欠点を隠す、必ず似合う、これしかない、などの断定表現は禁止です。
- 本人写真を使う前提で、髪型だけを自然に変更する imageEditPrompt を作ってください。
- 顔立ち・骨格バランス・表情・顔の向きはできるだけ維持し、別人化させない指示を含めてください。
- 出力はJSONのみで、余計な説明文は不要です。

JSON形式:
{
  "faceShapeImpression": "写真上の顔型の印象。断定しない",
  "boneStructureImpression": "骨格バランスの印象。断定しない",
  "currentHairObservation": "現在の髪型・髪量・毛流れの印象",
  "overallDirection": "全体の提案方針",
  "avoidPoints": ["避けた方がよい方向"],
  "suggestions": [
    {
      "label": "本命",
      "styleName": "提案スタイル名",
      "reason": "本人写真・髪質・好み・履歴を根拠にした提案理由",
      "caution": "NG条件や確認事項",
      "stylingAdvice": "セット方法",
      "menuSuggestion": "おすすめ施術メニュー",
      "estimatedMinutes": 60,
      "maintenanceLevel": "低",
      "imageEditPrompt": "本人写真を入力として髪型だけを自然に変更する画像編集プロンプト"
    },
    {
      "label": "安全",
      "styleName": "...",
      "reason": "...",
      "caution": "...",
      "stylingAdvice": "...",
      "menuSuggestion": "...",
      "estimatedMinutes": 60,
      "maintenanceLevel": "中",
      "imageEditPrompt": "..."
    },
    {
      "label": "挑戦",
      "styleName": "...",
      "reason": "...",
      "caution": "...",
      "stylingAdvice": "...",
      "menuSuggestion": "...",
      "estimatedMinutes": 70,
      "maintenanceLevel": "高",
      "imageEditPrompt": "..."
    }
  ]
}

顧客カルテ:
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
    input: [
      {
        role: "user",
        content
      }
    ],
    max_output_tokens: 1400
  });

  return attachSimulationImages(
    customerId,
    context.customer.profileImageUrl,
    parseAdvisorResult(response.output_text, context)
  );
}
