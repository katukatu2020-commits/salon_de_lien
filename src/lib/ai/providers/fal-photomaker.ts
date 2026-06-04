import { put } from "@vercel/blob";
import { editHairWithOpenAi } from "@/lib/ai/providers/openai-hair-edit";
import type {
  StyleSimulationAngle,
  StyleSimulationImage,
  StyleSimulationRequest,
  StyleSimulationResult
} from "@/lib/ai/style-simulation-provider";

const ANGLES: Array<{
  key: StyleSimulationAngle;
  label: StyleSimulationImage["angle"];
  masterPrompt: string;
}> = [
  {
    key: "front_three_quarter",
    label: "斜め正面",
    masterPrompt:
      "three-quarter front view, face clearly visible, preserve identity and original facial proportions"
  },
  {
    key: "side",
    label: "横",
    masterPrompt:
      "side profile view, preserve nose profile, jawline, ear position, neck line, and head silhouette"
  },
  {
    key: "back_three_quarter",
    label: "斜め後ろ",
    masterPrompt:
      "rear three-quarter view, preserve head shape, ears, neck, shoulder direction, and natural silhouette"
  }
];

function selectedReferenceUrls({
  frontImageUrls,
  sideImageUrls,
  backImageUrls
}: {
  frontImageUrls: string[];
  sideImageUrls: string[];
  backImageUrls: string[];
}) {
  const front = frontImageUrls.slice(0, 4);
  const side = sideImageUrls.slice(0, 2);
  const back = backImageUrls.slice(0, 1);
  const refs = [...front, ...side, ...back];

  if (refs.length <= 6) {
    return Array.from(new Set(refs));
  }

  if (back.length > 0 && side.length > 1) {
    return Array.from(new Set([...front, side[0], ...back])).slice(0, 6);
  }

  return Array.from(new Set(refs)).slice(0, 6);
}

async function createReferenceArchiveUrl(params: {
  customerId: string;
  styleSuggestionId: string;
  frontImageUrls: string[];
  sideImageUrls: string[];
  backImageUrls: string[];
}) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set.");
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const referenceUrls = selectedReferenceUrls(params);

  if (referenceUrls.length === 0) {
    throw new Error("PhotoMakerに渡す参照写真がありません。");
  }

  for (const [index, url] of referenceUrls.entries()) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`参照画像の取得に失敗しました: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    zip.file(`identity-${index + 1}.${extension}`, Buffer.from(await response.arrayBuffer()));
  }

  const archiveBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const blob = await put(
    `customers/${params.customerId}/style-simulations/identity-${params.styleSuggestionId}-${Date.now()}.zip`,
    archiveBuffer,
    {
      access: "public",
      addRandomSuffix: true,
      contentType: "application/zip",
      token: process.env.BLOB_READ_WRITE_TOKEN
    }
  );

  return blob.url;
}

function buildIdentityMasterPrompt(anglePrompt: string) {
  return [
    "portrait photo of the same person img",
    "identity-preserving neutral salon reference image",
    "preserve the person's facial features, eyes, eyebrows, nose, mouth, jawline, face shape, ears, neck, skin texture, age impression, and facial proportions",
    "Do not change the identity",
    "Do not beautify the face",
    "Do not make the person younger",
    "Keep the hairstyle close to the reference photos; this is an identity master image, not the final hairstyle simulation",
    "Neutral studio background, soft even lighting, natural realistic photo, consultation image for a hair salon",
    anglePrompt
  ].join(", ");
}

function negativePrompt() {
  return [
    "different person",
    "changed face",
    "changed eyes",
    "changed nose",
    "changed mouth",
    "changed jaw",
    "changed face shape",
    "younger face",
    "beautified face",
    "over-retouched skin",
    "fashion model face",
    "celebrity lookalike",
    "symmetrical idealized face",
    "unrealistic",
    "distorted face",
    "bad anatomy",
    "blurry",
    "low quality"
  ].join(", ");
}

function extractImageUrl(result: unknown): string | null {
  const data = result as {
    data?: unknown;
    images?: Array<{ url?: string }>;
    image?: { url?: string };
    url?: string;
  };
  const body = (data.data ?? data) as {
    images?: Array<{ url?: string }>;
    image?: { url?: string };
    url?: string;
  };

  return body.images?.[0]?.url ?? body.image?.url ?? body.url ?? null;
}

export async function generateIdentityMasterImagesWithPhotoMaker(params: {
  customerId: string;
  styleSuggestionId: string;
  frontImageUrls: string[];
  sideImageUrls: string[];
  backImageUrls: string[];
  angles: StyleSimulationAngle[];
}): Promise<StyleSimulationImage[]> {
  console.log("photomaker stage started", {
    customerId: params.customerId,
    styleSuggestionId: params.styleSuggestionId,
    hasFalKey: Boolean(process.env.FAL_KEY),
    frontImageCount: params.frontImageUrls.length,
    sideImageCount: params.sideImageUrls.length,
    backImageCount: params.backImageUrls.length
  });

  if (process.env.ENABLE_IDENTITY_MASTER_GENERATION !== "true") {
    throw new Error("ENABLE_IDENTITY_MASTER_GENERATION=true を設定してください。");
  }

  if (!process.env.FAL_KEY) {
    throw new Error("FAL_KEY is not set. PhotoMakerを使うにはFAL_KEYを設定してください。");
  }

  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials: process.env.FAL_KEY });

  const imageArchiveUrl = await createReferenceArchiveUrl(params);
  const model = process.env.FAL_STYLE_MODEL || "photomaker";
  const endpoint = model.includes("/") ? model : "fal-ai/photomaker";
  const images: StyleSimulationImage[] = [];

  for (const angle of ANGLES.filter((angle) => params.angles.includes(angle.key))) {
    const result = await fal.subscribe(endpoint, {
      input: {
        image_archive_url: imageArchiveUrl,
        prompt: buildIdentityMasterPrompt(angle.masterPrompt),
        negative_prompt: negativePrompt(),
        num_images: 1,
        image_size: "square_hd",
        guidance_scale: 5,
        num_inference_steps: 30
      },
      logs: true
    });
    const imageUrl = extractImageUrl(result);

    if (!imageUrl) {
      throw new Error(`PhotoMakerの${angle.label} identity master image URLを取得できませんでした。`);
    }

    images.push({
      angle: angle.label,
      url: imageUrl,
      provider: "fal-photomaker"
    });
  }

  console.log("photomaker stage completed", {
    customerId: params.customerId,
    styleSuggestionId: params.styleSuggestionId,
    imageCount: images.length
  });

  return images;
}

export async function generateWithFalPhotoMakerThenOpenAiEdit(
  request: StyleSimulationRequest
): Promise<StyleSimulationResult> {
  console.log("style simulation provider: fal-photomaker-openai-edit", {
    customerId: request.customerId,
    styleSuggestionId: request.styleSuggestionId
  });

  const masterImages = await generateIdentityMasterImagesWithPhotoMaker({
    customerId: request.customerId,
    styleSuggestionId: request.styleSuggestionId,
    frontImageUrls: request.frontImageUrls,
    sideImageUrls: request.sideImageUrls,
    backImageUrls: request.backImageUrls,
    angles: request.angles
  });
  const finalImages: StyleSimulationImage[] = [];
  const errors: string[] = [];
  let usedPhotoMakerFallback = false;

  for (const master of masterImages) {
    try {
      const finalUrl = await editHairWithOpenAi({
        customerId: request.customerId,
        styleName: request.styleName,
        hairPrompt: request.hairPrompt,
        identityMasterImageUrl: master.url,
        referenceFrontUrls: request.frontImageUrls,
        referenceSideUrls: request.sideImageUrls,
        referenceBackUrls: request.backImageUrls,
        angle: master.angle
      });

      finalImages.push({
        angle: master.angle,
        url: finalUrl,
        provider: "fal-photomaker-openai-edit"
      });
    } catch (error) {
      console.error("openai hair edit stage failed", {
        customerId: request.customerId,
        styleSuggestionId: request.styleSuggestionId,
        angle: master.angle,
        error
      });
      console.warn("openai hair edit failed, using photomaker master images as final fallback", {
        customerId: request.customerId,
        styleSuggestionId: request.styleSuggestionId,
        angle: master.angle,
        fallbackProvider: "fal-photomaker"
      });
      usedPhotoMakerFallback = true;
      finalImages.push({
        angle: master.angle,
        url: master.url,
        provider: "fal-photomaker"
      });
      errors.push(error instanceof Error ? error.message : `${master.angle}のOpenAI編集に失敗しました。`);
    }
  }

  return {
    ok: finalImages.length > 0,
    provider: "fal-photomaker-openai-edit",
    images: finalImages,
    message:
      usedPhotoMakerFallback
        ? "OpenAI髪型編集で認証エラーが発生したため、FaceID基準画像を保存しました。"
        : errors.length > 0
        ? `一部の角度で生成に失敗しました: ${errors.join(" / ")}`
        : "FaceID基準画像を作成後、髪型編集を行いました。"
  };
}

export async function generateWithFalPhotoMakerOnly(
  request: StyleSimulationRequest
): Promise<StyleSimulationResult> {
  console.log("style simulation provider: fal-photomaker", {
    customerId: request.customerId,
    styleSuggestionId: request.styleSuggestionId
  });

  const masterImages = await generateIdentityMasterImagesWithPhotoMaker({
    customerId: request.customerId,
    styleSuggestionId: request.styleSuggestionId,
    frontImageUrls: request.frontImageUrls,
    sideImageUrls: request.sideImageUrls,
    backImageUrls: request.backImageUrls,
    angles: request.angles
  });

  return {
    ok: masterImages.length > 0,
    provider: "fal-photomaker",
    images: masterImages.map((image) => ({
      ...image,
      provider: "fal-photomaker"
    })),
    message: "FaceID基準画像を生成し、最終画像として保存しました。"
  };
}
