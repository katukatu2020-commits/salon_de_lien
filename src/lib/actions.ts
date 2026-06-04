"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateCourseRecommendations } from "@/lib/ai/course-recommender";
import { generateStyleSimulationImages } from "@/lib/ai/style-image-generator";
import {
  attachSimulationImages,
  fallbackAdvisorResult,
  type StyleSuggestionDraft
} from "@/lib/ai/style-advisor";
import { generateAiStyleSuggestionDrafts } from "@/lib/style-suggestion";
import { buildStyleSuggestionContext } from "@/lib/style-suggestion";
import {
  nullableBoolean,
  nullableInt,
  nullableString,
  requiredDate,
  requiredString
} from "@/lib/form";

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type StyleImageGenerationState = {
  ok: boolean;
  message: string;
  imageUrls?: string[];
  selectedSuggestionId?: string;
};

type StyleSuggestionGenerationState = {
  ok: boolean;
  message: string;
  suggestionIds?: string[];
  selectedSuggestionId?: string;
};

type AiReferencePhotoAngle = "front" | "side" | "back";

type AiReferencePhotoUploadState = {
  ok: boolean;
  message: string;
  imageUrl?: string;
  cacheKey?: number;
};

const STYLE_IMAGE_ANGLES = ["斜め正面", "横", "斜め後ろ"] as const;

const AI_REFERENCE_PHOTO_CONFIG: Record<
  AiReferencePhotoAngle,
  { field: "aiFrontImageUrl" | "aiSideImageUrl" | "aiBackImageUrl"; label: string; slug: string }
> = {
  front: { field: "aiFrontImageUrl", label: "斜め正面", slug: "front-three-quarter" },
  side: { field: "aiSideImageUrl", label: "横", slug: "side" },
  back: { field: "aiBackImageUrl", label: "斜め後ろ", slug: "back-three-quarter" }
};

type StyleImageUrlEntry = {
  angle: string;
  url: string;
};

function parseImageUrlEntries(imageUrlsJson: string | null, fallback: string[] = []): StyleImageUrlEntry[] {
  if (!imageUrlsJson) {
    return fallback.map((url, index) => ({
      angle: STYLE_IMAGE_ANGLES[index] ?? `画像${index + 1}`,
      url
    }));
  }

  try {
    const parsed = JSON.parse(imageUrlsJson) as unknown;
    if (!Array.isArray(parsed)) {
      return fallback.map((url, index) => ({
        angle: STYLE_IMAGE_ANGLES[index] ?? `画像${index + 1}`,
        url
      }));
    }

    return parsed
      .map((item, index): StyleImageUrlEntry | null => {
        if (typeof item === "string") {
          return {
            angle: STYLE_IMAGE_ANGLES[index] ?? `画像${index + 1}`,
            url: item
          };
        }

        if (
          typeof item === "object" &&
          item !== null &&
          typeof (item as { url?: unknown }).url === "string"
        ) {
          return {
            angle:
              typeof (item as { angle?: unknown }).angle === "string"
                ? ((item as { angle: string }).angle)
                : STYLE_IMAGE_ANGLES[index] ?? `画像${index + 1}`,
            url: (item as { url: string }).url
          };
        }

        return null;
      })
      .filter((entry): entry is StyleImageUrlEntry => Boolean(entry));
  } catch {
    return fallback.map((url, index) => ({
      angle: STYLE_IMAGE_ANGLES[index] ?? `画像${index + 1}`,
      url
    }));
  }
}

export async function createCustomer(formData: FormData) {
  const customer = await prisma.customer.create({
    data: {
      name: requiredString(formData, "name"),
      gender: nullableString(formData, "gender"),
      birthYear: nullableInt(formData, "birthYear"),
      phone: nullableString(formData, "phone"),
      memo: nullableString(formData, "memo")
    }
  });

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(customerId: string, formData: FormData) {
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: requiredString(formData, "name"),
      gender: nullableString(formData, "gender"),
      birthYear: nullableInt(formData, "birthYear"),
      phone: nullableString(formData, "phone"),
      memo: nullableString(formData, "memo")
    }
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
}

export async function deleteCustomer(customerId: string, formData?: FormData) {
  if (formData && formData.get("confirmDelete") !== "yes") {
    throw new Error("削除確認にチェックを入れてください。");
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: { deletedAt: new Date() }
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  redirect("/customers");
}

export async function uploadCustomerProfileImage(
  customerId: string,
  _previousState: { ok: boolean; message: string; imageUrl?: string; cacheKey?: number },
  formData: FormData
) {
  try {
    const imageFile = formData.get("profileImage");

    if (!(imageFile instanceof File) || imageFile.size === 0) {
      return { ok: false, message: "プロフィール画像を選択してください。" };
    }

    if (!ALLOWED_PROFILE_IMAGE_TYPES.includes(imageFile.type)) {
      return { ok: false, message: "プロフィール画像は JPG / PNG / WebP のみアップロードできます。" };
    }

    if (imageFile.size > MAX_PROFILE_IMAGE_SIZE) {
      return { ok: false, message: "プロフィール画像は5MB以下にしてください。" };
    }

    const extension = imageFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeFileName = imageFile.name.replace(/[^\w.-]/g, "_");
    const cacheKey = Date.now();
    const blobPath = `customers/${customerId}/profile-${cacheKey}-${safeFileName || `image.${extension}`}`;
    const blob = await put(blobPath, imageFile, {
      access: "public",
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    await prisma.customer.update({
      where: { id: customerId },
      data: { profileImageUrl: blob.url }
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${customerId}`);

    return {
      ok: true,
      message: "画像を更新しました。",
      imageUrl: blob.url,
      cacheKey
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "画像アップロードに失敗しました。"
    };
  }
}

export async function uploadCustomerAiReferencePhoto(
  customerId: string,
  angle: AiReferencePhotoAngle,
  _previousState: AiReferencePhotoUploadState,
  formData: FormData
): Promise<AiReferencePhotoUploadState> {
  void _previousState;

  try {
    const config = AI_REFERENCE_PHOTO_CONFIG[angle];
    const imageFile = formData.get("aiReferencePhoto");

    if (!config) {
      return { ok: false, message: "写真の角度が不正です。" };
    }

    if (!(imageFile instanceof File) || imageFile.size === 0) {
      return { ok: false, message: `${config.label}の写真を選択してください。` };
    }

    if (!ALLOWED_PROFILE_IMAGE_TYPES.includes(imageFile.type)) {
      return { ok: false, message: "AIシミュレーション用写真は JPG / PNG / WebP のみ登録できます。" };
    }

    if (imageFile.size > MAX_PROFILE_IMAGE_SIZE) {
      return { ok: false, message: "AIシミュレーション用写真は5MB以下にしてください。" };
    }

    const extension = imageFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeFileName = imageFile.name.replace(/[^\w.-]/g, "_");
    const cacheKey = Date.now();
    const blob = await put(
      `customers/${customerId}/ai-reference/${config.slug}-${cacheKey}-${safeFileName || `image.${extension}`}`,
      imageFile,
      {
        access: "public",
        addRandomSuffix: true,
        token: process.env.BLOB_READ_WRITE_TOKEN
      }
    );

    await prisma.customer.update({
      where: { id: customerId },
      data: { [config.field]: blob.url }
    });

    revalidatePath(`/customers/${customerId}`);

    return {
      ok: true,
      message: `${config.label}の写真を更新しました。`,
      imageUrl: blob.url,
      cacheKey
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "AIシミュレーション用写真のアップロードに失敗しました。"
    };
  }
}

export async function updateCustomerAiPhotoConsent(customerId: string, formData: FormData) {
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      aiPhotoConsent: formData.get("aiPhotoConsent") === "on"
    }
  });

  revalidatePath(`/customers/${customerId}`);
}

export async function upsertHairProfile(customerId: string, formData: FormData) {
  await prisma.hairProfile.upsert({
    where: { customerId },
    create: {
      customerId,
      hairThickness: nullableString(formData, "hairThickness"),
      hairVolume: nullableString(formData, "hairVolume"),
      hairTexture: nullableString(formData, "hairTexture"),
      scalpCondition: nullableString(formData, "scalpCondition"),
      faceShape: nullableString(formData, "faceShape"),
      forehead: nullableString(formData, "forehead"),
      lifestyle: nullableString(formData, "lifestyle"),
      stylingTimeMinutes: nullableInt(formData, "stylingTimeMinutes")
    },
    update: {
      hairThickness: nullableString(formData, "hairThickness"),
      hairVolume: nullableString(formData, "hairVolume"),
      hairTexture: nullableString(formData, "hairTexture"),
      scalpCondition: nullableString(formData, "scalpCondition"),
      faceShape: nullableString(formData, "faceShape"),
      forehead: nullableString(formData, "forehead"),
      lifestyle: nullableString(formData, "lifestyle"),
      stylingTimeMinutes: nullableInt(formData, "stylingTimeMinutes")
    }
  });

  revalidatePath(`/customers/${customerId}`);
}

export async function upsertPreference(customerId: string, formData: FormData) {
  await prisma.preference.upsert({
    where: { customerId },
    create: {
      customerId,
      preferredLength: nullableString(formData, "preferredLength"),
      preferredStyle: nullableString(formData, "preferredStyle"),
      dislikes: nullableString(formData, "dislikes"),
      colorPreference: nullableString(formData, "colorPreference"),
      maintenanceLevel: nullableString(formData, "maintenanceLevel"),
      referenceNotes: nullableString(formData, "referenceNotes")
    },
    update: {
      preferredLength: nullableString(formData, "preferredLength"),
      preferredStyle: nullableString(formData, "preferredStyle"),
      dislikes: nullableString(formData, "dislikes"),
      colorPreference: nullableString(formData, "colorPreference"),
      maintenanceLevel: nullableString(formData, "maintenanceLevel"),
      referenceNotes: nullableString(formData, "referenceNotes")
    }
  });

  revalidatePath(`/customers/${customerId}`);
}

export async function createVisit(customerId: string, formData: FormData) {
  await prisma.visit.create({
    data: {
      customerId,
      visitedAt: requiredDate(formData, "visitedAt"),
      stylistName: nullableString(formData, "stylistName"),
      requestedStyle: nullableString(formData, "requestedStyle"),
      performedStyle: nullableString(formData, "performedStyle"),
      cutNotes: nullableString(formData, "cutNotes"),
      colorNotes: nullableString(formData, "colorNotes"),
      permNotes: nullableString(formData, "permNotes"),
      customerReaction: nullableString(formData, "customerReaction"),
      nextRecommendation: nullableString(formData, "nextRecommendation")
    }
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
}

export async function createStyleSuggestion(customerId: string, formData: FormData) {
  await prisma.styleSuggestion.create({
    data: {
      customerId,
      visitId: nullableString(formData, "visitId"),
      suggestedStyleName: requiredString(formData, "suggestedStyleName"),
      reason: nullableString(formData, "reason"),
      caution: nullableString(formData, "caution"),
      stylingAdvice: nullableString(formData, "stylingAdvice"),
      faceAnalysis: nullableString(formData, "faceAnalysis"),
      imagePrompt: nullableString(formData, "imagePrompt"),
      menuSuggestion: nullableString(formData, "menuSuggestion"),
      estimatedMinutes: nullableInt(formData, "estimatedMinutes"),
      maintenanceLevel: nullableString(formData, "maintenanceLevel"),
      label: nullableString(formData, "label"),
      accepted: nullableBoolean(formData, "accepted")
    }
  });

  revalidatePath(`/customers/${customerId}`);
}

function normalizeSuggestionText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[｜|・,、。.!！?？\-_ー]/g, "");
}

function dedupeByStyleNameAndLabel(suggestions: StyleSuggestionDraft[]) {
  const seen = new Set<string>();
  const unique: StyleSuggestionDraft[] = [];

  for (const suggestion of suggestions) {
    const key = `${normalizeSuggestionText(suggestion.styleName)}:${suggestion.label}`;
    const reasonKey = normalizeSuggestionText(suggestion.reason).slice(0, 60);

    if (seen.has(key) || seen.has(reasonKey)) {
      continue;
    }

    seen.add(key);
    if (reasonKey) {
      seen.add(reasonKey);
    }
    unique.push(suggestion);
  }

  return unique;
}

async function buildUniqueStyleSuggestionDrafts(customerId: string) {
  const aiDrafts = dedupeByStyleNameAndLabel(await generateAiStyleSuggestionDrafts(customerId));

  if (aiDrafts.length >= 3) {
    return aiDrafts.slice(0, 3);
  }

  const context = await buildStyleSuggestionContext(customerId);
  const fallbackDrafts = await attachSimulationImages(
    customerId,
    context.customer.profileImageUrl,
    fallbackAdvisorResult(context)
  );
  const merged = dedupeByStyleNameAndLabel([...aiDrafts, ...fallbackDrafts]);

  return merged.slice(0, 3);
}

async function archiveOpenAiStyleSuggestions(customerId: string) {
  await prisma.styleSuggestion.updateMany({
    where: {
      customerId,
      accepted: false,
      archivedAt: null,
      OR: [
        { label: { in: ["本命", "安全", "挑戦", "AI提案"] } },
        { imagePrompt: { not: null } },
        { faceAnalysis: { not: null } }
      ]
    },
    data: { archivedAt: new Date() }
  });
}

async function createAiStyleSuggestionRecords(
  customerId: string,
  { archiveExisting }: { archiveExisting: boolean }
): Promise<StyleSuggestionGenerationState> {
  try {
    const suggestions = await buildUniqueStyleSuggestionDrafts(customerId);

    if (suggestions.length === 0) {
      return { ok: false, message: "AI髪型提案を作成できませんでした。時間をおいて再試行してください。" };
    }

    const createdSuggestions = await prisma.$transaction(async (tx) => {
      if (archiveExisting) {
        await tx.styleSuggestion.updateMany({
          where: {
            customerId,
            accepted: false,
            archivedAt: null,
            OR: [
              { label: { in: ["本命", "安全", "挑戦", "AI提案"] } },
              { imagePrompt: { not: null } },
              { faceAnalysis: { not: null } }
            ]
          },
          data: { archivedAt: new Date() }
        });
      }

      const created = [];

      for (const suggestion of suggestions) {
        created.push(
          await tx.styleSuggestion.create({
            data: {
              customerId,
              suggestedStyleName: suggestion.styleName,
              reason: suggestion.reason,
              caution: suggestion.caution,
              stylingAdvice: suggestion.stylingAdvice,
              imageUrls: suggestion.imageUrls,
              imageUrlsJson: JSON.stringify(suggestion.imageUrls),
              menuSuggestion: suggestion.menuSuggestion,
              estimatedMinutes: suggestion.estimatedMinutes,
              maintenanceLevel: suggestion.maintenanceLevel,
              label: suggestion.label,
              faceAnalysis: suggestion.faceAnalysis,
              imagePrompt: suggestion.imageEditPrompt,
              accepted: false,
              archivedAt: null
            }
          })
        );
      }

      return created;
    });

    revalidatePath(`/customers/${customerId}`);

    return {
      ok: true,
      message: "AI髪型提案を3案作成しました。",
      suggestionIds: createdSuggestions.map((suggestion) => suggestion.id),
      selectedSuggestionId:
        createdSuggestions.find((suggestion) => suggestion.label === "本命")?.id ?? createdSuggestions[0]?.id
    };
  } catch (error) {
    console.error("style suggestion generation failed", { customerId, error });

    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "AI髪型提案の生成に失敗しました。時間をおいて再試行してください。"
    };
  }
}

export async function createAiStyleSuggestion(
  customerId: string,
  _previousState?: StyleSuggestionGenerationState
): Promise<StyleSuggestionGenerationState> {
  void _previousState;

  return createAiStyleSuggestionRecords(customerId, { archiveExisting: true });
}

export async function regenerateStyleSuggestionsAction(
  customerId: string,
  _previousState?: StyleSuggestionGenerationState
): Promise<StyleSuggestionGenerationState> {
  void _previousState;

  await archiveOpenAiStyleSuggestions(customerId);
  return createAiStyleSuggestionRecords(customerId, { archiveExisting: false });
}

export async function generateCourseRecommendationsAction(customerId: string) {
  const context = await buildStyleSuggestionContext(customerId);
  const recommendations = await generateCourseRecommendations(context);

  await prisma.courseRecommendation.createMany({
    data: recommendations.map((recommendation) => ({
      customerId,
      title: recommendation.title,
      reason: recommendation.reason,
      caution: recommendation.caution,
      estimatedMinutes: recommendation.estimatedMinutes,
      estimatedPrice: recommendation.estimatedPrice,
      priority: recommendation.priority,
      accepted: false
    }))
  });

  revalidatePath(`/customers/${customerId}`);
}

export async function toggleCourseRecommendationAccepted(id: string, customerId: string) {
  const recommendation = await prisma.courseRecommendation.findFirst({
    where: {
      id,
      customerId,
      customer: { deletedAt: null }
    },
    select: { accepted: true }
  });

  if (!recommendation) {
    throw new Error("おすすめコースが見つかりません。");
  }

  await prisma.courseRecommendation.update({
    where: { id },
    data: { accepted: !recommendation.accepted }
  });

  revalidatePath(`/customers/${customerId}`);
}

export async function addStyleSuggestionImageUrl(customerId: string, suggestionId: string, formData: FormData) {
  const imageUrlValue = formData.get("imageUrl");

  if (typeof imageUrlValue !== "string" || imageUrlValue.trim().length === 0) {
    console.warn("manual image url add skipped: imageUrl is empty", {
      customerId,
      suggestionId
    });
    revalidatePath(`/customers/${customerId}`);
    return;
  }

  const imageUrl = imageUrlValue.trim();

  try {
    new URL(imageUrl);
  } catch {
    throw new Error("正しい画像URLを入力してください。");
  }

  const suggestion = await prisma.styleSuggestion.findUnique({
    where: { id: suggestionId },
    select: { imageUrls: true, imageUrlsJson: true }
  });

  if (!suggestion) {
    throw new Error("髪型提案が見つかりません。");
  }

  const existingEntries = parseImageUrlEntries(suggestion.imageUrlsJson, suggestion.imageUrls);
  const nextEntries = [
    ...existingEntries,
    {
      angle: STYLE_IMAGE_ANGLES[existingEntries.length] ?? `画像${existingEntries.length + 1}`,
      url: imageUrl
    }
  ].slice(0, 3);
  const nextUrls = nextEntries.map((entry) => entry.url);

  await prisma.styleSuggestion.update({
    where: { id: suggestionId },
    data: {
      imageUrls: nextUrls,
      imageUrlsJson: JSON.stringify(nextEntries)
    }
  });

  revalidatePath(`/customers/${customerId}`);
}

export async function generateStyleSuggestionImageAction(
  styleSuggestionId: string,
  customerId: string,
  _previousState: StyleImageGenerationState
): Promise<StyleImageGenerationState> {
  void _previousState;

  console.log("image generation started", {
    customerId,
    styleSuggestionId,
    ENABLE_STYLE_IMAGE_GENERATION: process.env.ENABLE_STYLE_IMAGE_GENERATION,
    hasAiReferencePhotos: "lookup_pending",
    OPENAI_IMAGE_MODEL: process.env.OPENAI_IMAGE_MODEL
  });

  try {
    const suggestion = await prisma.styleSuggestion.findFirst({
      where: {
        id: styleSuggestionId,
        customerId,
        customer: { deletedAt: null }
      },
      include: {
        customer: {
          select: {
            aiFrontImageUrl: true,
            aiSideImageUrl: true,
            aiBackImageUrl: true,
            aiPhotoConsent: true
          }
        }
      }
    });

    console.log("image generation started", {
      customerId,
      styleSuggestionId,
      ENABLE_STYLE_IMAGE_GENERATION: process.env.ENABLE_STYLE_IMAGE_GENERATION,
      hasAiFrontImageUrl: Boolean(suggestion?.customer.aiFrontImageUrl),
      hasAiSideImageUrl: Boolean(suggestion?.customer.aiSideImageUrl),
      hasAiBackImageUrl: Boolean(suggestion?.customer.aiBackImageUrl),
      aiPhotoConsent: Boolean(suggestion?.customer.aiPhotoConsent),
      OPENAI_IMAGE_MODEL: process.env.OPENAI_IMAGE_MODEL
    });

    if (!suggestion) {
      return { ok: false, message: "髪型提案が見つかりません。" };
    }

    if (!suggestion.customer.aiPhotoConsent) {
      return { ok: false, message: "AI画像生成への同意を取得済みにしてください。" };
    }

    if (!suggestion.customer.aiFrontImageUrl || !suggestion.customer.aiSideImageUrl || !suggestion.customer.aiBackImageUrl) {
      return { ok: false, message: "AIシミュレーション用写真（斜め正面・横・斜め後ろ）を3枚登録してください。" };
    }

    if (process.env.ENABLE_STYLE_IMAGE_GENERATION !== "true") {
      return { ok: false, message: "画像生成は無効です。ENABLE_STYLE_IMAGE_GENERATION=true を設定してください。" };
    }

    const generatedUrls = await generateStyleSimulationImages({
      customerId,
      referenceImageUrls: {
        front: suggestion.customer.aiFrontImageUrl,
        side: suggestion.customer.aiSideImageUrl,
        back: suggestion.customer.aiBackImageUrl
      },
      styleName: suggestion.suggestedStyleName,
      imageEditPrompt:
        suggestion.imagePrompt ??
        [
          "顧客本人の写真をもとに、顔立ち・表情・顔の向きは維持し、髪型だけを自然に変更してください。",
          suggestion.suggestedStyleName,
          suggestion.reason,
          suggestion.caution,
          suggestion.stylingAdvice
        ]
          .filter(Boolean)
          .join("\n")
    });

    if (generatedUrls.length === 0) {
      return { ok: false, message: "画像生成結果が空でした。Vercel Logsで詳細を確認してください。" };
    }

    const existingEntries = parseImageUrlEntries(suggestion.imageUrlsJson, suggestion.imageUrls);
    const generatedEntries = generatedUrls.map((url, index) => ({
      angle: STYLE_IMAGE_ANGLES[index] ?? `画像${index + 1}`,
      url
    }));
    const generatedAngles = new Set<string>(generatedEntries.map((entry) => entry.angle));
    const nextEntries = [
      ...generatedEntries,
      ...existingEntries.filter((entry) => !generatedAngles.has(entry.angle))
    ].slice(0, 3);
    const nextUrls = nextEntries.map((entry) => entry.url);

    await prisma.styleSuggestion.update({
      where: { id: styleSuggestionId },
      data: {
        imageUrls: nextUrls,
        imageUrlsJson: JSON.stringify(nextEntries)
      }
    });

    revalidatePath(`/customers/${customerId}`);

    return {
      ok: true,
      message: "本人写真ベースの画像を生成しました。",
      imageUrls: nextUrls,
      selectedSuggestionId: styleSuggestionId
    };
  } catch (error) {
    console.error("image generation failed", {
      customerId,
      styleSuggestionId,
      error
    });

    return {
      ok: false,
      message: error instanceof Error ? error.message : "画像生成に失敗しました。"
    };
  }
}

export async function updateStyleSuggestionAccepted(
  customerId: string,
  suggestionId: string,
  accepted: boolean
) {
  await prisma.styleSuggestion.update({
    where: { id: suggestionId },
    data: { accepted }
  });

  revalidatePath(`/customers/${customerId}`);
}
