import { put } from "@vercel/blob";
import { checkGeneratedImageIdentity } from "@/lib/ai/identity-checker";
import { checkGeneratedImageQuality } from "@/lib/ai/image-quality-checker";
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
      "three-quarter front view, face clearly visible, preserve identity and original facial proportions, one person only, one face only"
  },
  {
    key: "side",
    label: "横",
    masterPrompt:
      "side profile view, one person only, one head only, preserve nose profile, jawline, ear position, neck line, and head silhouette"
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
  sideImageUrls
}: {
  frontImageUrls: string[];
  sideImageUrls: string[];
  backImageUrls: string[];
}) {
  const front = frontImageUrls.slice(0, 4);
  const side = sideImageUrls.slice(0, 1);

  return Array.from(new Set([...front, ...side])).slice(0, 5);
}

function imageExtension(contentType: string) {
  if (contentType.includes("image/png")) {
    return "png";
  }

  if (contentType.includes("image/webp")) {
    return "webp";
  }

  if (contentType.includes("image/jpeg") || contentType.includes("image/jpg")) {
    return "jpg";
  }

  return null;
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
  let addedCount = 0;

  console.log("[identity-master] selected reference image count", referenceUrls.length);
  console.log("[identity-master] selected groups", {
    front: params.frontImageUrls.slice(0, 4).length,
    side: params.sideImageUrls.slice(0, 1).length,
    back: 0
  });

  if (referenceUrls.length === 0) {
    throw new Error("PhotoMakerに渡す参照写真がありません。");
  }

  for (const url of referenceUrls) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        console.warn("[identity-master] reference image fetch failed", { status: response.status });
        continue;
      }

      const contentType = response.headers.get("content-type") ?? "";
      const extension = imageExtension(contentType);

      if (!extension) {
        console.warn("[identity-master] reference image skipped: unsupported content-type", {
          contentType: contentType || "missing"
        });
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      if (buffer.byteLength === 0) {
        console.warn("[identity-master] reference image skipped: empty response");
        continue;
      }

      addedCount += 1;
      zip.file(`reference-${String(addedCount).padStart(2, "0")}.${extension}`, buffer);
    } catch (error) {
      console.warn("[identity-master] reference image fetch failed", { error });
    }
  }

  if (addedCount === 0) {
    throw new Error("PhotoMakerに渡せる有効な参照画像がありませんでした。");
  }

  const archiveBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  console.log("[identity-master] zip bytes", archiveBuffer.length);
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

  console.log("[identity-master] image_archive_url", blob.url ? "present" : "missing");

  return blob.url;
}

function buildIdentityMasterPrompt(anglePrompt: string) {
  // fal PhotoMaker は最終髪型画像ではなく、本人性の高い基準顔画像を作るために使う。
  // 髪型変更は後段のOpenAI hair editで行う。
  // ここでは髪型を作り込みすぎない。
  return [
    "single-person portrait photo of img",
    "only one person, one face only, solo portrait, centered head-and-shoulders composition",
    "no other people, no second person, no split face, no collage, no comparison image, no duplicated face, no face fragments",
    "identity master reference image for a hair salon consultation",
    "preserve the same person's identity from the reference images",
    "preserve facial features, eyes, eyebrows, nose, mouth, jawline, face shape, cheeks, ears, neck, skin texture, age impression, and facial proportions",
    "Keep the hairstyle close to the reference photos",
    "Do not create the final hairstyle simulation yet",
    "Use neutral, simple, tidy hair that keeps the face visible",
    "Do not beautify the face",
    "Do not make the person younger",
    "Do not retouch the skin heavily",
    "Neutral studio background, soft even lighting, natural realistic photo, one person only",
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
    "low quality",
    "multiple people",
    "two people",
    "second person",
    "group photo",
    "two faces",
    "duplicate face",
    "split face",
    "face collage",
    "comparison image",
    "before and after",
    "face fragments",
    "cropped facial parts",
    "extra eyes",
    "extra nose",
    "extra mouth",
    "abstract noise",
    "corrupted image",
    "colorful noise pattern",
    "glitch",
    "broken image",
    "different person",
    "changed face",
    "beautified face",
    "younger face",
    "over-retouched skin",
    "celebrity lookalike",
    "fashion model face"
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

async function validateIdentityMasterImages({
  images,
  referenceFrontUrls,
  referenceSideUrls
}: {
  images: StyleSimulationImage[];
  referenceFrontUrls: string[];
  referenceSideUrls: string[];
}) {
  const passed: StyleSimulationImage[] = [];

  for (const image of images) {
    const qualityCheck = await checkGeneratedImageQuality({
      imageUrl: image.url,
      angle: image.angle,
      provider: image.provider
    });

    if (!qualityCheck.ok) {
      console.warn("identity master rejected by quality check", {
        angle: image.angle,
        reason: qualityCheck.reason,
        warnings: qualityCheck.warnings
      });
      continue;
    }

    const identityCheck = await checkGeneratedImageIdentity({
      referenceFrontImageUrls: referenceFrontUrls,
      referenceSideImageUrls: referenceSideUrls,
      generatedImageUrl: image.url,
      angle: image.angle
    });

    if (identityCheck.score < 75) {
      console.warn("identity master rejected by identity score", {
        angle: image.angle,
        score: identityCheck.score,
        level: identityCheck.level,
        reason: identityCheck.reason
      });
      continue;
    }

    passed.push({
      ...image,
      identityScore: identityCheck.score,
      warning: identityCheck.warnings.join(" / ") || undefined
    });
  }

  return passed;
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

export async function generateWithFalIdentityMasterThenOpenAiEdit(
  request: StyleSimulationRequest
): Promise<StyleSimulationResult> {
  console.log("style simulation provider: fal-identity-master-openai-edit", {
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
  const passedMasterImages = await validateIdentityMasterImages({
    images: masterImages,
    referenceFrontUrls: request.frontImageUrls,
    referenceSideUrls: request.sideImageUrls
  });

  if (passedMasterImages.length === 0) {
    return {
      ok: false,
      provider: "fal-identity-master-openai-edit",
      images: [],
      message:
        "FaceID基準画像の本人らしさが低いため、髪型編集に進めませんでした。参照写真を見直すか、OpenAI安定版で再生成してください。"
    };
  }

  const finalImages: StyleSimulationImage[] = [];
  const errors: string[] = [];

  for (const master of passedMasterImages) {
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
        provider: "fal-identity-master-openai-edit"
      });
    } catch (error) {
      console.error("openai hair edit stage failed", {
        customerId: request.customerId,
        styleSuggestionId: request.styleSuggestionId,
        angle: master.angle,
        error
      });
      console.warn("openai hair edit failed; identity master image was not saved as final output", {
        customerId: request.customerId,
        styleSuggestionId: request.styleSuggestionId,
        angle: master.angle
      });
      errors.push(error instanceof Error ? error.message : `${master.angle}のOpenAI編集に失敗しました。`);
    }
  }

  return {
    ok: finalImages.length > 0,
    provider: "fal-identity-master-openai-edit",
    images: finalImages,
    message:
      errors.length > 0
        ? `一部の角度で生成に失敗しました: ${errors.join(" / ")}`
        : "FaceID基準画像が本人らしさチェックを通過したため、髪型編集を行いました。"
  };
}

export async function generateWithFalIdentityMasterOnly(
  request: StyleSimulationRequest
): Promise<StyleSimulationResult> {
  console.log("style simulation provider: fal-identity-master", {
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
  const passedMasterImages = await validateIdentityMasterImages({
    images: masterImages,
    referenceFrontUrls: request.frontImageUrls,
    referenceSideUrls: request.sideImageUrls
  });

  if (passedMasterImages.length === 0) {
    return {
      ok: false,
      provider: "fal-identity-master",
      images: [],
      message:
        "FaceID基準画像の本人らしさが低いため、髪型編集に進めませんでした。参照写真を見直すか、OpenAI安定版で再生成してください。"
    };
  }

  return {
    ok: true,
    provider: "fal-identity-master",
    images: [],
    message:
      "FaceID基準画像を生成し、本人らしさチェックを通過しました。これは最終髪型シミュレーション画像としては保存していません。"
  };
}

export const generateWithFalPhotoMakerThenOpenAiEdit = generateWithFalIdentityMasterThenOpenAiEdit;
export const generateWithFalPhotoMakerOnly = generateWithFalIdentityMasterOnly;
