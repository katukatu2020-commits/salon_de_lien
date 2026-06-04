import { prisma } from "@/lib/prisma";

type AiStyleSuggestion = {
  suggestedStyleName: string;
  reason: string;
  caution: string;
  stylingAdvice: string;
};

function fallbackSuggestionFromContext(context: Awaited<ReturnType<typeof buildStyleSuggestionContext>>): AiStyleSuggestion {
  const preferredLength = context.preference?.preferredLength ?? "扱いやすい長さ";
  const preferredStyle = context.preference?.preferredStyle ?? "自然で清潔感のある雰囲気";
  const hairTexture = context.hairProfile?.hairTexture ?? "現在の髪質";
  const latestVisit = context.recentVisits[0];

  return {
    suggestedStyleName: `${preferredLength}を活かしたナチュラルショート`,
    reason: `好みの「${preferredStyle}」と${hairTexture}を踏まえ、日常で扱いやすい提案としてまとめています。${
      latestVisit?.performedStyle ? `前回の「${latestVisit.performedStyle}」から大きく変えすぎない方向です。` : ""
    }`,
    caution: context.preference?.dislikes
      ? `NG条件（${context.preference.dislikes}）を必ず優先し、施術前に顧客本人へ確認してください。`
      : "顧客本人の希望を確認し、顔周りや長さの変化はスタッフ判断で調整してください。",
    stylingAdvice:
      context.hairProfile?.stylingTimeMinutes != null
        ? `朝のセット時間 ${context.hairProfile.stylingTimeMinutes}分以内で整えやすいよう、軽めのワックスやバームで自然に仕上げます。`
        : "乾かすだけで形が出やすいベースを作り、必要に応じて軽めのスタイリング剤で整えます。"
  };
}

function parseAiSuggestion(text: string, context: Awaited<ReturnType<typeof buildStyleSuggestionContext>>) {
  try {
    const parsed = JSON.parse(text) as Partial<AiStyleSuggestion>;

    if (parsed.suggestedStyleName && parsed.reason) {
      return {
        suggestedStyleName: parsed.suggestedStyleName,
        reason: parsed.reason,
        caution: parsed.caution ?? "顧客本人の希望・NG条件を優先してスタッフが最終判断してください。",
        stylingAdvice: parsed.stylingAdvice ?? "日々の扱いやすさを確認しながらスタイリング方法を提案してください。"
      };
    }
  } catch {
    // Fall through to a deterministic fallback so the demo flow can still save a suggestion.
  }

  return fallbackSuggestionFromContext(context);
}

export async function buildStyleSuggestionContext(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
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

export async function generateAiStyleSuggestionDraft(customerId: string) {
  const context = await buildStyleSuggestionContext(customerId);

  if (!process.env.OPENAI_API_KEY) {
    return fallbackSuggestionFromContext(context);
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
      text: `顧客カルテをもとに、美容師・理容師スタッフ向けの髪型提案を1件だけ作成してください。

重要:
- AI提案は参考情報です。
- 最終判断はスタッフが行います。
- 顧客本人の希望・NG条件を必ず優先してください。
- 医療的・断定的な判断はしないでください。
- 出力はJSONのみで、余計な説明文は不要です。

JSON形式:
{
  "suggestedStyleName": "提案スタイル名",
  "reason": "提案理由。髪質・好み・履歴を根拠にする",
  "caution": "注意点。NG条件や確認事項を含める",
  "stylingAdvice": "スタッフが顧客に伝えられるセット方法"
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
    max_output_tokens: 900
  });

  return parseAiSuggestion(response.output_text, context);
}
