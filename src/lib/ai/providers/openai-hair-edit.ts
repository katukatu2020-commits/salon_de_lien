import { put } from "@vercel/blob";

type HairEditAngle = "斜め正面" | "横" | "斜め後ろ";

async function imageUrlToFile(url: string, fileName: string) {
  const { toFile } = await import("openai/uploads");
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`参照画像の取得に失敗しました: ${response.status}`);
  }

  return toFile(Buffer.from(await response.arrayBuffer()), fileName, {
    type: response.headers.get("content-type") ?? "image/png"
  });
}

function supplementalReferences({
  angle,
  referenceFrontUrls,
  referenceSideUrls,
  referenceBackUrls
}: {
  angle: HairEditAngle;
  referenceFrontUrls: string[];
  referenceSideUrls: string[];
  referenceBackUrls: string[];
}) {
  if (angle === "斜め正面") {
    return [...referenceFrontUrls.slice(0, 2), ...referenceSideUrls.slice(0, 1), ...referenceBackUrls.slice(0, 1)];
  }

  if (angle === "横") {
    return [...referenceSideUrls.slice(0, 2), ...referenceFrontUrls.slice(0, 1), ...referenceBackUrls.slice(0, 1)];
  }

  return [...referenceBackUrls.slice(0, 1), ...referenceSideUrls.slice(0, 2), ...referenceFrontUrls.slice(0, 1)];
}

function anglePrompt(angle: HairEditAngle) {
  if (angle === "斜め正面") {
    return "Three-quarter front view. Preserve the identity master face, eyes, nose, mouth, cheeks, chin, jawline, expression, and facial proportions. Only edit bangs, hair around the face, top volume, side hair, and hair flow.";
  }

  if (angle === "横") {
    return "Side profile view. Preserve the identity master nose profile, mouth, chin line, ear position, neck line, and side facial silhouette. Only edit side hair, hair around the ears, neckline hair, and top volume.";
  }

  return "Rear three-quarter view. Preserve the identity master neck, ears, shoulders, head silhouette, and body direction. Only edit neckline hair, back hair volume, hair flow, and side-to-back hair connection.";
}

function buildPrompt({
  styleName,
  hairPrompt,
  angle
}: {
  styleName: string;
  hairPrompt: string;
  angle: HairEditAngle;
}) {
  return [
    "This is an image edit of the identity master image, not a new person generation.",
    "The identity master image was created to preserve the person's identity.",
    "Do not change the face.",
    "Do not change the eyes, eyebrows, nose, mouth, jawline, face shape, ears, neck, skin texture, age impression, expression, or facial proportions.",
    "Only modify the hair.",
    `New hairstyle: ${styleName}`,
    `Hair details: ${hairPrompt}`,
    anglePrompt(angle),
    "Keep the neutral studio background, soft even lighting, and composition.",
    "Do not beautify the face.",
    "Do not make the person younger.",
    "Do not redraw the person.",
    "Do not generate a different person.",
    "これは本人性基準画像をもとにした画像編集です。",
    "人物を新しく生成しないでください。",
    "顔、目、眉、鼻、口、顎、輪郭、耳、首、肌質、年齢感、表情、顔比率を変更しないでください。",
    "変更してよいのは髪型だけです。",
    "前髪、サイド、襟足、トップ、毛流れ、束感、ボリュームのみを提案内容に合わせて変更してください。"
  ].join("\n");
}

export async function editHairWithOpenAi({
  customerId,
  styleName,
  hairPrompt,
  identityMasterImageUrl,
  referenceFrontUrls,
  referenceSideUrls,
  referenceBackUrls,
  angle
}: {
  customerId: string;
  styleName: string;
  hairPrompt: string;
  identityMasterImageUrl: string;
  referenceFrontUrls: string[];
  referenceSideUrls: string[];
  referenceBackUrls: string[];
  angle: HairEditAngle;
}): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set.");
  }

  console.log("openai hair edit stage started", {
    customerId,
    angle
  });

  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const supportUrls = supplementalReferences({
    angle,
    referenceFrontUrls,
    referenceSideUrls,
    referenceBackUrls
  });
  const imageFiles = await Promise.all([
    imageUrlToFile(identityMasterImageUrl, "identity-master.png"),
    ...supportUrls.map((url, index) => imageUrlToFile(url, `support-${index + 1}.png`))
  ]);

  const images = await client.images.edit({
    image: imageFiles,
    prompt: buildPrompt({ styleName, hairPrompt, angle }),
    model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5",
    n: 1,
    size: "1024x1024",
    quality: "low",
    output_format: "webp",
    input_fidelity: "high"
  });
  const generatedImage = images.data?.[0];

  if (!generatedImage?.b64_json && !generatedImage?.url) {
    throw new Error(`OpenAI編集結果が空でした: ${angle}`);
  }

  const imageBuffer = generatedImage.b64_json
    ? Buffer.from(generatedImage.b64_json, "base64")
    : Buffer.from(await (await fetch(generatedImage.url as string)).arrayBuffer());
  const safeStyleName = styleName.replace(/[^\w.-]/g, "_");
  const blob = await put(
    `customers/${customerId}/style-simulations/${Date.now()}-openai-edit-${safeStyleName}.webp`,
    imageBuffer,
    {
      access: "public",
      addRandomSuffix: true,
      contentType: "image/webp",
      token: process.env.BLOB_READ_WRITE_TOKEN
    }
  );

  console.log("openai hair edit stage completed", {
    customerId,
    angle,
    url: blob.url
  });

  return blob.url;
}
