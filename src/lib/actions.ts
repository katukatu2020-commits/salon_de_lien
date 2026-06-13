"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateCourseRecommendations } from "@/lib/ai/course-recommender";
import { checkGeneratedImageIdentity } from "@/lib/ai/identity-checker";
import { checkGeneratedImageQuality } from "@/lib/ai/image-quality-checker";
import { generateStyleSimulation } from "@/lib/ai/style-simulation-provider";
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
type AiReferencePhotoGroup = "front" | "side" | "back";

type AiReferencePhotoUploadState = {
  ok: boolean;
  message: string;
  imageUrl?: string;
  cacheKey?: number;
  imageUrls?: string[];
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

const AI_REFERENCE_PHOTO_GROUP_CONFIG: Record<
  AiReferencePhotoGroup,
  {
    jsonField: "aiFrontImageUrlsJson" | "aiSideImageUrlsJson" | "aiBackImageUrlsJson";
    legacyField: "aiFrontImageUrl" | "aiSideImageUrl" | "aiBackImageUrl";
    label: string;
    slug: string;
    max: number;
  }
> = {
  front: {
    jsonField: "aiFrontImageUrlsJson",
    legacyField: "aiFrontImageUrl",
    label: "正面写真",
    slug: "front",
    max: 1
  },
  side: {
    jsonField: "aiSideImageUrlsJson",
    legacyField: "aiSideImageUrl",
    label: "横顔写真",
    slug: "side",
    max: 1
  },
  back: {
    jsonField: "aiBackImageUrlsJson",
    legacyField: "aiBackImageUrl",
    label: "後ろ姿写真",
    slug: "back",
    max: 1
  }
};

type StyleImageUrlEntry = {
  angle: string;
  url: string;
  provider?: string;
  identityScore?: number;
  identityLevel?: "high" | "medium" | "low";
  identityWarning?: string | null;
};

function isPhotomakerOnlyImage(provider: string | undefined) {
  return provider === "fal-photomaker" || provider === "fal-identity-master";
}

function parseJsonStringArray(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
  } catch {
    return [];
  }
}

function uniqueUrls(urls: Array<string | null | undefined>) {
  return Array.from(new Set(urls.filter((url): url is string => Boolean(url))));
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function addHours(date: Date, hours: number) {
  const nextDate = new Date(date);
  nextDate.setHours(nextDate.getHours() + hours);
  return nextDate;
}

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
            url: (item as { url: string }).url,
            provider:
              typeof (item as { provider?: unknown }).provider === "string"
                ? (item as { provider: string }).provider
                : undefined,
            identityScore:
              typeof (item as { identityScore?: unknown }).identityScore === "number"
                ? (item as { identityScore: number }).identityScore
                : undefined,
            identityLevel:
              (item as { identityLevel?: unknown }).identityLevel === "high" ||
              (item as { identityLevel?: unknown }).identityLevel === "medium" ||
              (item as { identityLevel?: unknown }).identityLevel === "low"
                ? (item as { identityLevel: "high" | "medium" | "low" }).identityLevel
                : undefined,
            identityWarning:
              typeof (item as { identityWarning?: unknown }).identityWarning === "string"
                ? (item as { identityWarning: string }).identityWarning
                : null
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

function finalIdentitySaveMinScore(angle: string, provider?: string) {
  if (provider?.includes("reference-anchor")) {
    return 60;
  }

  if (angle.includes("後ろ") || angle.includes("back")) {
    return 75;
  }

  return 70;
}

function nullableDateTime(formData: FormData, key: string) {
  const value = nullableString(formData, key);
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${key} must be a valid datetime`);
  }

  return date;
}

function requiredDateTime(formData: FormData, key: string) {
  const value = nullableDateTime(formData, key);
  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

function intakePhotoFiles(formData: FormData) {
  return formData
    .getAll("intakePhotos")
    .filter((file): file is File => file instanceof File && file.size > 0)
    .slice(0, 3);
}

function validateIntakePhotoFiles(files: File[]) {
  for (const file of files) {
    if (!ALLOWED_PROFILE_IMAGE_TYPES.includes(file.type)) {
      throw new Error("事前写真は JPG / PNG / WebP のみ送信できます。");
    }

    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      throw new Error("事前写真は1枚5MB以下にしてください。");
    }
  }
}

export async function createCustomer(formData: FormData) {
  const preferenceData = {
    preferredLength: nullableString(formData, "preferredLength"),
    preferredStyle: nullableString(formData, "preferredStyle"),
    dislikes: nullableString(formData, "dislikes"),
    colorPreference: nullableString(formData, "colorPreference"),
    maintenanceLevel: nullableString(formData, "maintenanceLevel"),
    referenceNotes: nullableString(formData, "referenceNotes")
  };
  const hairProfileData = {
    hairThickness: nullableString(formData, "hairThickness"),
    hairVolume: nullableString(formData, "hairVolume"),
    hairTexture: nullableString(formData, "hairTexture"),
    scalpCondition: nullableString(formData, "scalpCondition"),
    faceShape: nullableString(formData, "faceShape"),
    forehead: nullableString(formData, "forehead"),
    lifestyle: nullableString(formData, "lifestyle"),
    stylingTimeMinutes: nullableInt(formData, "stylingTimeMinutes")
  };
  const hasPreference = Object.values(preferenceData).some((value) => value !== null);
  const hasHairProfile = Object.values(hairProfileData).some((value) => value !== null);
  const aiPhotoConsent = nullableBoolean(formData, "aiPhotoConsent");

  const customer = await prisma.customer.create({
    data: {
      name: requiredString(formData, "name"),
      gender: nullableString(formData, "gender"),
      birthYear: nullableInt(formData, "birthYear"),
      phone: nullableString(formData, "phone"),
      aiPhotoConsent,
      memo: nullableString(formData, "memo"),
      ...(aiPhotoConsent
        ? {
            contactLogs: {
              create: {
                channel: "店頭",
                purpose: "写真利用同意",
                message: "AI提案用の写真利用に同意済みとして新規登録しました。",
                outcome: "同意取得",
                nextAction: "参照写真を登録し、AI提案に利用できます。"
              }
            }
          }
        : {}),
      ...(hasPreference
        ? {
            preference: {
              create: preferenceData
            }
          }
        : {}),
      ...(hasHairProfile
        ? {
            hairProfile: {
              create: hairProfileData
            }
          }
        : {})
    }
  });

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}

export async function createPublicConsultationLead(formData: FormData) {
  const name = requiredString(formData, "name");
  const phone = nullableString(formData, "phone");
  const preferredDate = nullableDateTime(formData, "preferredDate");
  const visitTiming = nullableString(formData, "visitTiming");
  const mainConcern = nullableString(formData, "mainConcern");
  const budgetPreference = nullableString(formData, "budgetPreference");
  const finishBy = nullableString(formData, "finishBy");
  const message = nullableString(formData, "message");
  const preferredLength = nullableString(formData, "preferredLength");
  const preferredStyle = nullableString(formData, "preferredStyle");
  const colorPreference = nullableString(formData, "colorPreference");
  const maintenanceLevel = nullableString(formData, "maintenanceLevel");
  const hairTexture = nullableString(formData, "hairTexture");
  const stylingTimeMinutes = nullableInt(formData, "stylingTimeMinutes");
  const addOnInterests = formData
    .getAll("addOnInterest")
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
  const leadSource = nullableString(formData, "leadSource") ?? nullableString(formData, "leadSourceParam");
  const campaign = nullableString(formData, "campaign");
  const referrerCode = nullableString(formData, "referrerCode");
  const referrerName = nullableString(formData, "referrerName");
  const waitlistPreference = nullableString(formData, "waitlistPreference");
  const preferredTimeWindow = nullableString(formData, "preferredTimeWindow");
  const rescheduleContactPreference = nullableString(formData, "rescheduleContactPreference");
  const cancellationPolicyConsent = nullableBoolean(formData, "cancellationPolicyConsent");
  const aiPhotoConsent = nullableBoolean(formData, "aiPhotoConsent");
  const photoFiles = intakePhotoFiles(formData);
  validateIntakePhotoFiles(photoFiles);
  const leadMessage = [
    `新規相談: ${name}`,
    phone ? `連絡先: ${phone}` : null,
    leadSource ? `流入元: ${leadSource}` : null,
    campaign ? `キャンペーン: ${campaign}` : null,
    referrerName ? `紹介者: ${referrerName}` : null,
    referrerCode ? `紹介コード: ${referrerCode}` : null,
    aiPhotoConsent ? "写真利用同意: あり" : null,
    photoFiles.length > 0 ? `事前写真: ${photoFiles.length}枚` : null,
    waitlistPreference ? `空き枠通知: ${waitlistPreference}` : null,
    preferredTimeWindow ? `連絡しやすい時間帯: ${preferredTimeWindow}` : null,
    rescheduleContactPreference ? `変更連絡方法: ${rescheduleContactPreference}` : null,
    `キャンセルポリシー確認: ${cancellationPolicyConsent ? "あり" : "未確認"}`,
    preferredDate ? `希望日時: ${preferredDate.toLocaleString("ja-JP")}` : null,
    visitTiming ? `来店希望時期: ${visitTiming}` : null,
    mainConcern ? `一番の悩み: ${mainConcern}` : null,
    addOnInterests.length > 0 ? `追加相談: ${addOnInterests.join(" / ")}` : null,
    budgetPreference ? `予算感: ${budgetPreference}` : null,
    finishBy ? `終了希望: ${finishBy}` : null,
    message ? `相談メモ: ${message}` : null
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  const customer = await prisma.$transaction(async (tx) => {
    const normalizedReferrerCode = referrerCode?.replace(/^C-/i, "").trim().toLowerCase();
    const referrerCustomer = normalizedReferrerCode
      ? await tx.customer.findFirst({
          where: {
            deletedAt: null,
            OR: [
              { id: referrerCode ?? "" },
              { id: { endsWith: normalizedReferrerCode } }
            ]
          },
          select: { id: true, name: true }
        })
      : null;
    const createdCustomer = await tx.customer.create({
      data: {
        name,
        phone,
        aiPhotoConsent,
        memo: leadMessage,
        preference: {
          create: {
            preferredLength,
            preferredStyle,
            colorPreference,
            maintenanceLevel,
            referenceNotes: [
              leadSource ? `流入元: ${leadSource}` : null,
              campaign ? `キャンペーン: ${campaign}` : null,
              referrerName ? `紹介者: ${referrerName}` : null,
              referrerCode ? `紹介コード: ${referrerCode}` : null,
              aiPhotoConsent ? "写真利用同意: あり" : null,
              photoFiles.length > 0 ? `事前写真: ${photoFiles.length}枚` : null,
              waitlistPreference ? `空き枠通知: ${waitlistPreference}` : null,
              preferredTimeWindow ? `連絡しやすい時間帯: ${preferredTimeWindow}` : null,
              rescheduleContactPreference ? `変更連絡方法: ${rescheduleContactPreference}` : null,
              `キャンセルポリシー確認: ${cancellationPolicyConsent ? "あり" : "未確認"}`,
              mainConcern,
              addOnInterests.length > 0 ? `追加相談: ${addOnInterests.join(" / ")}` : null,
              budgetPreference,
              visitTiming,
              finishBy,
              message
            ]
              .filter((value): value is string => Boolean(value))
              .join("\n")
          }
        },
        hairProfile: {
          create: {
            hairTexture,
            stylingTimeMinutes
          }
        },
        contactLogs: {
          create: {
            channel: "新規相談フォーム",
            purpose: "新規リード",
            message: leadMessage,
            outcome: preferredDate ? "予約希望" : "相談希望",
            nextAction: preferredDate
              ? "希望日時の空き枠を確認し、仮予約または代替候補を返信する"
              : "悩み・予算・来店時期に合わせて相談返信を送る",
            scheduledFollowUp: preferredDate ?? addHours(new Date(), 4)
          }
        }
      }
    });

    if (referrerCustomer) {
      await tx.contactLog.create({
        data: {
          customerId: referrerCustomer.id,
          channel: "紹介",
          purpose: "紹介発生",
          message: [
            `紹介相談: ${name}`,
            phone ? `紹介先連絡先: ${phone}` : null,
            preferredDate ? `希望日時: ${preferredDate.toLocaleString("ja-JP")}` : null,
            mainConcern ? `相談内容: ${mainConcern}` : null
          ]
            .filter((line): line is string => Boolean(line))
            .join("\n"),
          outcome: "紹介リード発生",
          nextAction: "紹介者へお礼を伝え、紹介先の予約化状況を確認する",
          scheduledFollowUp: addDays(new Date(), 1)
        }
      });
    }

    if (preferredDate) {
      await tx.appointment.create({
        data: {
          customerId: createdCustomer.id,
          scheduledAt: preferredDate,
          menu: "新規カウンセリング",
          status: "仮予約",
          source: "新規相談フォーム",
          note: leadMessage
        }
      });
    }

    return createdCustomer;
  });

  if (referrerCode) {
    const normalizedReferrerCode = referrerCode.replace(/^C-/i, "").trim().toLowerCase();
    const referrerCustomer = normalizedReferrerCode
      ? await prisma.customer.findFirst({
          where: {
            deletedAt: null,
            id: { endsWith: normalizedReferrerCode }
          },
          select: { id: true }
        })
      : null;

    if (referrerCustomer && referrerCustomer.id !== customer.id) {
      const referralMessage = [
        `紹介相談: ${name}`,
        phone ? `紹介先連絡先: ${phone}` : null,
        preferredDate ? `希望日時: ${preferredDate.toLocaleString("ja-JP")}` : null,
        mainConcern ? `相談内容: ${mainConcern}` : null
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n");
      const existingReferralLog = await prisma.contactLog.findFirst({
        where: {
          customerId: referrerCustomer.id,
          purpose: "紹介発生",
          message: { contains: `紹介相談: ${name}` }
        },
        select: { id: true }
      });

      if (!existingReferralLog) {
        await prisma.contactLog.create({
          data: {
            customerId: referrerCustomer.id,
            channel: "紹介",
            purpose: "紹介発生",
            message: referralMessage,
            outcome: "紹介リード発生",
            nextAction: "紹介者へお礼を伝え、紹介先の予約化状況を確認する",
            scheduledFollowUp: addDays(new Date(), 1)
          }
        });
      }
    }
  }

  if (aiPhotoConsent && photoFiles.length > 0) {
    try {
      const uploadedUrls: string[] = [];

      for (const imageFile of photoFiles) {
        const extension = imageFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const safeFileName = imageFile.name.replace(/[^\w.-]/g, "_");
        const cacheKey = Date.now();
        const blob = await put(
          `customers/${customer.id}/public-intake/${cacheKey}-${safeFileName || `image.${extension}`}`,
          imageFile,
          {
            access: "public",
            addRandomSuffix: true,
            token: process.env.BLOB_READ_WRITE_TOKEN
          }
        );
        uploadedUrls.push(blob.url);
      }

      if (uploadedUrls.length > 0) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            profileImageUrl: uploadedUrls[0],
            aiFrontImageUrl: uploadedUrls[0],
            aiFrontImageUrlsJson: JSON.stringify(uploadedUrls)
          }
        });

        await prisma.contactLog.create({
          data: {
            customerId: customer.id,
            channel: "新規相談フォーム",
            purpose: "事前写真受付",
            message: [`事前写真: ${uploadedUrls.length}枚`, "写真利用同意: あり"].join("\n"),
            outcome: "写真受付済み",
            nextAction: "事前写真を確認し、似合わせ提案やAI提案準備に使う"
          }
        });
      }
    } catch (error) {
      console.warn("public intake photo upload failed", {
        customerId: customer.id,
        error: error instanceof Error ? error.message : error
      });

      await prisma.contactLog.create({
        data: {
          customerId: customer.id,
          channel: "新規相談フォーム",
          purpose: "事前写真受付",
          message: `事前写真保存失敗: ${error instanceof Error ? error.message : "unknown error"}`,
          outcome: "写真保存失敗",
          nextAction: "必要なら写真を再送してもらう"
        }
      });
    }
  }

  revalidatePath("/customers");
  revalidatePath("/customers?view=messages");
  revalidatePath("/customers?view=calendar");
  revalidatePath("/customers?view=analytics");
  revalidatePath(`/customers/${customer.id}`);
  redirect("/intake/thanks");
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
  revalidatePath("/customers?view=visits");
  revalidatePath("/customers?view=calendar");
  revalidatePath("/customers?view=messages");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath(`/app/${customerId}`);
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
  revalidatePath("/customers?view=visits");
  revalidatePath("/customers?view=calendar");
  revalidatePath("/customers?view=messages");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath(`/app/${customerId}`);
  revalidatePath(`/care/${customerId}`);
  revalidatePath(`/feedback/${customerId}`);
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
    revalidatePath(`/app/${customerId}`);

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
    revalidatePath(`/app/${customerId}`);

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

export async function uploadAiReferencePhotoAction(
  customerId: string,
  group: AiReferencePhotoGroup,
  _previousState: AiReferencePhotoUploadState,
  formData: FormData
): Promise<AiReferencePhotoUploadState> {
  void _previousState;

  try {
    const config = AI_REFERENCE_PHOTO_GROUP_CONFIG[group];
    const rawFiles = formData.getAll("aiReferencePhoto");
    const imageFiles = rawFiles.filter((file): file is File => file instanceof File && file.size > 0);

    if (!config) {
      return { ok: false, message: "写真の区分が不正です。" };
    }

    if (imageFiles.length === 0) {
      return { ok: false, message: `${config.label}を選択してください。` };
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: {
        aiFrontImageUrl: true,
        aiSideImageUrl: true,
        aiBackImageUrl: true,
        aiFrontImageUrlsJson: true,
        aiSideImageUrlsJson: true,
        aiBackImageUrlsJson: true
      }
    });

    if (!customer) {
      return { ok: false, message: "顧客が見つかりません。" };
    }

    const existingUrls = uniqueUrls([
      ...parseJsonStringArray(customer[config.jsonField]),
      customer[config.legacyField]
    ]);
    const remainingSlots = config.max - existingUrls.length;

    if (remainingSlots <= 0) {
      return { ok: false, message: `${config.label}は最大${config.max}枚まで登録できます。` };
    }

    const filesToUpload = imageFiles.slice(0, remainingSlots);
    const uploadedUrls: string[] = [];

    for (const imageFile of filesToUpload) {
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

      uploadedUrls.push(blob.url);
    }

    const nextUrls = uniqueUrls([...existingUrls, ...uploadedUrls]).slice(0, config.max);

    await prisma.customer.update({
      where: { id: customerId },
      data: { [config.jsonField]: JSON.stringify(nextUrls) }
    });

    revalidatePath(`/customers/${customerId}`);
    revalidatePath(`/app/${customerId}`);

    return {
      ok: true,
      message: `${config.label}を${uploadedUrls.length}枚追加しました。`,
      imageUrl: uploadedUrls[0],
      imageUrls: nextUrls,
      cacheKey: Date.now()
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "AIシミュレーション用写真のアップロードに失敗しました。"
    };
  }
}

export async function removeAiReferencePhotoAction(formData: FormData) {
  const customerIdValue = formData.get("customerId");
  const groupValue = formData.get("group");
  const imageUrlValue = formData.get("imageUrl");

  if (typeof customerIdValue !== "string" || typeof groupValue !== "string" || typeof imageUrlValue !== "string") {
    throw new Error("削除対象の写真情報が不正です。");
  }

  if (!["front", "side", "back"].includes(groupValue)) {
    throw new Error("写真の区分が不正です。");
  }

  const group = groupValue as AiReferencePhotoGroup;
  const config = AI_REFERENCE_PHOTO_GROUP_CONFIG[group];
  const customer = await prisma.customer.findFirst({
    where: { id: customerIdValue, deletedAt: null },
    select: {
      aiFrontImageUrlsJson: true,
      aiSideImageUrlsJson: true,
      aiBackImageUrlsJson: true,
      aiFrontImageUrl: true,
      aiSideImageUrl: true,
      aiBackImageUrl: true
    }
  });

  if (!customer) {
    throw new Error("顧客が見つかりません。");
  }

  const nextUrls = parseJsonStringArray(customer[config.jsonField]).filter((url) => url !== imageUrlValue);
  const legacyUpdate = customer[config.legacyField] === imageUrlValue ? { [config.legacyField]: null } : {};

  await prisma.customer.update({
    where: { id: customerIdValue },
    data: {
      [config.jsonField]: JSON.stringify(nextUrls),
      ...legacyUpdate
    }
  });

  revalidatePath(`/customers/${customerIdValue}`);
  revalidatePath(`/app/${customerIdValue}`);
}

export async function updateCustomerAiPhotoConsent(customerId: string, formData: FormData) {
  const nextConsent = formData.get("aiPhotoConsent") === "on";

  await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: { aiPhotoConsent: true }
    });

    if (!customer) {
      throw new Error("顧客が見つかりません。");
    }

    await tx.customer.update({
      where: { id: customerId },
      data: {
        aiPhotoConsent: nextConsent
      }
    });

    if (customer.aiPhotoConsent !== nextConsent) {
      await tx.contactLog.create({
        data: {
          customerId,
          channel: "店頭",
          purpose: "写真利用同意",
          message: nextConsent
            ? "AI提案用の写真利用に同意済みへ変更しました。"
            : "AI提案用の写真利用同意を解除しました。",
          outcome: nextConsent ? "同意取得" : "同意解除",
          nextAction: nextConsent
            ? "参照写真を登録し、AI提案に利用できます。"
            : "AI画像生成を行わず、必要に応じて再同意を確認してください。"
        }
      });
    }
  });

  revalidatePath("/customers");
  revalidatePath("/customers?view=settings");
  revalidatePath("/customers?view=messages");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath(`/app/${customerId}`);
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
  revalidatePath("/customers");
  revalidatePath("/customers?view=styles");
  revalidatePath("/customers?view=messages");
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
  const visitedAt = requiredDate(formData, "visitedAt");
  const performedStyle = nullableString(formData, "performedStyle");
  const nextRecommendation = nullableString(formData, "nextRecommendation");

  await prisma.$transaction(async (tx) => {
    await tx.visit.create({
      data: {
        customerId,
        visitedAt,
        stylistName: nullableString(formData, "stylistName"),
        requestedStyle: nullableString(formData, "requestedStyle"),
        performedStyle,
        cutNotes: nullableString(formData, "cutNotes"),
        colorNotes: nullableString(formData, "colorNotes"),
        permNotes: nullableString(formData, "permNotes"),
        customerReaction: nullableString(formData, "customerReaction"),
        nextRecommendation
      }
    });

    await tx.contactLog.create({
      data: {
        customerId,
        channel: "店頭",
        purpose: "次回提案フォロー予定",
        message: [
          `来店記録から自動作成: ${performedStyle ?? "施術内容未登録"}`,
          nextRecommendation ? `次回提案: ${nextRecommendation}` : null
        ]
          .filter((line): line is string => Boolean(line))
          .join("\n"),
        outcome: "来店記録済み",
        nextAction: "メンテナンス周期に合わせて次回予約候補と提案ページを送る",
        scheduledFollowUp: addDays(visitedAt, 45)
      }
    });
  });

  revalidatePath("/customers");
  revalidatePath("/customers?view=messages");
  revalidatePath("/customers?view=calendar");
  revalidatePath(`/customers/${customerId}`);
}

export async function createContactLog(customerId: string, formData: FormData) {
  await prisma.contactLog.create({
    data: {
      customerId,
      channel: requiredString(formData, "channel"),
      purpose: nullableString(formData, "purpose"),
      message: requiredString(formData, "message"),
      outcome: nullableString(formData, "outcome"),
      nextAction: nullableString(formData, "nextAction"),
      scheduledFollowUp: nullableDateTime(formData, "scheduledFollowUp")
    }
  });

  revalidatePath("/customers");
  revalidatePath("/customers?view=messages");
  revalidatePath("/customers?view=calendar");
  revalidatePath(`/customers/${customerId}`);
}

export async function createAppointment(customerId: string, formData: FormData) {
  const scheduledAt = requiredDateTime(formData, "scheduledAt");
  const menu = nullableString(formData, "menu");
  const estimatedPrice = nullableInt(formData, "estimatedPrice");
  const status = nullableString(formData, "status") ?? "仮予約";
  const source = nullableString(formData, "source");
  const note = nullableString(formData, "note");
  const reminderAt = scheduledAt.getTime() - Date.now() > 48 * 60 * 60 * 1000 ? addDays(scheduledAt, -2) : addHours(new Date(), 1);

  await prisma.$transaction(async (tx) => {
    await tx.appointment.create({
      data: {
        customerId,
        scheduledAt,
        menu,
        estimatedPrice,
        status,
        source,
        note
      }
    });

    await tx.contactLog.create({
      data: {
        customerId,
        channel: source === "LINE" || source === "電話" ? source : "店頭",
        purpose: "予約確認予定",
        message: [
          `予約作成: ${scheduledAt.toLocaleString("ja-JP")}`,
          menu ? `メニュー: ${menu}` : null,
          estimatedPrice ? `見込み金額: ${estimatedPrice.toLocaleString("ja-JP")}円` : null,
          note ? `メモ: ${note}` : null
        ]
          .filter((line): line is string => Boolean(line))
          .join("\n"),
        outcome: status,
        nextAction: "予約日時、メニュー、変更有無を確認する",
        scheduledFollowUp: reminderAt
      }
    });
  });

  revalidatePath("/customers");
  revalidatePath("/customers?view=messages");
  revalidatePath("/customers?view=calendar");
  revalidatePath(`/customers/${customerId}`);
}

export async function updateAppointmentStatus(appointmentId: string, customerId: string, formData: FormData) {
  const status = requiredString(formData, "status");
  const note = nullableString(formData, "note");

  await prisma.$transaction(async (tx) => {
    await tx.appointment.updateMany({
      where: { id: appointmentId, customerId },
      data: {
        status,
        note: note ?? undefined
      }
    });

    if (status === "キャンセル" || status === "無断キャンセル") {
      await tx.contactLog.create({
        data: {
          customerId,
          channel: "店頭",
          purpose: status === "無断キャンセル" ? "無断キャンセル後フォロー" : "予約キャンセル後フォロー",
          message: note ? `${status}: ${note}` : `${status}が記録されました。`,
          outcome: status,
          nextAction:
            status === "無断キャンセル"
              ? "体調や都合を確認し、再予約可能性と今後の連絡方法を丁寧に確認する"
              : "代替候補日と必要メニューを確認し、再予約につなげる",
          scheduledFollowUp: status === "無断キャンセル" ? addHours(new Date(), 2) : addDays(new Date(), 1)
        }
      });
    }

    if (status === "予約確定") {
      await tx.contactLog.create({
        data: {
          customerId,
          channel: "店頭",
          purpose: "予約確定",
          message: note ? `予約確定: ${note}` : "予約を確定しました。",
          outcome: "予約確定",
          nextAction: "来店前に提案メニュー、注意点、追加候補を確認する"
        }
      });
    }
  });

  revalidatePath("/customers");
  revalidatePath("/customers?view=calendar");
  revalidatePath("/customers?view=messages");
  revalidatePath(`/customers/${customerId}`);
}

export async function createAppointmentConfirmationResponse(appointmentId: string, formData: FormData) {
  const attendance = requiredString(formData, "attendance");
  const contactPreference = nullableString(formData, "contactPreference");
  const concern = nullableString(formData, "concern");
  const priceExpectation = nullableString(formData, "priceExpectation");
  const finishBy = nullableString(formData, "finishBy");
  const visitPriority = nullableString(formData, "visitPriority");
  const preferredDate = nullableDateTime(formData, "preferredDate");
  const message = nullableString(formData, "message");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      customerId: true,
      scheduledAt: true,
      menu: true,
      status: true,
      customer: {
        select: {
          deletedAt: true,
          name: true
        }
      }
    }
  });

  if (!appointment || appointment.customer.deletedAt) {
    throw new Error("予約が見つかりません。");
  }

  const wantsReschedule = attendance.includes("変更") || attendance.includes("相談");
  const responseText = [
    `予約確認返信: ${attendance}`,
    `予約日時: ${appointment.scheduledAt.toLocaleString("ja-JP")}`,
    appointment.menu ? `メニュー: ${appointment.menu}` : null,
    contactPreference ? `希望連絡方法: ${contactPreference}` : null,
    concern ? `来店前相談: ${concern}` : null,
    priceExpectation ? `料金確認: ${priceExpectation}` : null,
    finishBy ? `終了希望: ${finishBy}` : null,
    visitPriority ? `当日の優先順位: ${visitPriority}` : null,
    preferredDate ? `変更希望日時: ${preferredDate.toLocaleString("ja-JP")}` : null,
    message ? `メモ: ${message}` : null
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  await prisma.$transaction(async (tx) => {
    if (!wantsReschedule) {
      await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: "予約確定" }
      });
    }

    await tx.contactLog.create({
      data: {
        customerId: appointment.customerId,
        channel: "予約確認ページ",
        purpose: wantsReschedule ? "予約変更希望" : "予約確認",
        message: responseText,
        outcome: wantsReschedule ? "予約変更希望" : "予約確認返信",
        nextAction: wantsReschedule
          ? "変更希望日時と連絡方法を確認し、予約枠を調整する"
          : priceExpectation || finishBy || visitPriority || concern
            ? "来店前ブリーフに反映し、料金・時間・優先順位を施術前に確認する"
            : "来店前ブリーフに反映し、当日の注意点と提案メニューを確認する",
        scheduledFollowUp: wantsReschedule ? addHours(new Date(), 2) : appointment.scheduledAt
      }
    });
  });

  revalidatePath("/customers");
  revalidatePath("/customers?view=messages");
  revalidatePath("/customers?view=calendar");
  revalidatePath("/customers?view=analytics");
  revalidatePath(`/customers/${appointment.customerId}`);
  revalidatePath(`/appointments/${appointment.id}/confirm`);
  redirect(`/appointments/${appointment.id}/confirm?submitted=1`);
}

export async function createServiceSale(customerId: string, formData: FormData) {
  const appointmentId = nullableString(formData, "appointmentId");
  const title = requiredString(formData, "title");
  const amount = nullableInt(formData, "amount") ?? 0;
  const paidAt = nullableDateTime(formData, "paidAt") ?? new Date();

  await prisma.$transaction(async (tx) => {
    await tx.serviceSale.create({
      data: {
        customerId,
        appointmentId,
        title,
        amount,
        paymentMethod: nullableString(formData, "paymentMethod"),
        paidAt,
        source: nullableString(formData, "source"),
        note: nullableString(formData, "note")
      }
    });

    await tx.contactLog.create({
      data: {
        customerId,
        channel: "店頭",
        purpose: "来店後フォロー予定",
        message: `会計登録から自動作成: ${title} / ${amount.toLocaleString("ja-JP")}円`,
        outcome: "売上登録済み",
        nextAction: "仕上がり確認、レビュー依頼、次回メンテナンス提案を送る",
        scheduledFollowUp: addDays(paidAt, 7)
      }
    });

    if (appointmentId) {
      await tx.appointment.updateMany({
        where: { id: appointmentId, customerId },
        data: { status: "来店済み" }
      });
    }
  });

  revalidatePath("/customers");
  revalidatePath("/customers?view=calendar");
  revalidatePath("/customers?view=messages");
  revalidatePath("/customers?view=analytics");
  revalidatePath(`/customers/${customerId}`);
}

export async function createCustomerFeedback(customerId: string, formData: FormData) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deletedAt: null },
    select: { id: true, name: true }
  });

  if (!customer) {
    throw new Error("顧客が見つかりません。");
  }

  const rating = nullableInt(formData, "rating") ?? 0;
  const satisfaction = nullableString(formData, "satisfaction") ?? "未選択";
  const reviewPermission = nullableString(formData, "reviewPermission") ?? "未選択";
  const rebookTiming = nullableString(formData, "rebookTiming") ?? "未選択";
  const preferredDate = nullableDateTime(formData, "preferredDate");
  const homeStyling = nullableString(formData, "homeStyling");
  const homeCareInterest = nullableString(formData, "homeCareInterest");
  const rebookReason = nullableString(formData, "rebookReason");
  const message = nullableString(formData, "message");
  const wantsHomeCare =
    Boolean(homeCareInterest) &&
    !homeCareInterest?.includes("不要") &&
    (homeCareInterest?.includes("知りたい") || homeCareInterest?.includes("相談") || homeCareInterest?.includes("乾かし方"));
  const wantsStylingFollow =
    Boolean(homeStyling) &&
    (homeStyling?.includes("難しい") || homeStyling?.includes("気になる") || homeStyling?.includes("相談"));
  const wantsFollow = satisfaction.includes("相談") || rating <= 3 || wantsStylingFollow || wantsHomeCare;
  const wantsReview = rating >= 4 && reviewPermission.includes("投稿");
  const wantsRebook =
    Boolean(preferredDate) ||
    rebookTiming.includes("予約") ||
    rebookTiming.includes("相談") ||
    Boolean(rebookReason && !rebookReason.includes("未定"));
  const feedbackText = [
    `来店後評価: ${rating}/5`,
    `仕上がり: ${satisfaction}`,
    `口コミ: ${reviewPermission}`,
    `次回希望: ${rebookTiming}`,
    homeStyling ? `家での扱いやすさ: ${homeStyling}` : null,
    homeCareInterest ? `ホームケア相談: ${homeCareInterest}` : null,
    rebookReason ? `次回理由: ${rebookReason}` : null,
    preferredDate ? `希望日時: ${preferredDate.toLocaleString("ja-JP")}` : null,
    message ? `メモ: ${message}` : null
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  const nextAction = wantsHomeCare
    ? "家での扱いやすさとホームケア希望を確認し、必要なケア・乾かし方・店販候補を案内する"
    : wantsFollow
      ? "不安点や手直し希望を確認し、24時間以内にフォローする"
      : wantsRebook
        ? "次回希望に合わせて空き枠と必要メニューを提案する"
        : wantsReview
          ? "口コミ投稿の案内を送り、次回来店の目安も添える"
          : "仕上がり確認後、次回来店の目安を案内する";
  const scheduledFollowUp = wantsFollow
    ? addHours(new Date(), 4)
    : preferredDate ?? (wantsReview ? addDays(new Date(), 1) : addDays(new Date(), 14));

  await prisma.$transaction(async (tx) => {
    await tx.contactLog.create({
      data: {
        customerId,
        channel: "フィードバックページ",
        purpose: "来店後フィードバック",
        message: feedbackText,
        outcome: wantsHomeCare ? "ホームケア相談候補" : wantsFollow ? "要フォロー" : wantsReview ? "口コミ依頼候補" : "来店後確認済み",
        nextAction,
        scheduledFollowUp
      }
    });

    if (preferredDate) {
      await tx.appointment.create({
        data: {
          customerId,
          scheduledAt: preferredDate,
          menu: "次回メンテナンス相談",
          status: "仮予約",
          source: "フィードバックページ",
          note: feedbackText
        }
      });
    }
  });

  revalidatePath("/customers");
  revalidatePath("/customers?view=messages");
  revalidatePath("/customers?view=calendar");
  revalidatePath("/customers?view=analytics");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath(`/feedback/${customerId}`);
}

export async function createProposalResponse(suggestionId: string, formData: FormData) {
  const suggestion = await prisma.styleSuggestion.findUnique({
    where: { id: suggestionId },
    select: {
      id: true,
      customerId: true,
      suggestedStyleName: true,
      menuSuggestion: true,
      estimatedMinutes: true,
      customer: {
        select: {
          deletedAt: true
        }
      }
    }
  });

  if (!suggestion || suggestion.customer.deletedAt) {
    throw new Error("提案が見つかりません。");
  }

  const intent = requiredString(formData, "intent");
  const preferredDate = nullableDateTime(formData, "preferredDate");
  const alternativeDate1 = nullableDateTime(formData, "alternativeDate1");
  const alternativeDate2 = nullableDateTime(formData, "alternativeDate2");
  const message = nullableString(formData, "message");
  const contactName = nullableString(formData, "contactName");
  const contactPhone = nullableString(formData, "contactPhone");
  const contactPreference = nullableString(formData, "contactPreference");
  const urgencyPreference = nullableString(formData, "urgencyPreference");
  const packageInterest = nullableString(formData, "packageInterest");
  const stylePriority = nullableString(formData, "stylePriority");
  const budgetPreference = nullableString(formData, "budgetPreference");
  const pricePlan = nullableString(formData, "pricePlan");
  const visitTiming = nullableString(formData, "visitTiming");
  const finishBy = nullableString(formData, "finishBy");
  const decisionBlocker = nullableString(formData, "decisionBlocker");
  const selectedConcerns = formData
    .getAll("concern")
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim())
    .slice(0, 6);
  const concernText = selectedConcerns.length > 0 ? `相談したい不安: ${selectedConcerns.join(" / ")}` : null;
  const selectedCourseIds = formData
    .getAll("selectedCourse")
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim())
    .slice(0, 5);
  const selectedCourses =
    selectedCourseIds.length > 0
      ? await prisma.courseRecommendation.findMany({
          where: {
            id: { in: selectedCourseIds },
            customerId: suggestion.customerId
          },
          select: {
            id: true,
            title: true,
            estimatedPrice: true,
            estimatedMinutes: true
          }
        })
      : [];
  const selectedCourseLabels = selectedCourses.map((course) => {
    const priceLabel = course.estimatedPrice ? `${course.estimatedPrice.toLocaleString("ja-JP")}円` : "料金は相談";
    const timeLabel = course.estimatedMinutes ? `約${course.estimatedMinutes}分` : "時間は相談";
    return `${course.title}（${priceLabel} / ${timeLabel}）`;
  });
  const selectedCourseText = selectedCourseLabels.length > 0 ? `相談したい追加メニュー: ${selectedCourseLabels.join(" / ")}` : null;
  const contactPreferenceText = contactPreference ? `希望連絡方法: ${contactPreference}` : null;
  const alternativeDate1Text = alternativeDate1 ? `第2希望日時: ${alternativeDate1.toLocaleString("ja-JP")}` : null;
  const alternativeDate2Text = alternativeDate2 ? `第3希望日時: ${alternativeDate2.toLocaleString("ja-JP")}` : null;
  const urgencyPreferenceText = urgencyPreference ? `空き枠希望: ${urgencyPreference}` : null;
  const packageInterestText = packageInterest ? `継続プラン相談: ${packageInterest}` : null;
  const stylePriorityText = stylePriority ? `当日の優先順位: ${stylePriority}` : null;
  const budgetPreferenceText = budgetPreference ? `予算感: ${budgetPreference}` : null;
  const pricePlanText = pricePlan ? `選んだ料金プラン: ${pricePlan}` : null;
  const visitTimingText = visitTiming ? `来店希望時期: ${visitTiming}` : null;
  const finishByText = finishBy ? `終了希望: ${finishBy}` : null;
  const decisionBlockerText = decisionBlocker ? `予約を迷う理由: ${decisionBlocker}` : null;
  const responseMessage = [
    concernText,
    contactPreferenceText,
    alternativeDate1Text,
    alternativeDate2Text,
    urgencyPreferenceText,
    packageInterestText,
    stylePriorityText,
    budgetPreferenceText,
    pricePlanText,
    visitTimingText,
    finishByText,
    decisionBlockerText,
    message,
    selectedCourseText
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
  const wantsReservation = intent.includes("予約");
  const wantsConsultation = intent.includes("相談");
  const nextAction =
    decisionBlockerText || pricePlanText || finishByText
      ? "料金・所要時間・予約を迷う理由を先に確認し、予約判断を助ける"
      : concernText
        ? `お客様の不安（${selectedConcerns.join(" / ")}）に先に答えてから、予約または相談へ進める`
        : selectedCourseText
          ? "追加メニューの必要性・料金・所要時間を説明して、予約または相談へ進める"
          : wantsReservation
            ? "希望日時を確認して予約枠を確定する"
            : "内容を確認して相談返信を送る";
  const responseFollowUpAt = preferredDate ?? (wantsReservation || wantsConsultation ? addDays(new Date(), 1) : addDays(new Date(), 3));
  const responseText = [
    `お客様反応: ${intent}`,
    `提案: ${suggestion.suggestedStyleName}`,
    preferredDate ? `希望日時: ${preferredDate.toLocaleString("ja-JP")}` : null,
    alternativeDate1Text,
    alternativeDate2Text,
    urgencyPreferenceText,
    packageInterestText,
    contactName ? `名前: ${contactName}` : null,
    contactPhone ? `連絡先: ${contactPhone}` : null,
    contactPreferenceText,
    stylePriorityText,
    budgetPreferenceText,
    pricePlanText,
    visitTimingText,
    finishByText,
    decisionBlockerText,
    concernText,
    selectedCourseText,
    message ? `メモ: ${message}` : null
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
  await prisma.$transaction(async (tx) => {
    await tx.proposalResponse.create({
      data: {
        suggestionId: suggestion.id,
        customerId: suggestion.customerId,
        intent,
        preferredDate,
        message: responseMessage || null,
        contactName,
        contactPhone
      }
    });

    await tx.contactLog.create({
      data: {
        customerId: suggestion.customerId,
        channel: "提案ページ",
        purpose: "お客様反応",
        message: responseText,
        outcome: intent,
        nextAction,
        scheduledFollowUp: responseFollowUpAt
      }
    });

    if (wantsReservation || wantsConsultation) {
      await tx.styleSuggestion.updateMany({
        where: { customerId: suggestion.customerId, archivedAt: null, id: { not: suggestion.id } },
        data: { accepted: false }
      });
      await tx.styleSuggestion.update({
        where: { id: suggestion.id },
        data: { accepted: true }
      });
    }

    if (selectedCourses.length > 0) {
      await tx.courseRecommendation.updateMany({
        where: {
          id: { in: selectedCourses.map((course) => course.id) },
          customerId: suggestion.customerId
        },
        data: { accepted: true }
      });
    }

    if (wantsReservation && preferredDate) {
      await tx.appointment.create({
        data: {
          customerId: suggestion.customerId,
          scheduledAt: preferredDate,
          menu: suggestion.menuSuggestion ?? suggestion.suggestedStyleName,
          status: "仮予約",
          source: "提案ページ",
          note: [
            `提案ページからの予約希望: ${suggestion.suggestedStyleName}`,
            suggestion.estimatedMinutes ? `目安時間: ${suggestion.estimatedMinutes}分` : null,
            stylePriorityText,
            budgetPreferenceText,
            pricePlanText,
            visitTimingText,
            finishByText,
            decisionBlockerText,
            alternativeDate1Text,
            alternativeDate2Text,
            urgencyPreferenceText,
            packageInterestText,
            selectedCourseText,
            message ? `お客様メモ: ${message}` : null
          ]
            .filter((line): line is string => Boolean(line))
            .join("\n")
        }
      });
    }
  });

  revalidatePath(`/proposals/${suggestion.id}`);
  revalidatePath("/customers");
  revalidatePath("/customers?view=messages");
  revalidatePath("/customers?view=calendar");
  revalidatePath("/customers?view=analytics");
  revalidatePath(`/customers/${suggestion.customerId}`);
}

export async function updateProposalResponseStatus(responseId: string, customerId: string, formData: FormData) {
  const status = requiredString(formData, "status");
  const response = await prisma.proposalResponse.update({
    where: { id: responseId },
    data: { status },
    select: { suggestionId: true }
  });

  revalidatePath("/customers");
  revalidatePath("/customers?view=messages");
  revalidatePath("/customers?view=calendar");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath(`/proposals/${response.suggestionId}`);
}

export async function markProposalResponseHandledWithContactLog(responseId: string, customerId: string, formData: FormData) {
  const message = requiredString(formData, "message");
  const channel = nullableString(formData, "channel") ?? "LINE";
  const nextAction = nullableString(formData, "nextAction") ?? "返信後の反応を確認し、予約または相談へ進める";

  const response = await prisma.$transaction(async (tx) => {
    const updatedResponse = await tx.proposalResponse.update({
      where: { id: responseId },
      data: { status: "対応済み" },
      select: {
        suggestionId: true,
        intent: true,
        preferredDate: true,
        suggestion: {
          select: {
            suggestedStyleName: true
          }
        }
      }
    });

    await tx.contactLog.create({
      data: {
        customerId,
        channel,
        purpose: "提案返信への回答",
        message,
        outcome: `返信済み: ${updatedResponse.intent}`,
        nextAction,
        scheduledFollowUp: updatedResponse.preferredDate ?? addDays(new Date(), 3)
      }
    });

    return updatedResponse;
  });

  revalidatePath("/customers");
  revalidatePath("/customers?view=messages");
  revalidatePath("/customers?view=calendar");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath(`/proposals/${response.suggestionId}`);
}

export async function createStyleSuggestion(customerId: string, formData: FormData) {
  const suggestedStyleName = requiredString(formData, "suggestedStyleName");
  const reason = nullableString(formData, "reason");
  const menuSuggestion = nullableString(formData, "menuSuggestion");
  const label = nullableString(formData, "label");
  const accepted = nullableBoolean(formData, "accepted");

  const suggestion = await prisma.$transaction(async (tx) => {
    const createdSuggestion = await tx.styleSuggestion.create({
      data: {
        customerId,
        visitId: nullableString(formData, "visitId"),
        suggestedStyleName,
        reason,
        caution: nullableString(formData, "caution"),
        stylingAdvice: nullableString(formData, "stylingAdvice"),
        faceAnalysis: nullableString(formData, "faceAnalysis"),
        imagePrompt: nullableString(formData, "imagePrompt"),
        menuSuggestion,
        estimatedMinutes: nullableInt(formData, "estimatedMinutes"),
        maintenanceLevel: nullableString(formData, "maintenanceLevel"),
        label,
        accepted
      }
    });

    await tx.contactLog.create({
      data: {
        customerId,
        channel: "店内",
        purpose: "スタイル提案作成",
        message: [
          `スタッフ提案: ${suggestedStyleName}`,
          label ? `ラベル: ${label}` : null,
          menuSuggestion ? `メニュー候補: ${menuSuggestion}` : null,
          reason ? `理由: ${reason}` : null
        ]
          .filter((line): line is string => Boolean(line))
          .join("\n"),
        outcome: accepted ? "本命提案" : "提案中",
        nextAction: "提案ページを共有し、相談または予約希望を確認する"
      }
    });

    return createdSuggestion;
  });

  revalidatePath(`/customers/${customerId}`);
  revalidatePath(`/proposals/${suggestion.id}`);
  revalidatePath("/customers");
  revalidatePath("/customers?view=styles");
  revalidatePath("/customers?view=messages");
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

  revalidatePath("/customers");
  revalidatePath("/customers?view=analytics");
  revalidatePath(`/customers/${customerId}`);
}

export async function createCourseRecommendation(customerId: string, formData: FormData) {
  await prisma.courseRecommendation.create({
    data: {
      customerId,
      visitId: nullableString(formData, "visitId"),
      title: requiredString(formData, "title"),
      reason: requiredString(formData, "reason"),
      caution: nullableString(formData, "caution"),
      estimatedMinutes: nullableInt(formData, "estimatedMinutes"),
      estimatedPrice: nullableInt(formData, "estimatedPrice"),
      priority: nullableString(formData, "priority"),
      accepted: nullableBoolean(formData, "accepted")
    }
  });

  revalidatePath("/customers");
  revalidatePath("/customers?view=analytics");
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

  revalidatePath("/customers");
  revalidatePath("/customers?view=analytics");
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

export async function removeStyleSuggestionImageUrl(customerId: string, suggestionId: string, imageUrl: string) {
  if (!imageUrl) {
    return;
  }

  const suggestion = await prisma.styleSuggestion.findFirst({
    where: {
      id: suggestionId,
      customerId,
      customer: { deletedAt: null }
    },
    select: { imageUrls: true, imageUrlsJson: true }
  });

  if (!suggestion) {
    throw new Error("髪型提案が見つかりません。");
  }

  const nextEntries = parseImageUrlEntries(suggestion.imageUrlsJson, suggestion.imageUrls).filter(
    (entry) => entry.url !== imageUrl
  );
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

export async function removeStyleSuggestionImageAction(formData: FormData) {
  const styleSuggestionId = String(formData.get("styleSuggestionId") || "");
  const customerId = String(formData.get("customerId") || "");
  const imageUrl = String(formData.get("imageUrl") || "");

  if (!styleSuggestionId || !customerId || !imageUrl) {
    return {
      ok: false,
      message: "生成画像を削除できませんでした。"
    };
  }

  try {
    const suggestion = await prisma.styleSuggestion.findFirst({
      where: {
        id: styleSuggestionId,
        customerId,
        customer: { deletedAt: null }
      },
      select: { imageUrls: true, imageUrlsJson: true }
    });

    if (!suggestion) {
      return {
        ok: false,
        message: "生成画像を削除できませんでした。"
      };
    }

    const existingEntries = parseImageUrlEntries(suggestion.imageUrlsJson, suggestion.imageUrls);
    const nextEntries = existingEntries.filter((entry) => entry.url !== imageUrl);

    if (nextEntries.length === existingEntries.length) {
      return {
        ok: false,
        message: "対象の生成画像が見つかりませんでした。"
      };
    }

    const nextUrls = nextEntries.map((entry) => entry.url);

    await prisma.styleSuggestion.update({
      where: { id: styleSuggestionId },
      data: {
        imageUrls: nextUrls,
        imageUrlsJson: JSON.stringify(nextEntries)
      }
    });

    // TODO: Delete the actual Blob file from Vercel Blob when storage cleanup is required.
    revalidatePath(`/customers/${customerId}`);

    return {
      ok: true,
      message: "生成画像を削除しました。"
    };
  } catch (error) {
    console.error("style suggestion image delete failed", {
      customerId,
      styleSuggestionId,
      imageUrl,
      error
    });

    return {
      ok: false,
      message: "生成画像を削除できませんでした。"
    };
  }
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
            aiFrontImageUrlsJson: true,
            aiSideImageUrlsJson: true,
            aiBackImageUrlsJson: true,
            aiPhotoConsent: true
          }
        }
      }
    });
    const frontUrls = suggestion
      ? uniqueUrls([
          ...parseJsonStringArray(suggestion.customer.aiFrontImageUrlsJson),
          suggestion.customer.aiFrontImageUrl
        ]).slice(0, 1)
      : [];
    const sideUrls = suggestion
      ? uniqueUrls([
          ...parseJsonStringArray(suggestion.customer.aiSideImageUrlsJson),
          suggestion.customer.aiSideImageUrl
        ]).slice(0, 1)
      : [];
    const backUrls = suggestion
      ? uniqueUrls([
          ...parseJsonStringArray(suggestion.customer.aiBackImageUrlsJson),
          suggestion.customer.aiBackImageUrl
        ]).slice(0, 1)
      : [];

    console.log("image generation started", {
      customerId,
      styleSuggestionId,
      ENABLE_STYLE_IMAGE_GENERATION: process.env.ENABLE_STYLE_IMAGE_GENERATION,
      STYLE_SIMULATION_PROVIDER: process.env.STYLE_SIMULATION_PROVIDER,
      hasFalKey: Boolean(process.env.FAL_KEY),
      frontImageCount: frontUrls.length,
      sideImageCount: sideUrls.length,
      backImageCount: backUrls.length,
      aiPhotoConsent: Boolean(suggestion?.customer.aiPhotoConsent),
      OPENAI_IMAGE_MODEL: process.env.OPENAI_IMAGE_MODEL
    });

    if (!suggestion) {
      return { ok: false, message: "髪型提案が見つかりません。" };
    }

    if (!suggestion.customer.aiPhotoConsent) {
      return { ok: false, message: "AI画像生成への同意を取得済みにしてください。" };
    }

    const missingMessages = [
      frontUrls.length < 1 ? "正面写真が1枚必要です" : "",
      sideUrls.length < 1 ? "横顔写真が1枚必要です" : "",
      backUrls.length < 1 ? "斜め後ろ写真が1枚必要です" : ""
    ].filter(Boolean);

    if (missingMessages.length > 0) {
      return { ok: false, message: `${missingMessages.join("、")}。` };
    }

    if (process.env.ENABLE_STYLE_IMAGE_GENERATION !== "true") {
      return { ok: false, message: "画像生成は無効です。ENABLE_STYLE_IMAGE_GENERATION=true を設定してください。" };
    }

    const simulationResult = await generateStyleSimulation({
      customerId,
      styleSuggestionId,
      styleName: suggestion.suggestedStyleName,
      hairPrompt:
        suggestion.imagePrompt ??
        [
          "顧客本人の写真をもとに、顔立ち・表情・顔の向きは維持し、髪型だけを自然に変更してください。",
          suggestion.suggestedStyleName,
          suggestion.reason,
          suggestion.caution,
          suggestion.stylingAdvice
        ]
          .filter(Boolean)
          .join("\n"),
      frontImageUrls: frontUrls,
      sideImageUrls: sideUrls,
      backImageUrls: backUrls,
      angles: ["front_three_quarter", "side", "back_three_quarter"]
    });

    console.log("style simulation generation finished", {
      customerId,
      styleSuggestionId,
      provider: simulationResult.provider,
      requestedProvider: simulationResult.requestedProvider,
      fallbackReason: simulationResult.fallbackReason,
      imageCount: simulationResult.images.length,
      ok: simulationResult.ok
    });

    if (simulationResult.ok && simulationResult.provider === "fal-identity-master" && simulationResult.images.length === 0) {
      revalidatePath(`/customers/${customerId}`);

      return {
        ok: true,
        message:
          simulationResult.message ??
          "FaceID基準画像を生成しました。最終髪型シミュレーション画像としては保存していません。",
        imageUrls: suggestion.imageUrls,
        selectedSuggestionId: styleSuggestionId
      };
    }

    if (!simulationResult.ok || simulationResult.images.length === 0) {
      return {
        ok: false,
        message: simulationResult.message ?? "画像生成結果が空でした。Vercel Logsで詳細を確認してください。"
      };
    }

    const existingEntries = parseImageUrlEntries(suggestion.imageUrlsJson, suggestion.imageUrls);
    const generatedEntries: StyleImageUrlEntry[] = [];
    const qualityCheckedImages: typeof simulationResult.images = [];

    for (const image of simulationResult.images) {
      const provider = image.provider ?? simulationResult.provider;

      if (!isPhotomakerOnlyImage(provider)) {
        qualityCheckedImages.push(image);
        continue;
      }

      const qualityCheck = await checkGeneratedImageQuality({
        imageUrl: image.url,
        angle: image.angle,
        provider
      });

      if (qualityCheck.ok) {
        qualityCheckedImages.push(image);
      } else {
        console.warn("generated image rejected by quality check", {
          customerId,
          styleSuggestionId,
          angle: image.angle,
          provider,
          reason: qualityCheck.reason,
          warnings: qualityCheck.warnings
        });
      }
    }

    if (qualityCheckedImages.length === 0 || (simulationResult.provider === "fal-identity-master" && qualityCheckedImages.length < 3)) {
      return {
        ok: false,
        message:
          simulationResult.provider === "fal-identity-master" || simulationResult.images.some((image) => isPhotomakerOnlyImage(image.provider))
            ? "PhotoMaker生成画像が破綻したため保存しませんでした。"
            : "生成画像が破綻したため保存しませんでした。別の方式で再生成してください。"
      };
    }

    for (const image of qualityCheckedImages) {
      let identityCheck = await checkGeneratedImageIdentity({
        referenceFrontImageUrls: frontUrls,
        referenceSideImageUrls: sideUrls,
        referenceBackImageUrls: backUrls,
        generatedImageUrl: image.url,
        angle: image.angle
      });

      if (
        simulationResult.provider === "fal-identity-master-openai-edit" &&
        typeof image.identityScore === "number" &&
        image.identityScore >= finalIdentitySaveMinScore(image.angle, image.provider) &&
        (identityCheck.level === "low" || identityCheck.score < finalIdentitySaveMinScore(image.angle, image.provider))
      ) {
        const retryIdentityCheck = await checkGeneratedImageIdentity({
          referenceFrontImageUrls: frontUrls,
          referenceSideImageUrls: sideUrls,
          referenceBackImageUrls: backUrls,
          generatedImageUrl: image.url,
          angle: image.angle
        });

        console.log("final identity check retried after score disagreement", {
          customerId,
          styleSuggestionId,
          angle: image.angle,
          provider: simulationResult.provider,
          providerScore: image.identityScore,
          firstScore: identityCheck.score,
          firstLevel: identityCheck.level,
          retryScore: retryIdentityCheck.score,
          retryLevel: retryIdentityCheck.level
        });

        if (retryIdentityCheck.score > identityCheck.score) {
          identityCheck = retryIdentityCheck;
        }
      }

      if (
        simulationResult.provider === "fal-identity-master-openai-edit" &&
        (identityCheck.level === "low" || identityCheck.score < finalIdentitySaveMinScore(image.angle, image.provider))
      ) {
        console.warn("generated image rejected by final identity check", {
          customerId,
          styleSuggestionId,
          angle: image.angle,
          provider: simulationResult.provider,
          score: identityCheck.score,
          level: identityCheck.level,
          reason: identityCheck.reason
        });
        continue;
      }

      generatedEntries.push({
        angle: image.angle,
        url: image.url,
        provider: image.provider ?? simulationResult.provider,
        identityScore: identityCheck.score,
        identityLevel: identityCheck.level,
        identityWarning:
          identityCheck.level === "low"
            ? identityCheck.reason
            : identityCheck.warnings.length > 0
              ? identityCheck.warnings.join(" / ")
              : null
      });
    }

    if (generatedEntries.length === 0) {
      return {
        ok: false,
        message: "生成画像が本人性チェックを通過しなかったため保存しませんでした。"
      };
    }

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
      message:
        simulationResult.message ??
        `${simulationResult.provider}で本人写真ベースの画像を生成しました。`,
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
  await prisma.$transaction(async (tx) => {
    if (accepted) {
      await tx.styleSuggestion.updateMany({
        where: { customerId, archivedAt: null, id: { not: suggestionId } },
        data: { accepted: false }
      });
    }

    await tx.styleSuggestion.updateMany({
      where: { id: suggestionId, customerId },
      data: { accepted }
    });
  });

  revalidatePath(`/customers/${customerId}`);
  revalidatePath(`/proposals/${suggestionId}`);
  revalidatePath("/customers");
  revalidatePath("/customers?view=styles");
  revalidatePath("/customers?view=messages");
}
