import { put } from "@vercel/blob";

const STYLE_IMAGE_ANGLES = [
  {
    key: "front",
    label: "斜め正面",
    slug: "front-three-quarter",
    prompt:
      "斜め正面の本人参照写真を主に参考にしてください。前髪、顔周り、トップ、サイド、全体バランスが分かる相談用シミュレーションにしてください。顔立ち、輪郭、年齢感、肌色、目鼻立ちは不必要に変えず、髪型だけを自然に変更してください。"
  },
  {
    key: "side",
    label: "横",
    slug: "side",
    prompt:
      "横の本人参照写真を主に参考にしてください。フェイスライン、耳まわり、サイド、襟足、トップの高さが分かる相談用シミュレーションにしてください。頭部シルエットと骨格バランスの写真上の印象を保ち、髪型だけを自然に変更してください。"
  },
  {
    key: "back",
    label: "斜め後ろ",
    slug: "back-three-quarter",
    prompt:
      "斜め後ろの本人参照写真を主に参考にしてください。後頭部、襟足、耳まわり、毛流れ、サイドとのつながりが分かる相談用シミュレーションにしてください。顔の再現よりも本人の頭部シルエットと髪型提案の参考になる自然な画像にしてください。"
  }
] as const;

type ReferenceImageUrls = {
  front: string;
  side: string;
  back: string;
};

export async function generateStyleSimulationImages({
  customerId,
  referenceImageUrls,
  styleName,
  imageEditPrompt
}: {
  customerId: string;
  referenceImageUrls: ReferenceImageUrls;
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

  const OpenAI = (await import("openai")).default;
  const { toFile } = await import("openai/uploads");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const safeStyleName = styleName.replace(/[^\w.-]/g, "_");
  const generatedUrls: string[] = [];

  for (const angle of STYLE_IMAGE_ANGLES) {
    const sourceImageUrl = referenceImageUrls[angle.key];
    const sourceResponse = await fetch(sourceImageUrl);

    if (!sourceResponse.ok) {
      throw new Error(`Failed to fetch ${angle.label} reference image: ${sourceResponse.status}`);
    }

    const sourceContentType = sourceResponse.headers.get("content-type") ?? "image/png";
    const sourceBytes = Buffer.from(await sourceResponse.arrayBuffer());
    const sourceFile = await toFile(sourceBytes, `${angle.slug}-reference.png`, { type: sourceContentType });
    const prompt = [
      "本人写真と顔型・骨格バランスの印象を参考にした相談用シミュレーションを作成してください。",
      "髪型だけを変え、本人の顔立ち・輪郭・骨格印象は極力維持してください。",
      "別人化を避け、年齢感、肌色、目鼻立ちを不必要に変えないでください。",
      "美化しすぎず、仕上がり保証ではない自然なサロン相談用画像にしてください。",
      `生成角度: ${angle.label}`,
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
