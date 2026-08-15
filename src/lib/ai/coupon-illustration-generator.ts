import { put } from "@vercel/blob";
import type { ImageGenerateParamsNonStreaming, ImagesResponse } from "openai/resources/images";

type CouponIllustrationInput = {
  customerId: string;
  couponId: string;
  title: string;
  targetMenu: string;
  theme?: string | null;
  customPrompt?: string | null;
};

type CouponIllustrationResult = {
  ok: boolean;
  imageUrl?: string;
  prompt: string;
  message?: string;
};

function isOpenAiImageModelAuthError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    status?: number;
    code?: string;
    type?: string;
    message?: string;
  };
  const message = candidate.message?.toLowerCase() ?? "";

  return (
    candidate.status === 401 ||
    candidate.status === 403 ||
    candidate.code === "model_not_found" ||
    candidate.code === "permission_denied" ||
    candidate.type === "invalid_request_error" ||
    message.includes("not authorized") ||
    message.includes("does not have access") ||
    message.includes("model")
  );
}

export async function generateCouponIllustration({
  customerId,
  couponId,
  title,
  targetMenu,
  theme,
  customPrompt
}: CouponIllustrationInput): Promise<CouponIllustrationResult> {
  const prompt = [
    "美容室の上品なキャンペーンチラシ用イラスト。",
    "人物の顔は描かない。本人写真や実在人物の再現はしない。",
    "ヘアケア、清潔感、柔らかい雰囲気、明るいサロン、シンプルで印刷に向いたビジュアル。",
    "画像内に文字、数字、クーポンコード、日付、ロゴは入れない。",
    "A4縦チラシの中央に配置しやすい余白のある構図。",
    `テーマ: ${theme || "再来店促進"}`,
    `対象メニュー: ${targetMenu}`,
    `クーポン名: ${title}`,
    customPrompt
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: false,
      prompt,
      message: "OPENAI_API_KEY が未設定のため、イラスト生成をスキップしました。"
    };
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      ok: false,
      prompt,
      message: "BLOB_READ_WRITE_TOKEN が未設定のため、イラスト保存をスキップしました。"
    };
  }

  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const requestedModel = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5";
  const generateParams = {
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "low",
    output_format: "webp",
    stream: false
  } satisfies Omit<ImageGenerateParamsNonStreaming, "model">;
  let images: ImagesResponse;

  try {
    images = await client.images.generate({
      ...generateParams,
      model: requestedModel
    });
  } catch (error) {
    if (requestedModel !== "gpt-image-1" && isOpenAiImageModelAuthError(error)) {
      images = await client.images.generate({
        ...generateParams,
        model: "gpt-image-1"
      });
    } else {
      return {
        ok: false,
        prompt,
        message: error instanceof Error ? error.message : "イラスト生成に失敗しました。"
      };
    }
  }

  const generatedImage = images.data?.[0];

  if (!generatedImage?.b64_json && !generatedImage?.url) {
    return {
      ok: false,
      prompt,
      message: "イラスト生成結果が空でした。"
    };
  }

  const imageBuffer = generatedImage.b64_json
    ? Buffer.from(generatedImage.b64_json, "base64")
    : Buffer.from(await (await fetch(generatedImage.url as string)).arrayBuffer());

  const blob = await put(`customers/${customerId}/coupons/${couponId}/illustration-${Date.now()}.webp`, imageBuffer, {
    access: "public",
    addRandomSuffix: true,
    contentType: "image/webp",
    token: process.env.BLOB_READ_WRITE_TOKEN
  });

  return {
    ok: true,
    imageUrl: blob.url,
    prompt
  };
}
