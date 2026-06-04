export type IdentityCheckResult = {
  score: number;
  level: "high" | "medium" | "low";
  reason: string;
  warnings: string[];
};

const fallbackResult: IdentityCheckResult = {
  score: 0,
  level: "low",
  reason: "本人らしさチェックは実行できませんでした。生成画像を目視で確認してください。",
  warnings: ["本人らしさチェックは実行できませんでした。生成画像を目視で確認してください。"]
};

function normalizeIdentityCheckResult(value: unknown): IdentityCheckResult {
  const parsed = value as Partial<IdentityCheckResult>;
  const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
  const level: IdentityCheckResult["level"] =
    parsed.level === "high" || parsed.level === "medium" || parsed.level === "low"
      ? parsed.level
      : score >= 80
        ? "high"
        : score >= 60
          ? "medium"
          : "low";

  return {
    score,
    level,
    reason: typeof parsed.reason === "string" ? parsed.reason : "参照写真との近さを目視評価した結果です。",
    warnings: Array.isArray(parsed.warnings)
      ? parsed.warnings.filter((warning): warning is string => typeof warning === "string")
      : []
  };
}

// TODO:
// Replace this Vision-based identity check with a face embedding comparison.
// Candidates:
// - face-api.js
// - InsightFace / ArcFace
// - external GPU inference API
export async function checkGeneratedImageIdentity({
  referenceFrontImageUrls,
  referenceSideImageUrls,
  generatedImageUrl,
  angle
}: {
  referenceFrontImageUrls: string[];
  referenceSideImageUrls: string[];
  generatedImageUrl: string;
  angle: "斜め正面" | "横" | "斜め後ろ";
}): Promise<IdentityCheckResult> {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackResult;
  }

  console.log("identity check started", {
    angle,
    frontReferenceCount: referenceFrontImageUrls.length,
    sideReferenceCount: referenceSideImageUrls.length,
    generatedImageUrl
  });

  try {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const referenceImages = [
      ...referenceFrontImageUrls.slice(0, 2),
      ...referenceSideImageUrls.slice(0, 2)
    ];
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `これは顔認証ではありません。登録写真と生成画像を比較し、髪型相談用画像として本人らしさが保たれているかを目視評価してください。

比較対象:
- 参照写真: 正面1〜2枚、横顔1〜2枚
- 生成画像: 1枚
- 生成角度: ${angle}

評価観点:
- 目元
- 眉
- 鼻
- 口元
- 輪郭
- 顎
- 頬
- 耳
- 首
- 年齢感
- 顔全体の比率
- その人らしい印象

これは正確な本人判定ではなく、相談用の一致度目安です。
0〜100点で、参考用の本人らしさスコアを返してください。
80〜100: high
60〜79: medium
0〜59: low

JSONのみで返してください。
{
  "score": 84,
  "level": "high",
  "reason": "短い理由",
  "warnings": ["必要な注意"]
}`
            },
            ...referenceImages.map((imageUrl) => ({
              type: "input_image" as const,
              image_url: imageUrl,
              detail: "low" as const
            })),
            {
              type: "input_image",
              image_url: generatedImageUrl,
              detail: "low"
            }
          ]
        }
      ],
      max_output_tokens: 500
    });
    const text = response.output_text.trim();
    const jsonText = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "");
    const result = normalizeIdentityCheckResult(JSON.parse(jsonText));

    console.log("identity check completed", {
      angle,
      score: result.score,
      level: result.level,
      warningCount: result.warnings.length
    });

    return result;
  } catch (error) {
    console.error("identity check failed", {
      angle,
      error
    });

    return fallbackResult;
  }
}
