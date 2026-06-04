import { put } from "@vercel/blob";

const STYLE_IMAGE_ANGLES = [
  {
    key: "front",
    label: "斜め正面",
    slug: "front-three-quarter",
    prompt:
      "斜め正面の参照写真を基準にしてください。顔の輪郭、目元、鼻、口元、頬、顎、表情、顔の向きを維持し、髪型だけを変更してください。前髪、顔周り、トップ、サイドのバランスのみを自然に調整してください。"
  },
  {
    key: "side",
    label: "横",
    slug: "side",
    prompt:
      "横顔の参照写真を基準にしてください。鼻、口、顎、首、耳の位置、横顔の輪郭を維持してください。サイド、耳まわり、襟足、後頭部の丸み、トップの高さだけを髪型として調整してください。横顔の人物自体を作り替えないでください。"
  },
  {
    key: "back",
    label: "斜め後ろ",
    slug: "back-three-quarter",
    prompt:
      "斜め後ろの参照写真を基準にしてください。首、耳、肩、後頭部のシルエット、頭の向き、写真の構図を維持してください。襟足、後頭部の丸み、毛流れ、サイドとのつながりだけを変更してください。顔を新しく生成し直さないでください。"
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
      "本人性維持優先。髪型のみ編集。顔パーツ変更禁止。自然な試着イメージ。",
      "この画像は人物生成ではなく、本人写真の髪型編集です。",
      "参照写真の本人性を最優先してください。",
      "顔の輪郭、目、鼻、口、耳、首、表情、肌の質感、年齢感、顔の向き、構図は可能な限り維持してください。",
      "髪型以外は変更しないでください。",
      "変更してよいものは、髪の長さ、前髪、サイド、襟足、トップの高さ、毛流れ、束感、ボリュームだけです。",
      "美容広告風に美化せず、元写真の自然さを維持してください。",
      "若返らせる、目を大きくする、鼻筋を変える、顎を細くする、肌を過度に補正する、服装や背景を大きく変えることは禁止です。",
      "モデル写真風に作り替えたり、顔立ちを理想化したり、別人のように見える変更は禁止です。",
      "仕上がり保証ではない、スタッフと顧客が相談するための自然なサロン試着イメージにしてください。",
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
