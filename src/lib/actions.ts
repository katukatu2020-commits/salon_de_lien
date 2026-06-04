"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateAiStyleSuggestionDraft } from "@/lib/style-suggestion";
import {
  nullableBoolean,
  nullableInt,
  nullableString,
  requiredDate,
  requiredString
} from "@/lib/form";

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
      accepted: nullableBoolean(formData, "accepted")
    }
  });

  revalidatePath(`/customers/${customerId}`);
}

export async function createAiStyleSuggestion(customerId: string) {
  const suggestion = await generateAiStyleSuggestionDraft(customerId);

  await prisma.styleSuggestion.create({
    data: {
      customerId,
      suggestedStyleName: suggestion.suggestedStyleName,
      reason: suggestion.reason,
      caution: suggestion.caution,
      stylingAdvice: suggestion.stylingAdvice,
      accepted: false
    }
  });

  revalidatePath(`/customers/${customerId}`);
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
