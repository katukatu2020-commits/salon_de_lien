export type GeneratedImageQualityCheckResult = {
  ok: boolean;
  reason: string;
  warnings: string[];
};

const failedResult: GeneratedImageQualityCheckResult = {
  ok: false,
  reason: "生成画像が破綻したため保存しませんでした。別の方式で再生成してください。",
  warnings: ["画像品質チェックを実行できませんでした。"]
};

function normalizeQualityCheckResult(value: unknown): GeneratedImageQualityCheckResult {
  const parsed = value as Partial<GeneratedImageQualityCheckResult>;

  return {
    ok: parsed.ok === true,
    reason:
      typeof parsed.reason === "string" && parsed.reason.trim().length > 0
        ? parsed.reason
        : "生成画像が破綻したため保存しませんでした。別の方式で再生成してください。",
    warnings: Array.isArray(parsed.warnings)
      ? parsed.warnings.filter((warning): warning is string => typeof warning === "string")
      : []
  };
}

function isBackAngle(angle: string) {
  return angle.includes("後") || angle.includes("back") || angle.includes("蠕後");
}

export async function checkGeneratedImageQuality({
  imageUrl,
  angle,
  provider
}: {
  imageUrl: string;
  angle: string;
  provider?: string;
}): Promise<GeneratedImageQualityCheckResult> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("generated image quality check skipped: OPENAI_API_KEY is not set", {
      angle,
      provider,
      imageUrl
    });
    return failedResult;
  }

  console.log("generated image quality check started", {
    angle,
    provider,
    imageUrl
  });

  try {
    const angleInstruction = isBackAngle(angle)
      ? [
          "Angle-specific rule: this image is intended to be a rear or rear three-quarter hair reference.",
          "For this angle, a visible front face is NOT required.",
          "Do not mark ok=false merely because the face is hidden or turned away.",
          "Accept a single realistic person if the back of head, hair, nape, neck, ears, or top of shoulders are usable.",
          "Still mark ok=false for noise/glitch, collage/fragments, split-screen images, before/after comparison images, two stacked images, multiple hairstyle variations, multiple people, duplicated heads/faces, impossible anatomy, hands dominating the hair, or an image that is not a usable hair reference."
        ].join("\n")
      : [
          "Angle-specific rule: this image should be a usable hair and face/head reference for its requested angle.",
          "For front and side angles, the relevant face/head features should be visible enough to judge the image.",
          "Mark ok=false for noise/glitch, collage/fragments, split-screen images, before/after comparison images, two stacked images, multiple hairstyle variations, multiple people, duplicated heads/faces, or an image that is not one single usable portrait."
        ].join("\n");
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: angleInstruction
            },
            {
              type: "input_text",
              text: `これは髪型シミュレーション画像の品質チェックです。
本人確認や顔認証ではありません。画像が髪型相談用の1人の人物写真として成立しているかだけを判定してください。

以下が1つでも当てはまる場合は ok=false にしてください。
- ノイズだけの画像
- 顔や体の断片のコラージュ
- 複数人の顔が混ざっている
- 顔や頭部が異常に切れている
- 1人の人物として成立していない
- 髪型シミュレーションとして見せられない破綻

問題がなければ ok=true にしてください。
JSONのみで返してください。
{
  "ok": true,
  "reason": "短い理由",
  "warnings": []
}`
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "low"
            }
          ]
        }
      ],
      max_output_tokens: 400
    });
    const text = response.output_text.trim();
    const jsonText = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "");
    const result = normalizeQualityCheckResult(JSON.parse(jsonText));

    console.log("generated image quality check completed", {
      angle,
      provider,
      ok: result.ok,
      warningCount: result.warnings.length
    });

    return result;
  } catch (error) {
    console.error("generated image quality check failed", {
      angle,
      provider,
      imageUrl,
      error
    });

    return failedResult;
  }
}
