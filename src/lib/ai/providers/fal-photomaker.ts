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

async function selectedReferenceUrls({
  frontImageUrls,
  sideImageUrls,
  backImageUrls,
  targetAngle
}: {
  frontImageUrls: string[];
  sideImageUrls: string[];
  backImageUrls: string[];
  targetAngle: StyleSimulationAngle;
}) {
  if (targetAngle === "side") {
    const limit = imageLimitFromEnv("FAL_SIDE_IDENTITY_IMAGE_LIMIT", 4);

    return Array.from(new Set(sideImageUrls.slice(0, limit))).slice(0, 5);
  }

  if (targetAngle === "back_three_quarter") {
    const primary = backImageUrls.slice(0, imageLimitFromEnv("FAL_BACK_IDENTITY_IMAGE_LIMIT", 1));
    const support = primary.length > 0 ? [] : sideImageUrls.slice(0, imageLimitFromEnv("FAL_SIDE_IDENTITY_IMAGE_LIMIT", 4));
    const fallback = primary.length + support.length > 0 ? [] : frontImageUrls.slice(0, 1);

    return Array.from(new Set([...primary, ...support, ...fallback])).slice(0, 5);
  }

  return Array.from(new Set(frontImageUrls.slice(0, imageLimitFromEnv("FAL_FRONT_IDENTITY_IMAGE_LIMIT", 1)))).slice(0, 5);
}

function imageLimitFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);

  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(5, Math.max(1, Math.round(value)));
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
  targetAngle: StyleSimulationAngle;
}) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set.");
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const referenceUrls = await selectedReferenceUrls(params);
  let addedCount = 0;

  console.log("[identity-master] selected reference image count", referenceUrls.length);
  console.log("[identity-master] selected groups", {
    targetAngle: params.targetAngle,
    mode: "same-angle-reference-only",
    front: referenceUrls.filter((url) => params.frontImageUrls.includes(url)).length,
    side: referenceUrls.filter((url) => params.sideImageUrls.includes(url)).length,
    back: referenceUrls.filter((url) => params.backImageUrls.includes(url)).length
  });

  if (referenceUrls.length === 0) {
    throw new Error("PhotoMakerに渡す参照写真がありません。");
  }

  for (const url of referenceUrls) {
    try {
      const response = await fetch(url, { cache: "no-store" });

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

      const sharp = (await import("sharp")).default;
      const metadata = await sharp(buffer).metadata();

      if (!metadata.width || !metadata.height) {
        console.warn("[identity-master] reference image skipped: missing dimensions");
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
    `customers/${params.customerId}/style-simulations/identity-${params.styleSuggestionId}-${params.targetAngle}-${Date.now()}.zip`,
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

function buildIdentityMasterPrompt(targetAngle: StyleSimulationAngle, anglePrompt: string) {
  if (targetAngle === "front_three_quarter") {
    return [
      "single-person reference-anchored near-front hair consultation photo of img",
      "recreate the uploaded person's face and head pose as closely as possible",
      "one person only, one face only",
      "near-front three-quarter view, face turned only about 10 to 20 degrees from the camera",
      "both eyes visible, one cheek and one side of the face are slightly more visible than the other",
      "one ear may be visible and the other ear may be mostly hidden by perspective or hair",
      "face is close to front-facing but not a perfectly symmetrical passport photo",
      "hair and face are the main subject, salon consultation crop with the full hairstyle and whole head visible",
      "the entire head fits inside the frame with clear margin above the hair and on both sides of the hair",
      "the full hair outline must be visible from top hairline to hair ends, including both side hair volumes",
      "include top of hair, both sides of the hair, face, ears, jawline, neck, collarbone area, and only the top of shoulders",
      "head, hair, and face should dominate the image, not an upper-body portrait",
      "exactly one complete person centered in frame, no second person, no partial face at the edge",
      "keep reference-like lighting, skin texture, crop distance, and camera perspective",
      "Use the uploaded front reference photo as strict identity source data, not inspiration",
      "Follow the primary uploaded front reference more than a blended average of multiple photos",
      "Do not average the person into a generic attractive face",
      "Do not turn this into a studio makeover portrait",
      "Do not change age impression, ethnicity impression, skin texture, eyelid shape, nose bridge, lips, chin, cheek contour, or jaw contour",
      "Preserve the same person's front-face identity from the reference front photos",
      "Preserve eyes, eyebrows, nose, mouth, jawline, face shape, cheeks, ears, neck, skin texture, age impression, and facial proportions",
      "Do not create a hairstyle simulation",
      "Do not change the hairstyle dramatically",
      "This is only a subtle three-quarter front identity master reference image for later hair editing"
    ].join(", ");
  }

  if (targetAngle === "side") {
    return [
      "single-person realistic side profile ID reference portrait of img",
      "one person only, one head only",
      "strict side profile view, face looking horizontally to the side",
      "nose profile clearly visible, jawline clearly visible, ear and neck visible",
      "centered head-and-shoulders portrait, clean neutral background, soft natural lighting, realistic photo",
      "Preserve the same person's side profile identity from the reference side photos",
      "Preserve nose profile, mouth profile, chin line, jawline, ear position, neck line, head shape, skin texture, age impression, and facial proportions",
      "Do not create a hairstyle simulation",
      "Do not change the hairstyle dramatically",
      "This is only a side profile identity master reference image for later hair editing"
    ].join(". ");
  }

  if (targetAngle === "back_three_quarter") {
    return [
      "single-person reference-anchored rear three-quarter photo of img",
      "recreate the uploaded back or side-back reference head direction, crop, and silhouette as closely as possible",
      "one person only, one head only",
      "match the uploaded back or side-back reference angle as closely as possible",
      "if the uploaded reference is rear three-quarter or side-back, do not rotate the person into a straight rear view",
      "back of head, ear, neck, nape, shoulder direction, and head silhouette should follow the uploaded reference",
      "face mostly turned away, do not show a front-facing face",
      "hair and head shape are the main subject, medium close-up crop from top of hair to nape and only the top of shoulders",
      "the whole head fits inside the frame with a small margin around the hair, not a distant upper-body shot",
      "back of head, hair, nape, neck, ears, and only the top of shoulders visible, no full upper body",
      "hands are not visible, do not hold the hair, natural resting pose",
      "keep the uploaded back reference lighting, camera distance, shoulder angle, clothing hint, and background simplicity when visible",
      "Use the uploaded back reference photo as the strict primary identity source, not inspiration",
      "Do not blend front or side features into the rear view when a back reference exists",
      "Do not average the person into a generic attractive silhouette",
      "Do not turn this into a studio makeover portrait",
      "Do not change age impression, head size, head silhouette, ear shape, nape line, neck line, or shoulder direction",
      "Preserve the same person's rear and side silhouette from the reference back and side photos",
      "Preserve head shape, ears, neck, shoulder direction, hairline at the nape, skin texture, age impression, and natural proportions",
      "Preserve the reference head direction, neck length, shoulder angle, crop distance, and visible ear/nape relationship",
      "Do not create a hairstyle simulation",
      "Do not change the hairstyle dramatically",
      "This is only a rear three-quarter identity master reference image for later hair editing"
    ].join(", ");
  }
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

function negativePrompt(targetAngle?: StyleSimulationAngle) {
  const base = [
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
    "studio makeover",
    "beauty portrait",
    "professional retouch",
    "perfect skin",
    "glamour lighting",
    "changed lighting",
    "changed camera angle",
    "changed crop distance",
    "changed clothing",
    "white jacket",
    "different background",
    "makeup",
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
      "partial second face",
      "cropped second face",
      "adjacent face",
      "two heads",
      "overlapping faces",
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
  ];

  if (targetAngle === "side") {
    return [
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
      "abstract pattern",
      "colorful noise",
      "colorful noise pattern",
      "noise pattern",
      "glitch",
      "corrupted image",
      "broken image",
      "mosaic",
      "confetti",
      "random colored shapes",
      "artifacts",
      "distorted face",
      "deformed face",
      "melted face",
      "different person",
      "changed face",
      "beautified face",
      "younger face",
      "over-retouched skin",
      "unrealistic skin",
      "beauty filter",
      "celebrity lookalike",
      "fashion model face",
      "fashion editorial",
      "dramatic lighting",
      "harsh shadows",
      "fantasy",
      "illustration",
      "painting",
      "anime",
      "low quality",
      "blurry",
      "front view",
      "near-front view",
      "three-quarter front view",
      "rear view",
      "back view",
      "multiple angles",
      "duplicated profile"
    ].join(", ");
  }

  if (targetAngle === "back_three_quarter") {
    return [
      ...base,
      "front view",
      "near-front view",
      "three-quarter front view",
      "face looking at camera",
      "both eyes equally visible",
      "full front face",
      "side profile only",
      "multiple angles",
      "full body",
      "half body",
      "upper body",
      "waist-up portrait",
      "distant shot",
      "small head",
      "extreme close-up",
      "macro face crop",
      "cropped top of head",
      "cropped hair",
      "cropped chin",
      "cropped ear",
      "hands",
      "hand touching hair",
      "holding hair",
      "ponytail",
      "hair tie",
      "raised arm"
    ].join(", ");
  }

  if (targetAngle === "front_three_quarter") {
    return [
      ...base,
      "strict side profile",
      "side view",
      "rear view",
      "back view",
      "flat straight-on passport photo",
      "perfectly symmetrical front face",
      "straight-on face",
      "both ears equally visible",
      "both cheeks equally visible",
      "passport photo",
      "ID photo straight front",
      "full body",
      "half body",
      "upper body",
      "waist-up portrait",
      "distant shot",
      "small head",
      "extreme close-up",
      "macro face crop",
      "cropped top of head",
      "cropped hair",
      "cropped chin",
      "cropped ear"
    ].join(", ");
  }

  return base.join(", ");
}

function guidanceScaleForAngle(targetAngle: StyleSimulationAngle) {
  const value = Number(process.env.FAL_IDENTITY_MASTER_GUIDANCE_SCALE);

  if (Number.isFinite(value)) {
    return Math.min(8, Math.max(1, value));
  }

  if (targetAngle === "side") {
    return 4;
  }

  if (targetAngle === "back_three_quarter") {
    return 3.2;
  }

  return 3.5;
}

function inferenceStepsForAngle(targetAngle: StyleSimulationAngle) {
  if (targetAngle === "side" || targetAngle === "back_three_quarter") {
    return 28;
  }

  return 30;
}

function identityMasterCandidateCount() {
  const value = Number(process.env.FAL_IDENTITY_MASTER_CANDIDATE_COUNT ?? 3);

  if (!Number.isFinite(value)) {
    return 3;
  }

  return Math.min(3, Math.max(1, Math.floor(value)));
}

function extractImageUrls(result: unknown): string[] {
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

  return Array.from(
    new Set([
      ...(body.images ?? []).map((image) => image.url).filter((url): url is string => Boolean(url)),
      ...(body.image?.url ? [body.image.url] : []),
      ...(body.url ? [body.url] : [])
    ])
  );
}

async function validateIdentityMasterImages({
  images,
  referenceFrontUrls,
  referenceSideUrls,
  referenceBackUrls,
  minIdentityScore = 75
}: {
  images: StyleSimulationImage[];
  referenceFrontUrls: string[];
  referenceSideUrls: string[];
  referenceBackUrls: string[];
  minIdentityScore?: number | ((angle: StyleSimulationImage["angle"]) => number);
}) {
  const bestByAngle = new Map<StyleSimulationImage["angle"], StyleSimulationImage>();

  for (const image of images) {
    const requiredIdentityScore =
      typeof minIdentityScore === "function" ? minIdentityScore(image.angle) : minIdentityScore;
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
      referenceBackImageUrls: referenceBackUrls,
      generatedImageUrl: image.url,
      angle: image.angle
    });

    if (identityCheck.score < requiredIdentityScore) {
      console.warn("identity master rejected by identity score", {
        angle: image.angle,
        score: identityCheck.score,
        minIdentityScore: requiredIdentityScore,
        level: identityCheck.level,
        reason: identityCheck.reason
      });
      continue;
    }

    console.log("identity master accepted", {
      angle: image.angle,
      score: identityCheck.score,
      minIdentityScore: requiredIdentityScore,
      level: identityCheck.level
    });

    const acceptedImage = {
      ...image,
      identityScore: identityCheck.score,
      warning: identityCheck.warnings.join(" / ") || undefined
    };
    const existingBest = bestByAngle.get(image.angle);

    if (!existingBest || (existingBest.identityScore ?? 0) < identityCheck.score) {
      bestByAngle.set(image.angle, acceptedImage);
    }
  }

  const passed = Array.from(bestByAngle.values());

  console.log("identity master best candidates selected", {
    imageCount: passed.length,
    candidates: passed.map((image) => ({
      angle: image.angle,
      identityScore: image.identityScore
    }))
  });

  return passed;
}

function identityLockReferenceUrls(master: StyleSimulationImage) {
  const frontAngle = ANGLES.find((angle) => angle.key === "front_three_quarter");
  const sideAngle = ANGLES.find((angle) => angle.key === "side");
  const backAngle = ANGLES.find((angle) => angle.key === "back_three_quarter");

  if (master.angle === sideAngle?.label) {
    return {
      referenceFrontImageUrls: [],
      referenceSideImageUrls: [master.url],
      referenceBackImageUrls: []
    };
  }

  if (master.angle === backAngle?.label) {
    return {
      referenceFrontImageUrls: [],
      referenceSideImageUrls: [],
      referenceBackImageUrls: [master.url]
    };
  }

  return {
    referenceFrontImageUrls: frontAngle ? [master.url] : [],
    referenceSideImageUrls: [],
    referenceBackImageUrls: []
  };
}

function openAiHairEditIdentityMinScore() {
  const value = Number(process.env.OPENAI_HAIR_EDIT_IDENTITY_MIN_SCORE ?? 70);

  if (!Number.isFinite(value)) {
    return 70;
  }

  return Math.min(100, Math.max(0, value));
}

function openAiHairEditIdentityRejectScore() {
  const value = Number(process.env.OPENAI_HAIR_EDIT_IDENTITY_REJECT_SCORE ?? 70);

  if (!Number.isFinite(value)) {
    return 70;
  }

  return Math.min(100, Math.max(0, value));
}

function finalOriginalIdentityMinScore(angle: StyleSimulationImage["angle"]) {
  const value = Number(process.env.OPENAI_HAIR_EDIT_ORIGINAL_IDENTITY_MIN_SCORE);

  if (Number.isFinite(value)) {
    return Math.min(100, Math.max(0, value));
  }

  const sideAngle = ANGLES.find((candidate) => candidate.key === "side")?.label;
  const backAngle = ANGLES.find((candidate) => candidate.key === "back_three_quarter")?.label;

  if (angle === sideAngle) {
    return 70;
  }

  if (angle === backAngle) {
    return 75;
  }

  return 72;
}

function identityMasterOpenAiEditMinScore(angle?: StyleSimulationImage["angle"]) {
  const value = Number(process.env.FAL_IDENTITY_MASTER_OPENAI_EDIT_MIN_SCORE);

  if (Number.isFinite(value)) {
    return Math.min(100, Math.max(0, value));
  }

  const frontAngle = ANGLES.find((candidate) => candidate.key === "front_three_quarter")?.label;
  const sideAngle = ANGLES.find((candidate) => candidate.key === "side")?.label;
  const backAngle = ANGLES.find((candidate) => candidate.key === "back_three_quarter")?.label;

  if (angle === frontAngle) {
    return 85;
  }

  if (angle === sideAngle) {
    return 85;
  }

  if (angle === backAngle) {
    return 85;
  }

  return 85;
}

function referenceAnchorFallbackEnabled() {
  return process.env.FAL_IDENTITY_MASTER_REFERENCE_ANCHOR_FALLBACK !== "false";
}

function preferReferenceAnchorMastersEnabled() {
  return process.env.FAL_IDENTITY_MASTER_PREFER_REFERENCE_ANCHOR === "true";
}

function identityMasterRetryCount() {
  const value = Number(process.env.FAL_IDENTITY_MASTER_RETRY_COUNT);

  if (Number.isFinite(value)) {
    return Math.min(3, Math.max(0, Math.floor(value)));
  }

  return referenceAnchorFallbackEnabled() ? 0 : 2;
}

function referenceAnchorUrlForAngle(request: StyleSimulationRequest, targetAngle: StyleSimulationAngle) {
  if (targetAngle === "front_three_quarter") {
    return request.frontImageUrls[0] ?? request.sideImageUrls[0] ?? request.backImageUrls[0] ?? null;
  }

  if (targetAngle === "side") {
    return request.sideImageUrls[0] ?? request.frontImageUrls[0] ?? request.backImageUrls[0] ?? null;
  }

  return request.backImageUrls[0] ?? request.sideImageUrls[0] ?? request.frontImageUrls[0] ?? null;
}

function buildReferenceAnchorMasterImages(
  request: StyleSimulationRequest,
  missingAngles: StyleSimulationAngle[]
): StyleSimulationImage[] {
  const images: StyleSimulationImage[] = [];

  for (const targetAngle of missingAngles) {
    const angle = ANGLES.find((candidate) => candidate.key === targetAngle);
    const url = referenceAnchorUrlForAngle(request, targetAngle);

    if (!angle || !url) {
      continue;
    }

    images.push({
      angle: angle.label,
      url,
      provider: "reference-anchor",
      identityScore: 100,
      warning: "uploaded reference image used as identity anchor because fal identity master drifted"
    });
  }

  return images;
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

  const generationAngles = ANGLES.filter((angle) => params.angles.includes(angle.key));

  if (generationAngles.length === 0) {
    console.log("photomaker stage completed", {
      customerId: params.customerId,
      styleSuggestionId: params.styleSuggestionId,
      imageCount: 0
    });

    return [];
  }

  const model = process.env.FAL_STYLE_MODEL || "photomaker";
  const endpoint = model.includes("/") ? model : "fal-ai/photomaker";
  const images: StyleSimulationImage[] = [];
  const candidateCount = identityMasterCandidateCount();
  const warmupAngle = generationAngles[0];
  const warmupImageArchiveUrl = await createReferenceArchiveUrl({
    ...params,
    targetAngle: warmupAngle.key
  });

  console.log("[identity-master] warm-up generation started", {
    targetAngle: warmupAngle.key,
    reason: "discard first photomaker output to stabilize saved side/back generation"
  });

  await fal.subscribe(endpoint, {
    input: {
      image_archive_url: warmupImageArchiveUrl,
      prompt: buildIdentityMasterPrompt(warmupAngle.key, warmupAngle.masterPrompt),
      negative_prompt: negativePrompt(warmupAngle.key),
      num_images: 1,
      image_size: "square_hd",
      guidance_scale: guidanceScaleForAngle(warmupAngle.key),
      num_inference_steps: inferenceStepsForAngle(warmupAngle.key)
    },
    logs: true
  });

  console.log("[identity-master] warm-up generation discarded", {
    targetAngle: warmupAngle.key
  });

  for (const angle of generationAngles) {
    const imageArchiveUrl = await createReferenceArchiveUrl({
      ...params,
      targetAngle: angle.key
    });
    const result = await fal.subscribe(endpoint, {
      input: {
        image_archive_url: imageArchiveUrl,
        prompt: buildIdentityMasterPrompt(angle.key, angle.masterPrompt),
        negative_prompt: negativePrompt(angle.key),
        num_images: candidateCount,
        image_size: "square_hd",
        guidance_scale: guidanceScaleForAngle(angle.key),
        num_inference_steps: inferenceStepsForAngle(angle.key)
      },
      logs: true
    });
    const imageUrls = extractImageUrls(result);

    if (imageUrls.length === 0) {
      throw new Error(`PhotoMakerの${angle.label} identity master image URLを取得できませんでした。`);
    }

    console.log("[identity-master] generated candidate count", {
      targetAngle: angle.key,
      requestedCount: candidateCount,
      receivedCount: imageUrls.length
    });

    images.push(
      ...imageUrls.map((imageUrl) => ({
        angle: angle.label,
        url: imageUrl,
        provider: "fal-photomaker"
      }))
    );
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
  let passedMasterImages = await validateIdentityMasterImages({
    images: masterImages,
    referenceFrontUrls: request.frontImageUrls,
    referenceSideUrls: request.sideImageUrls,
    referenceBackUrls: request.backImageUrls,
    minIdentityScore: identityMasterOpenAiEditMinScore
  });

  if (preferReferenceAnchorMastersEnabled()) {
    const anchorMasterImages = buildReferenceAnchorMasterImages(request, request.angles);

    if (anchorMasterImages.length > 0) {
      console.warn("[identity-master] preferring uploaded reference anchor masters", {
        customerId: request.customerId,
        styleSuggestionId: request.styleSuggestionId,
        reason: "temporary commercial identity lock: use the user's own uploaded angle references as OpenAI edit masters",
        falAcceptedCount: passedMasterImages.length,
        angles: anchorMasterImages.map((image) => image.angle)
      });

      passedMasterImages = anchorMasterImages;
    }
  }

  for (let retryIndex = 0; retryIndex < identityMasterRetryCount(); retryIndex += 1) {
    const passedAngles = new Set(passedMasterImages.map((image) => image.angle));
    const missingAngles = ANGLES.filter((angle) => request.angles.includes(angle.key) && !passedAngles.has(angle.label)).map(
      (angle) => angle.key
    );

    if (missingAngles.length === 0) {
      break;
    }

    console.log("[identity-master] retrying missing master angles", {
      customerId: request.customerId,
      styleSuggestionId: request.styleSuggestionId,
      retryIndex: retryIndex + 1,
      missingAngles
    });

    const retryMasterImages = await generateIdentityMasterImagesWithPhotoMaker({
      customerId: request.customerId,
      styleSuggestionId: request.styleSuggestionId,
      frontImageUrls: request.frontImageUrls,
      sideImageUrls: request.sideImageUrls,
      backImageUrls: request.backImageUrls,
      angles: missingAngles
    });
    const passedRetryMasterImages = await validateIdentityMasterImages({
      images: retryMasterImages,
      referenceFrontUrls: request.frontImageUrls,
      referenceSideUrls: request.sideImageUrls,
      referenceBackUrls: request.backImageUrls,
      minIdentityScore: identityMasterOpenAiEditMinScore
    });
    const existingAngles = new Set(passedMasterImages.map((image) => image.angle));

    passedMasterImages = [
      ...passedMasterImages,
      ...passedRetryMasterImages.filter((image) => !existingAngles.has(image.angle))
    ];
  }

  if (referenceAnchorFallbackEnabled()) {
    const passedAngles = new Set(passedMasterImages.map((image) => image.angle));
    const missingAngles = ANGLES.filter((angle) => request.angles.includes(angle.key) && !passedAngles.has(angle.label)).map(
      (angle) => angle.key
    );
    const anchorMasterImages = buildReferenceAnchorMasterImages(request, missingAngles);

    if (anchorMasterImages.length > 0) {
      console.warn("[identity-master] using uploaded reference anchor fallback", {
        customerId: request.customerId,
        styleSuggestionId: request.styleSuggestionId,
        reason: "fal identity master did not stay close enough to the uploaded person",
        minIdentityScore: identityMasterOpenAiEditMinScore(),
        angles: anchorMasterImages.map((image) => image.angle)
      });

      passedMasterImages = [...passedMasterImages, ...anchorMasterImages];
    }
  }

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
      const finalQualityCheck = await checkGeneratedImageQuality({
        imageUrl: finalUrl,
        angle: master.angle,
        provider: "fal-identity-master-openai-edit"
      });

      if (!finalQualityCheck.ok) {
        console.warn("openai hair edit rejected by final quality check", {
          customerId: request.customerId,
          styleSuggestionId: request.styleSuggestionId,
          angle: master.angle,
          reason: finalQualityCheck.reason,
          warnings: finalQualityCheck.warnings
        });
        errors.push(`${master.angle}のOpenAI編集後画像が品質チェックを通過しませんでした: ${finalQualityCheck.reason}`);
        continue;
      }

      const identityLock = await checkGeneratedImageIdentity({
        ...identityLockReferenceUrls(master),
        generatedImageUrl: finalUrl,
        angle: master.angle
      });
      const usedReferenceAnchor = master.provider === "reference-anchor";
      const minIdentityScore = usedReferenceAnchor ? 65 : openAiHairEditIdentityMinScore();
      const rejectIdentityScore = usedReferenceAnchor ? 60 : openAiHairEditIdentityRejectScore();

      if (identityLock.score < rejectIdentityScore) {
        console.warn("openai hair edit rejected by identity lock", {
          customerId: request.customerId,
          styleSuggestionId: request.styleSuggestionId,
          angle: master.angle,
          score: identityLock.score,
          minIdentityScore,
          rejectIdentityScore,
          level: identityLock.level,
          reason: identityLock.reason
        });
        errors.push(
          `${master.angle}縺ｮOpenAI邱ｨ髮・′identity lock繧帝夐℃縺励∪縺帙ｓ縺ｧ縺励◆: ${identityLock.score}/${minIdentityScore}`
        );
        continue;
      }

      console.log(identityLock.score < minIdentityScore ? "openai hair edit identity lock warning accepted" : "openai hair edit identity lock passed", {
        customerId: request.customerId,
        styleSuggestionId: request.styleSuggestionId,
        angle: master.angle,
        score: identityLock.score,
        minIdentityScore,
        rejectIdentityScore,
        level: identityLock.level
      });

      let originalIdentityCheck = await checkGeneratedImageIdentity({
        referenceFrontImageUrls: request.frontImageUrls,
        referenceSideImageUrls: request.sideImageUrls,
        referenceBackImageUrls: request.backImageUrls,
        generatedImageUrl: finalUrl,
        angle: master.angle
      });
      const minOriginalIdentityScore = usedReferenceAnchor ? 60 : finalOriginalIdentityMinScore(master.angle);

      if (identityLock.score >= rejectIdentityScore + 10 && originalIdentityCheck.score < minOriginalIdentityScore) {
        const retryOriginalIdentityCheck = await checkGeneratedImageIdentity({
          referenceFrontImageUrls: request.frontImageUrls,
          referenceSideImageUrls: request.sideImageUrls,
          referenceBackImageUrls: request.backImageUrls,
          generatedImageUrl: finalUrl,
          angle: master.angle
        });

        console.log("openai hair edit original identity check retried after score disagreement", {
          customerId: request.customerId,
          styleSuggestionId: request.styleSuggestionId,
          angle: master.angle,
          identityLockScore: identityLock.score,
          firstScore: originalIdentityCheck.score,
          firstLevel: originalIdentityCheck.level,
          retryScore: retryOriginalIdentityCheck.score,
          retryLevel: retryOriginalIdentityCheck.level
        });

        if (retryOriginalIdentityCheck.score > originalIdentityCheck.score) {
          originalIdentityCheck = retryOriginalIdentityCheck;
        }
      }

      if (originalIdentityCheck.score < minOriginalIdentityScore) {
        console.warn("openai hair edit rejected by original identity score", {
          customerId: request.customerId,
          styleSuggestionId: request.styleSuggestionId,
          angle: master.angle,
          score: originalIdentityCheck.score,
          minOriginalIdentityScore,
          level: originalIdentityCheck.level,
          reason: originalIdentityCheck.reason
        });
        errors.push(
          `${master.angle}縺ｮOpenAI邱ｨ髮・′蜈･蜉帙判蜒上→縺ｮ譛ｬ莠ｺ諤ｧ繧帝夐℃縺励∪縺帙ｓ縺ｧ縺励◆: ${originalIdentityCheck.score}/${minOriginalIdentityScore}`
        );
        continue;
      }

      console.log("openai hair edit original identity check passed", {
        customerId: request.customerId,
        styleSuggestionId: request.styleSuggestionId,
        angle: master.angle,
        score: originalIdentityCheck.score,
        minOriginalIdentityScore,
        level: originalIdentityCheck.level
      });

      const warning =
        [
          identityLock.score < minIdentityScore ? `identity lock warning: ${identityLock.score}/${minIdentityScore}` : "",
          ...identityLock.warnings,
          ...originalIdentityCheck.warnings
        ]
          .filter(Boolean)
          .join(" / ") || undefined;

      finalImages.push({
        angle: master.angle,
        url: finalUrl,
        provider: usedReferenceAnchor ? "reference-anchor-openai-edit" : "fal-identity-master-openai-edit",
        identityScore: originalIdentityCheck.score,
        warning
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
  let passedMasterImages = await validateIdentityMasterImages({
    images: masterImages,
    referenceFrontUrls: request.frontImageUrls,
    referenceSideUrls: request.sideImageUrls,
    referenceBackUrls: request.backImageUrls
  });

  if (referenceAnchorFallbackEnabled()) {
    const passedAngles = new Set(passedMasterImages.map((image) => image.angle));
    const missingAngles = ANGLES.filter((angle) => request.angles.includes(angle.key) && !passedAngles.has(angle.label)).map(
      (angle) => angle.key
    );
    const anchorMasterImages = buildReferenceAnchorMasterImages(request, missingAngles);

    if (anchorMasterImages.length > 0) {
      console.warn("[identity-master] using uploaded reference anchor fallback", {
        customerId: request.customerId,
        styleSuggestionId: request.styleSuggestionId,
        provider: "fal-identity-master",
        reason: "fal identity master did not stay close enough to the uploaded person",
        minIdentityScore: 75,
        angles: anchorMasterImages.map((image) => image.angle)
      });

      passedMasterImages = [...passedMasterImages, ...anchorMasterImages];
    }
  }

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
