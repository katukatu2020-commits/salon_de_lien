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
