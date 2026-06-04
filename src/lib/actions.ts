"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateCourseRecommendations } from "@/lib/ai/course-recommender";
import { generateStyleSimulationImages } from "@/lib/ai/style-image-generator";
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
};

function parseImageUrls(imageUrlsJson: string | null, fallback: string[] = []) {
  if (!imageUrlsJson) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(imageUrlsJson) as unknown;
    return Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === "string") : fallback;
  } catch {
    return fallback;
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

export async function createAiStyleSuggestion(customerId: string) {
  const suggestions = await generateAiStyleSuggestionDrafts(customerId);

  await prisma.styleSuggestion.createMany({
    data: suggestions.map((suggestion) => ({
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
      accepted: false
    }))
  });

  revalidatePath(`/customers/${customerId}`);
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

  const existingUrls = parseImageUrls(suggestion.imageUrlsJson, suggestion.imageUrls);
  const nextUrls = [...existingUrls, imageUrl].slice(0, 3);

  await prisma.styleSuggestion.update({
    where: { id: suggestionId },
    data: {
      imageUrls: nextUrls,
      imageUrlsJson: JSON.stringify(nextUrls)
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
    hasProfileImageUrl: "lookup_pending",
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
            profileImageUrl: true
          }
        }
      }
    });

    console.log("image generation started", {
      customerId,
      styleSuggestionId,
      ENABLE_STYLE_IMAGE_GENERATION: process.env.ENABLE_STYLE_IMAGE_GENERATION,
      hasProfileImageUrl: Boolean(suggestion?.customer.profileImageUrl),
      OPENAI_IMAGE_MODEL: process.env.OPENAI_IMAGE_MODEL
    });

    if (!suggestion) {
      return { ok: false, message: "髪型提案が見つかりません。" };
    }

    if (!suggestion.customer.profileImageUrl) {
      return { ok: false, message: "本人写真を登録してから画像生成してください。" };
    }

    if (process.env.ENABLE_STYLE_IMAGE_GENERATION !== "true") {
      return { ok: false, message: "画像生成は無効です。ENABLE_STYLE_IMAGE_GENERATION=true を設定してください。" };
    }

    const generatedUrls = await generateStyleSimulationImages({
      customerId,
      sourceImageUrl: suggestion.customer.profileImageUrl,
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

    const existingUrls = parseImageUrls(suggestion.imageUrlsJson, suggestion.imageUrls);
    const nextUrls = [...existingUrls, ...generatedUrls].slice(0, 3);

    await prisma.styleSuggestion.update({
      where: { id: styleSuggestionId },
      data: {
        imageUrls: nextUrls,
        imageUrlsJson: JSON.stringify(nextUrls)
      }
    });

    revalidatePath(`/customers/${customerId}`);

    return {
      ok: true,
      message: "本人写真ベースの画像を生成しました。",
      imageUrls: nextUrls
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
