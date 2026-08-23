import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { hasValidRequestOrigin } from "@/lib/auth/request-security";
import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_PHOTO_TYPES,
  MAX_CUSTOMER_PHOTO_BYTES,
  deleteCustomerPhotoReference,
  storeCustomerPhoto
} from "@/lib/storage/customer-photo";

const MAX_MULTIPART_BYTES = MAX_CUSTOMER_PHOTO_BYTES + 512 * 1024;

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

function expectedUploadMessage(error: unknown) {
  if (!(error instanceof Error)) return null;
  const allowedMessages = [
    "写真は5MB以下にしてください。",
    "写真は JPG / PNG / WebP のみアップロードできます。",
    "安全な静止画像として読み込めませんでした。"
  ];
  return allowedMessages.includes(error.message) ? error.message : null;
}

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) return json({ error: "不正な送信元です。" }, 403);

  const session = await getCurrentCustomerSession();
  if (!session) return json({ error: "ログインし直してください。" }, 401);

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
    return json({ error: "プロフィール画像は5MB以下にしてください。" }, 413);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: "画像データを読み込めませんでした。もう一度選択してください。" }, 400);
  }

  const imageFile = formData.get("profileImage");
  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return json({ error: "プロフィール画像を選択してください。" }, 400);
  }
  if (!CUSTOMER_PHOTO_TYPES.includes(imageFile.type as (typeof CUSTOMER_PHOTO_TYPES)[number])) {
    return json({ error: "プロフィール画像は JPG / PNG / WebP のみアップロードできます。" }, 415);
  }
  if (imageFile.size > MAX_CUSTOMER_PHOTO_BYTES) {
    return json({ error: "プロフィール画像は5MB以下にしてください。" }, 413);
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: session.customerId,
      organizationId: session.organizationId,
      deletedAt: null
    },
    select: { id: true, organizationId: true, profileImageUrl: true }
  });
  if (!customer) return json({ error: "顧客情報が見つかりません。" }, 404);

  let stored: Awaited<ReturnType<typeof storeCustomerPhoto>> | null = null;
  try {
    stored = await storeCustomerPhoto({
      file: imageFile,
      organizationId: customer.organizationId,
      customerId: customer.id,
      kind: "profile"
    });

    const updated = await prisma.customer.updateMany({
      where: {
        id: customer.id,
        organizationId: customer.organizationId,
        deletedAt: null,
        profileImageUrl: customer.profileImageUrl
      },
      data: { profileImageUrl: stored.reference }
    });

    if (updated.count !== 1) {
      await deleteCustomerPhotoReference(stored.reference).catch(() => undefined);
      return json({ error: "画像が同時に更新されました。画面を再読み込みしてお試しください。" }, 409);
    }
  } catch (error) {
    if (stored) await deleteCustomerPhotoReference(stored.reference).catch(() => undefined);
    const expectedMessage = expectedUploadMessage(error);
    if (expectedMessage) return json({ error: expectedMessage }, 400);
    console.error("[customer-profile-image] upload failed", {
      name: error instanceof Error ? error.name : "UnknownError"
    });
    return json({ error: "画像を保存できませんでした。時間をおいてもう一度お試しください。" }, 500);
  }

  await deleteCustomerPhotoReference(customer.profileImageUrl).catch((error) => {
    console.warn("[customer-profile-image] previous image cleanup failed", {
      name: error instanceof Error ? error.name : "UnknownError"
    });
  });

  revalidatePath("/u/home");
  revalidatePath("/u/profile");
  revalidatePath(`/admin/customers/${customer.id}`);

  return json({
    success: true,
    message: "プロフィール画像を更新しました。",
    imageUrl: stored?.readUrl
  });
}
