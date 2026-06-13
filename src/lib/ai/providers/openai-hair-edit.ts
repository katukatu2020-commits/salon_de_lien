import { put } from "@vercel/blob";
import { buildHairEditMask } from "@/lib/image/build-hair-edit-mask";

type HairLengthIntent = "short" | "medium" | "semiLong" | "long" | "unknown";

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

async function imageUrlToPngBuffer(url: string) {
  const sharp = (await import("sharp")).default;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`参照画像の取得に失敗しました: ${response.status}`);
  }

  return sharp(Buffer.from(await response.arrayBuffer())).png().toBuffer();
}

async function compositeMaskedHairEdit({
  sourceBuffer,
  editedBuffer,
  maskBuffer
}: {
  sourceBuffer: Buffer;
  editedBuffer: Buffer;
  maskBuffer: Buffer;
}) {
  const sharp = (await import("sharp")).default;
  const metadata = await sharp(sourceBuffer).metadata();
  const width = metadata.width;
  const height = metadata.height;

  if (!width || !height) {
    throw new Error("OpenAI編集結果の合成に必要な画像サイズを取得できませんでした。");
  }

  const source = await sharp(sourceBuffer)
    .resize(width, height, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer();
  const edited = await sharp(editedBuffer)
    .resize(width, height, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer();
  const mask = await sharp(maskBuffer)
    .resize(width, height, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer();
  const output = Buffer.alloc(source.length);

  for (let index = 0; index < source.length; index += 4) {
    const editable = mask[index + 3] < 128;
    const input = editable ? edited : source;

    output[index] = input[index];
    output[index + 1] = input[index + 1];
    output[index + 2] = input[index + 2];
    output[index + 3] = input[index + 3];
  }

  return sharp(output, {
    raw: {
      width,
      height,
      channels: 4
    }
  })
    .webp({ quality: 90 })
    .toBuffer();
}

function postCompositeEnabled() {
  return process.env.OPENAI_HAIR_EDIT_POST_COMPOSITE === "true";
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

function shouldIncludeSupportReferences() {
  return process.env.OPENAI_HAIR_EDIT_INCLUDE_SUPPORT_REFERENCES === "true";
}

function inferHairLengthIntent(styleName: string, hairPrompt: string): HairLengthIntent {
  const text = `${styleName}\n${hairPrompt}`.toLowerCase();

  if (
    text.includes("セミロング") ||
    text.includes("semi-long") ||
    text.includes("semi long") ||
    text.includes("鎖骨") ||
    text.includes("肩下") ||
    text.includes("collarbone") ||
    text.includes("below shoulder")
  ) {
    return "semiLong";
  }

  if (
    text.includes("ロング") ||
    text.includes("long hair") ||
    text.includes("胸") ||
    text.includes("バスト") ||
    text.includes("chest length")
  ) {
    return "long";
  }

  if (
    text.includes("ミディ") ||
    text.includes("ミディアム") ||
    text.includes("medium") ||
    text.includes("shoulder length") ||
    text.includes("肩") ||
    text.includes("ボブ")
  ) {
    return "medium";
  }

  if (text.includes("ショート") || text.includes("short")) {
    return "short";
  }

  return "unknown";
}

function hairLengthContract(lengthIntent: HairLengthIntent) {
  if (lengthIntent === "long") {
    return [
      "Hair length is a hard requirement: create long hair, not a bob or short cut.",
      "The finished hair must clearly extend below the shoulders where the view allows it.",
      "Use the editable outer hair and nape/shoulder-adjacent mask area to add length while preserving protected identity pixels."
    ].join("\n");
  }

  if (lengthIntent === "semiLong") {
    return [
      "Hair length is a hard requirement: create semilong hair, not a short cut or short bob.",
      "The finished hair must read as collarbone to below-shoulder length where the view allows it.",
      "Keep visible side and back length. Do not collapse the requested semilong style into a compact short silhouette."
    ].join("\n");
  }

  if (lengthIntent === "medium") {
    return [
      "Hair length is a hard requirement: create medium-length hair, not a short cut.",
      "The finished hair should read as around jaw-to-shoulder or shoulder-length depending on the selected style.",
      "Do not shorten the selected medium style into a compact short silhouette."
    ].join("\n");
  }

  return null;
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
  angle,
  styleConsistencyPrompt
}: {
  styleName: string;
  hairPrompt: string;
  angle: HairEditAngle;
  styleConsistencyPrompt?: string;
}) {
  const lengthIntent = inferHairLengthIntent(styleName, hairPrompt);
  const lengthContract = hairLengthContract(lengthIntent);

  return [
    "This is an image edit of the identity master image, not a new person generation.",
    "The identity master image was created to preserve the person's identity.",
    "The identity master image is the single source of truth for skull shape, head shape, face geometry, jawline, ears, neck, shoulders, body direction, lighting, and composition.",
    "Keep every masked/protected pixel visually unchanged from the identity master. Edit only the transparent mask area.",
    "Do not reinterpret, redraw, recompose, or replace the person from any other reference.",
    "Treat this as a conservative retouch, not a transformation.",
    "Return exactly one single realistic photo.",
    "Do not create a collage, split-screen image, before/after comparison, two stacked images, or multiple hairstyle variations.",
    "Do not duplicate the face, head, or person.",
    "Keep the same single square-photo composition as the identity master image.",
    "Do not change the face.",
    "Do not change the eyes, eyebrows, nose, mouth, jawline, face shape, ears, neck, skin texture, age impression, expression, or facial proportions.",
    "Do not change the visible cheek contour, temple contour, forehead shape, ear shape, nape shape, or neck silhouette.",
    "Only modify the hair.",
    "This edit uses a mask. Only edit the transparent masked hair-related area.",
    "Do not modify any unmasked area.",
    "The unmasked face, head silhouette, neck, shoulders, and body areas must remain identical to the source image.",
    "Preserve all unmasked pixels as closely as possible.",
    "Only change hair length, bangs, side hair, neckline hair, top volume, hair flow, and hair texture inside the editable mask.",
    lengthContract ??
      "If the requested hairstyle would require changing the face, head shape, neck, ears, shoulders, pose, or composition, keep the identity master unchanged and apply only a subtle hair texture or volume adjustment.",
    `New hairstyle: ${styleName}`,
    `Hair details: ${hairPrompt}`,
    lengthContract ? `Detected hair length intent: ${lengthIntent}` : null,
    styleConsistencyPrompt ? `Cross-angle hairstyle consistency contract:\n${styleConsistencyPrompt}` : null,
    anglePrompt(angle),
    "Keep the neutral studio background, soft even lighting, and composition.",
    "Do not beautify the face.",
    "Do not make the person younger.",
    "Do not redraw the person.",
    "Do not generate a different person.",
    "この編集ではマスクを使用しています。",
    "編集対象の髪周辺だけを変更してください。",
    "マスク外の顔、目、眉、鼻、口、顎、頬、耳、首、肌、表情、年齢感、顔比率は変更しないでください。",
    "マスク外の領域は元画像と同じに保ってください。",
    "変更してよいのは髪の長さ、前髪、サイド、襟足、トップ、毛流れ、髪質だけです。",
    "これは本人性基準画像をもとにした画像編集です。",
    "人物を新しく生成しないでください。",
    "顔、目、眉、鼻、口、顎、輪郭、耳、首、肌質、年齢感、表情、顔比率を変更しないでください。",
    "変更してよいのは髪型だけです。",
    "前髪、サイド、襟足、トップ、毛流れ、束感、ボリュームのみを提案内容に合わせて変更してください。"
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

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

export async function editHairWithOpenAi({
  customerId,
  styleName,
  hairPrompt,
  identityMasterImageUrl,
  referenceFrontUrls,
  referenceSideUrls,
  referenceBackUrls,
  angle,
  styleConsistencyPrompt
}: {
  customerId: string;
  styleName: string;
  hairPrompt: string;
  identityMasterImageUrl: string;
  referenceFrontUrls: string[];
  referenceSideUrls: string[];
  referenceBackUrls: string[];
  angle: HairEditAngle;
  styleConsistencyPrompt?: string;
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
  const { toFile } = await import("openai/uploads");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const lengthIntent = inferHairLengthIntent(styleName, hairPrompt);
  const supportUrls = shouldIncludeSupportReferences()
    ? supplementalReferences({
        angle,
        referenceFrontUrls,
        referenceSideUrls,
        referenceBackUrls
      })
    : [];
  const identityMasterBuffer = await imageUrlToPngBuffer(identityMasterImageUrl);
  let maskBuffer: Buffer | undefined;
  let maskFile: Awaited<ReturnType<typeof toFile>> | undefined;

  try {
    maskBuffer = await buildHairEditMask({
      imageBuffer: identityMasterBuffer,
      angle,
      lengthIntent
    });

    maskFile = await toFile(maskBuffer, "hair-edit-mask.png", {
      type: "image/png"
    });
  } catch (error) {
    console.error("hair edit mask failed", {
      customerId,
      angle,
      error
    });

    if (process.env.ALLOW_UNMASKED_HAIR_EDIT_FALLBACK !== "true") {
      console.warn("unmasked hair edit fallback disabled", {
        customerId,
        angle
      });
      throw new Error("顔保護用の編集マスクを作成できなかったため、髪型編集を中止しました。");
    }
  }

  const imageFiles = await Promise.all([
    toFile(identityMasterBuffer, "identity-master.png", {
      type: "image/png"
    }),
    ...supportUrls.map((url, index) => imageUrlToFile(url, `support-${index + 1}.png`))
  ]);

  console.log(maskFile ? "openai hair edit with mask started" : "openai hair edit without mask started", {
    customerId,
    angle,
    lengthIntent,
    supportReferenceCount: supportUrls.length,
    identityMasterLocked: true
  });

  const prompt = buildPrompt({ styleName, hairPrompt, angle, styleConsistencyPrompt });
  const requestedModel = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
  const editParams = {
    image: imageFiles,
    ...(maskFile ? { mask: maskFile } : {}),
    prompt,
    n: 1,
    size: "1024x1024" as const,
    quality: "low" as const,
    output_format: "webp" as const,
    input_fidelity: "high" as const
  };
  let images;

  try {
    images = await client.images.edit({
      ...editParams,
      model: requestedModel
    });
  } catch (error) {
    if (requestedModel !== "gpt-image-1" && isOpenAiImageModelAuthError(error)) {
      console.warn("openai image model failed, retrying with gpt-image-1", {
        customerId,
        angle,
        requestedModel,
        error
      });

      try {
        images = await client.images.edit({
          ...editParams,
          model: "gpt-image-1"
        });
      } catch (fallbackError) {
        if (isOpenAiImageModelAuthError(fallbackError)) {
          throw new Error("OpenAI画像編集の認証またはモデル権限で失敗しました。");
        }

        throw fallbackError;
      }
    } else if (isOpenAiImageModelAuthError(error)) {
      throw new Error("OpenAI画像編集の認証またはモデル権限で失敗しました。");
    } else {
      throw error;
    }
  }
  const generatedImage = images.data?.[0];

  if (!generatedImage?.b64_json && !generatedImage?.url) {
    throw new Error(`OpenAI編集結果が空でした: ${angle}`);
  }

  const imageBuffer = generatedImage.b64_json
    ? Buffer.from(generatedImage.b64_json, "base64")
    : Buffer.from(await (await fetch(generatedImage.url as string)).arrayBuffer());
  const finalImageBuffer = maskBuffer && postCompositeEnabled()
    ? await compositeMaskedHairEdit({
        sourceBuffer: identityMasterBuffer,
        editedBuffer: imageBuffer,
        maskBuffer
      })
    : imageBuffer;
  const safeStyleName = styleName.replace(/[^\w.-]/g, "_");
  const blob = await put(
    `customers/${customerId}/style-simulations/${Date.now()}-openai-edit-${safeStyleName}.webp`,
    finalImageBuffer,
    {
      access: "public",
      addRandomSuffix: true,
      contentType: "image/webp",
      token: process.env.BLOB_READ_WRITE_TOKEN
    }
  );

  console.log(maskFile ? "openai hair edit with mask completed" : "openai hair edit without mask completed", {
    customerId,
    angle,
    url: blob.url
  });

  console.log("openai hair edit stage completed", {
    customerId,
    angle,
    url: blob.url
  });

  return blob.url;
}
