import { generateStyleSimulationImages } from "@/lib/ai/style-image-generator";

export type StyleSuggestionContext = {
  customer: {
    id: string;
    name: string;
    gender: string | null;
    birthYear: number | null;
    phone: string | null;
    profileImageUrl: string | null;
    memo: string | null;
  };
  hairProfile: unknown;
  preference: {
    dislikes?: string | null;
    preferredLength?: string | null;
    preferredStyle?: string | null;
  } | null;
  recentVisits: Array<{
    visitedAt: Date;
    requestedStyle: string | null;
    performedStyle: string | null;
    cutNotes: string | null;
    colorNotes: string | null;
    permNotes: string | null;
    customerReaction: string | null;
    nextRecommendation: string | null;
  }>;
  recentStyleSuggestions: Array<{
    suggestedStyleName: string;
    reason: string | null;
    caution: string | null;
    stylingAdvice: string | null;
    accepted: boolean;
  }>;
  acceptedStyleSuggestions: Array<{
    suggestedStyleName: string;
    reason: string | null;
  }>;
};

export type AiStyleSuggestionResult = {
  faceShapeImpression: string;
  boneStructureImpression: string;
  currentHairObservation: string;
  overallDirection: string;
  avoidPoints: string[];
  suggestions: {
    label: "本命" | "安全" | "挑戦";
    styleName: string;
    reason: string;
    caution: string;
    stylingAdvice: string;
    menuSuggestion: string;
    estimatedMinutes: number;
    maintenanceLevel: "低" | "中" | "高";
    imageEditPrompt: string;
  }[];
};

export type StyleSuggestionDraft = AiStyleSuggestionResult["suggestions"][number] & {
  faceAnalysis: string;
  imageUrls: string[];
};

const labels: Array<"本命" | "安全" | "挑戦"> = ["本命", "安全", "挑戦"];

function buildFaceAnalysis(result: AiStyleSuggestionResult) {
  return [
    `顔型の印象: ${result.faceShapeImpression}`,
    `骨格バランスの印象: ${result.boneStructureImpression}`,
    `現在の髪型の印象: ${result.currentHairObservation}`,
    `全体方針: ${result.overallDirection}`,
    `避けたい方向: ${result.avoidPoints.join(" / ")}`
  ].join("\n");
}

export function fallbackAdvisorResult(context: StyleSuggestionContext): AiStyleSuggestionResult {
  const preferredStyle = context.preference?.preferredStyle ?? "自然で清潔感のある雰囲気";
  const preferredLength = context.preference?.preferredLength ?? "扱いやすい長さ";
  const dislikes = context.preference?.dislikes;
  const latestVisit = context.recentVisits[0];
  const basePrompt =
    "顧客本人の写真をもとに、顔立ち・骨格バランス・表情・顔の向きはできるだけ維持し、髪型だけを自然に変更してください。本人の顔を過度に美化せず、別人化させない。実際のサロン提案用の自然な試着イメージ。";

  return {
    faceShapeImpression: context.customer.profileImageUrl
      ? "写真上の印象では、顔周りをすっきり見せるシルエットが合いやすそうです。"
      : "プロフィール写真が未登録のため、顔型印象は髪質・好み情報から控えめに推定しています。",
    boneStructureImpression: "写真またはカルテ上の印象では、トップに少し高さを出すとバランスが取りやすそうです。",
    currentHairObservation:
      latestVisit?.performedStyle ?? "現在の髪型は未登録のため、来店時に長さ・毛流れ・ボリュームを確認してください。",
    overallDirection: `顧客の好み「${preferredStyle}」を優先し、${preferredLength}を軸に扱いやすさを重視します。`,
    avoidPoints: dislikes ? [dislikes, "断定的な大幅変更", "本人の希望から外れた強い印象変更"] : ["本人の希望から外れた強い印象変更"],
    suggestions: [
      {
        label: "本命",
        styleName: `${preferredLength}を活かした本人ベースのナチュラルショート`,
        reason: `写真・髪質・好みの印象を踏まえ、清潔感と扱いやすさを両立しやすい提案です。`,
        caution: dislikes
          ? `NG条件（${dislikes}）を必ず優先し、前髪・サイド・長さは施術前に確認してください。`
          : "前髪・サイド・長さは施術前に顧客本人へ確認してください。",
        stylingAdvice: "ドライ時に根元を軽く起こし、軽めのスタイリング剤で毛流れを整えます。",
        menuSuggestion: "カット + 質感調整",
        estimatedMinutes: 60,
        maintenanceLevel: "中",
        imageEditPrompt: `${basePrompt} ${preferredStyle}に寄せたナチュラルショート。前髪は短くしすぎず、サイドは強く刈り上げない。トップに少し高さを出し、横幅を抑えた清潔感のあるシルエット。`
      },
      {
        label: "安全",
        styleName: "再現性重視のソフトショート",
        reason: "NG条件を避けながら、現在の印象を大きく変えずに清潔感とメンテナンス性を優先します。",
        caution: dislikes ? `NG条件（${dislikes}）を確実に避けてください。` : "大きな印象変更は避け、本人の希望を優先してください。",
        stylingAdvice: "乾かすだけでまとまりやすいように毛量を整え、スタイリング剤は少量にします。",
        menuSuggestion: "カット + 軽めの毛量調整",
        estimatedMinutes: 50,
        maintenanceLevel: "低",
        imageEditPrompt: `${basePrompt} まとまりのあるソフトショート。自然な毛流れ、軽い束感、額を出しすぎない前髪。服装や背景は大きく変えない。`
      },
      {
        label: "挑戦",
        styleName: "ニュアンス束感ショート",
        reason: "好みから大きく外れない範囲で、トップと毛先に少し動きを出して印象を変える提案です。",
        caution: "動きを出しすぎるとセット負担が増えるため、日々のスタイリング時間を確認してください。",
        stylingAdvice: "根元を軽く立ち上げ、毛先に少量のワックスをなじませて自然な束感を作ります。",
        menuSuggestion: "カット + ニュアンス質感調整",
        estimatedMinutes: 70,
        maintenanceLevel: "中",
        imageEditPrompt: `${basePrompt} 軽い束感と動きのあるニュアンスショート。トップに自然な高さ、サイドは膨らみすぎない。本人の顔立ちと表情は維持する。`
      }
    ]
  };
}

export function parseAdvisorResult(text: string, context: StyleSuggestionContext): AiStyleSuggestionResult {
  try {
    const parsed = JSON.parse(text) as Partial<AiStyleSuggestionResult>;

    if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
      return {
        faceShapeImpression: parsed.faceShapeImpression ?? "写真上の印象をもとに、顔周りの見え方を控えめに整理しています。",
        boneStructureImpression: parsed.boneStructureImpression ?? "骨格バランスは断定せず、シルエット調整の参考として扱います。",
        currentHairObservation: parsed.currentHairObservation ?? "現在の髪型の特徴は来店時にスタッフが確認してください。",
        overallDirection: parsed.overallDirection ?? "顧客本人の希望とNG条件を優先します。",
        avoidPoints: parsed.avoidPoints ?? ["顧客本人の希望から外れる強い変更"],
        suggestions: parsed.suggestions.slice(0, 3).map((suggestion, index) => ({
          label: suggestion.label ?? labels[index],
          styleName: suggestion.styleName ?? "本人ベースの髪型提案",
          reason: suggestion.reason ?? "顧客カルテと写真上の印象をもとにした提案です。",
          caution: suggestion.caution ?? "顧客本人の希望・NG条件を優先してスタッフが最終判断してください。",
          stylingAdvice: suggestion.stylingAdvice ?? "日々の扱いやすさを確認しながらスタイリング方法を提案してください。",
          menuSuggestion: suggestion.menuSuggestion ?? "カット",
          estimatedMinutes: suggestion.estimatedMinutes ?? 60,
          maintenanceLevel: suggestion.maintenanceLevel ?? "中",
          imageEditPrompt:
            suggestion.imageEditPrompt ??
            "顧客本人の写真をもとに、顔立ち・表情・顔の向きは維持し、髪型だけを自然に変更するサロン提案用シミュレーション画像。"
        }))
      };
    }
  } catch {
    // Fall through to fallback.
  }

  return fallbackAdvisorResult(context);
}

export async function attachSimulationImages(
  customerId: string,
  sourceImageUrl: string | null,
  result: AiStyleSuggestionResult
): Promise<StyleSuggestionDraft[]> {
  const faceAnalysis = buildFaceAnalysis(result);

  return Promise.all(
    result.suggestions.map(async (suggestion) => ({
      ...suggestion,
      faceAnalysis,
      imageUrls: sourceImageUrl
        ? await generateStyleSimulationImages({
            customerId,
            sourceImageUrl,
            styleName: suggestion.styleName,
            imageEditPrompt: suggestion.imageEditPrompt
          })
        : []
    }))
  );
}
