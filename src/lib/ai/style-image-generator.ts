import { put } from "@vercel/blob";

export async function generateStyleSimulationImages({
  customerId,
  sourceImageUrl,
  styleName,
  imageEditPrompt
}: {
  customerId: string;
  sourceImageUrl: string;
  styleName: string;
  imageEditPrompt: string;
}): Promise<string[]> {
  if (process.env.ENABLE_STYLE_IMAGE_GENERATION !== "true") {
    return [];
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set.");
  }

  const sourceResponse = await fetch(sourceImageUrl);

  if (!sourceResponse.ok) {
    throw new Error(`Failed to fetch source image: ${sourceResponse.status}`);
  }

  const sourceContentType = sourceResponse.headers.get("content-type") ?? "image/png";
  const sourceBytes = Buffer.from(await sourceResponse.arrayBuffer());
  const OpenAI = (await import("openai")).default;
  const { toFile } = await import("openai/uploads");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const sourceFile = await toFile(sourceBytes, "customer-profile.png", { type: sourceContentType });
  const prompt = [
    "顧客本人のプロフィール写真をもとにした、スタッフ向けの自然な髪型シミュレーション画像を作成してください。",
    "顔立ち、骨格バランス、表情、顔の向き、肌の印象、服装、背景はできるだけ維持してください。",
    "髪型、長さ、前髪、サイド、トップ、毛流れ、ボリュームだけを中心に自然に変更してください。",
    "本人を別人化させず、過度に美化せず、仕上がり保証ではないサロン提案用の試着イメージにしてください。",
    `提案スタイル: ${styleName}`,
    imageEditPrompt
  ].join("\n");

  const images = await client.images.edit({
    image: sourceFile,
    prompt,
    model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5",
    n: 1,
    size: "1024x1024",
    quality: "low",
    output_format: "webp",
    input_fidelity: "high"
  });

  const generatedImage = images.data?.[0];

  if (!generatedImage?.b64_json && !generatedImage?.url) {
    return [];
  }

  const imageBuffer = generatedImage.b64_json
    ? Buffer.from(generatedImage.b64_json, "base64")
    : Buffer.from(await (await fetch(generatedImage.url as string)).arrayBuffer());

  const blob = await put(
    `customers/${customerId}/style-simulations/${Date.now()}-${styleName.replace(/[^\w.-]/g, "_")}.webp`,
    imageBuffer,
    {
      access: "public",
      addRandomSuffix: true,
      contentType: "image/webp",
      token: process.env.BLOB_READ_WRITE_TOKEN
    }
  );

  return [blob.url];
}
