import { createHash, randomUUID } from "crypto";
import sharp from "sharp";
import { S3PrivateStorageProvider, isPrivateS3Reference } from "@/lib/storage/s3-private-storage-core";
import type { StorageProvider } from "@/lib/storage/types";
import { VercelBlobStorageProvider } from "@/lib/storage/vercel-blob-storage-core";

export const MAX_CUSTOMER_PHOTO_BYTES = 5 * 1024 * 1024;
export const CUSTOMER_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const DEFAULT_ORGANIZATION_ID = "org_salon_de_lien";

type CustomerPhotoKind = "profile" | "intake" | "ai-reference" | "before" | "after";

function safePathPart(value: string, fallback: string) {
  const safe = value.trim().replace(/[^A-Za-z0-9_-]/g, "");
  return safe || fallback;
}

function storageProvider(): StorageProvider {
  const configured = process.env.STORAGE_PROVIDER?.trim().toLowerCase();
  if (configured === "s3" || (!configured && process.env.S3_PRIVATE_ASSETS_BUCKET)) {
    return new S3PrivateStorageProvider();
  }
  if (process.env.APP_ENV === "production") {
    throw new Error("Production customer photo storage requires STORAGE_PROVIDER=s3");
  }
  return new VercelBlobStorageProvider();
}

export function customerPhotoObjectKey({
  organizationId = process.env.DEFAULT_ORGANIZATION_ID ?? DEFAULT_ORGANIZATION_ID,
  customerId,
  visitId,
  kind
}: {
  organizationId?: string;
  customerId: string;
  visitId?: string | null;
  kind: CustomerPhotoKind;
}) {
  return [
    "private/customer-photos",
    safePathPart(organizationId, DEFAULT_ORGANIZATION_ID),
    safePathPart(customerId, "customer"),
    safePathPart(visitId ?? "unassigned", "unassigned"),
    `${safePathPart(kind, "photo")}-${randomUUID()}.jpg`
  ].join("/");
}

async function normalizeCustomerPhotoBuffer(input: Buffer) {
  if (input.byteLength <= 0 || input.byteLength > MAX_CUSTOMER_PHOTO_BYTES) {
    throw new Error("写真は5MB以下にしてください。");
  }

  const metadata = await sharp(input, { failOn: "error", limitInputPixels: 40_000_000 }).metadata();
  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format) || (metadata.pages ?? 1) > 1) {
    throw new Error("安全な静止画像として読み込めませんでした。");
  }

  const body = await sharp(input, { failOn: "error", limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  return {
    body,
    contentType: "image/jpeg",
    contentLength: body.byteLength,
    checksumHex: createHash("sha256").update(body).digest("hex"),
    checksumBase64: createHash("sha256").update(body).digest("base64")
  };
}

export async function normalizeCustomerPhoto(file: File) {
  if (!CUSTOMER_PHOTO_TYPES.includes(file.type as (typeof CUSTOMER_PHOTO_TYPES)[number])) {
    throw new Error("写真は JPG / PNG / WebP のみアップロードできます。");
  }
  return normalizeCustomerPhotoBuffer(Buffer.from(await file.arrayBuffer()));
}

async function storeNormalizedCustomerPhoto({
  normalized,
  organizationId,
  customerId,
  visitId,
  kind
}: {
  normalized: Awaited<ReturnType<typeof normalizeCustomerPhotoBuffer>>;
  organizationId?: string;
  customerId: string;
  visitId?: string | null;
  kind: CustomerPhotoKind;
}) {
  const provider = storageProvider();
  const stored = await provider.upload({
    objectKey: customerPhotoObjectKey({ organizationId, customerId, visitId, kind }),
    body: normalized.body,
    contentType: normalized.contentType,
    contentLength: normalized.contentLength,
    checksumSha256: normalized.checksumBase64,
    metadata: {
      "content-sha256": normalized.checksumHex,
      kind
    }
  });

  return {
    ...stored,
    provider: provider.name,
    readUrl: await provider.getReadUrl(stored.reference),
    checksumSha256: normalized.checksumHex,
    byteSize: normalized.contentLength
  };
}

export async function storeCustomerPhoto({
  file,
  organizationId,
  customerId,
  visitId,
  kind
}: {
  file: File;
  organizationId?: string;
  customerId: string;
  visitId?: string | null;
  kind: CustomerPhotoKind;
}) {
  const normalized = await normalizeCustomerPhoto(file);
  return storeNormalizedCustomerPhoto({ normalized, organizationId, customerId, visitId, kind });
}

export async function storeCustomerPhotoBuffer({
  body,
  organizationId,
  customerId,
  visitId,
  kind
}: {
  body: Buffer;
  organizationId?: string;
  customerId: string;
  visitId?: string | null;
  kind: CustomerPhotoKind;
}) {
  const normalized = await normalizeCustomerPhotoBuffer(body);
  return storeNormalizedCustomerPhoto({ normalized, organizationId, customerId, visitId, kind });
}

export async function resolveCustomerPhotoReference(reference: string | null | undefined) {
  if (!reference) return null;
  if (!isPrivateS3Reference(reference)) return reference;
  try {
    return await new S3PrivateStorageProvider().getReadUrl(reference);
  } catch (error) {
    // A stale or malformed photo must not take down the entire customer record.
    console.error("[customer-photo] Failed to resolve a private photo reference", {
      errorName: error instanceof Error ? error.name : "UnknownError"
    });
    return null;
  }
}

export async function deleteCustomerPhotoReference(reference: string | null | undefined) {
  if (!reference) return;
  const provider: StorageProvider = isPrivateS3Reference(reference)
    ? new S3PrivateStorageProvider()
    : new VercelBlobStorageProvider();
  await provider.delete(reference);
}

export async function resolveCustomerPhotoReferences(values: Array<string | null | undefined>) {
  const resolved = await Promise.all(values.map((value) => resolveCustomerPhotoReference(value)));
  return resolved.filter((value): value is string => Boolean(value));
}
