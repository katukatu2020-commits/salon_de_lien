import { put } from "@vercel/blob";

const STYLE_IMAGE_ANGLES = [
  {
    label: "斜め正面",
    slug: "front-three-quarter",
    prompt:
      "顧客本人のプロフィール写真を参考に、顔立ち・表情・雰囲気をできるだけ維持し、髪型だけを自然に変更してください。斜め正面から見たサロン提案用の髪型シミュレーション。顔型・骨格バランスの写真上の印象を参考に、トップ・前髪・サイドのバランスが分かるようにしてください。別人化させず、過度に美化しないでください。"
  },
  {
    label: "横",
    slug: "side",
    prompt:
      "顧客本人のプロフィール写真を参考に、横から見た髪型シミュレーションを作成してください。顔立ちや頭の形の印象をできるだけ維持し、サイド・襟足・後頭部のボリュームが分かる自然なサロン提案画像にしてください。髪型のみを中心に変更し、別人化させないでください。"
  },
  {
    label: "斜め後ろ",
    slug: "back-three-quarter",
    prompt:
      "顧客本人のプロフィール写真を参考に、斜め後ろから見た髪型シミュレーションを作成してください。後頭部の丸み、襟足、毛流れ、サイドとのつながりが分かるようにしてください。顔の再現よりも、本人の頭部シルエットと髪型提案の参考になる自然な画像にしてください。"
  }
] as const;

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
  const safeStyleName = styleName.replace(/[^\w.-]/g, "_");
  const generatedUrls: string[] = [];

  for (const angle of STYLE_IMAGE_ANGLES) {
    const sourceFile = await toFile(sourceBytes, "customer-profile.png", { type: sourceContentType });
    const prompt = [
      "本人写真と顔型・骨格バランスの印象を参考にした、相談用の角度別髪型シミュレーション画像を作成してください。",
      "骨格診断や仕上がり保証ではありません。顔立ち、表情、雰囲気はできるだけ維持し、髪型部分を中心に自然に変更してください。",
      "顧客のNG条件を守り、別人化や過度な美化を避けてください。",
      `提案スタイル: ${styleName}`,
      angle.prompt,
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
      continue;
    }

    const imageBuffer = generatedImage.b64_json
      ? Buffer.from(generatedImage.b64_json, "base64")
      : Buffer.from(await (await fetch(generatedImage.url as string)).arrayBuffer());

    const blob = await put(
      `customers/${customerId}/style-simulations/${Date.now()}-${angle.slug}-${safeStyleName}.webp`,
      imageBuffer,
      {
        access: "public",
        addRandomSuffix: true,
        contentType: "image/webp",
        token: process.env.BLOB_READ_WRITE_TOKEN
      }
    );

    generatedUrls.push(blob.url);
  }

  return generatedUrls;
}
