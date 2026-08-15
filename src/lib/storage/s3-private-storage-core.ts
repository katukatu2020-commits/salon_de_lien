import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageObjectInput, StorageProvider, StoredObject } from "@/lib/storage/types";

const S3_REFERENCE_PREFIX = "s3-private://";

function requiredBucket() {
  const bucket = process.env.S3_PRIVATE_ASSETS_BUCKET?.trim();
  if (!bucket) throw new Error("S3_PRIVATE_ASSETS_BUCKET is not configured");
  return bucket;
}

function objectKeyFromReference(reference: string) {
  if (!reference.startsWith(S3_REFERENCE_PREFIX)) {
    throw new Error("Invalid private S3 object reference");
  }
  const objectKey = reference.slice(S3_REFERENCE_PREFIX.length);
  if (!objectKey || objectKey.includes("..")) throw new Error("Invalid private S3 object key");
  return objectKey;
}

function signedUrlTtlSeconds(value?: number) {
  const configured = Number(process.env.S3_SIGNED_URL_TTL_SECONDS ?? 300);
  const requested = value ?? configured;
  return Math.min(900, Math.max(60, Number.isFinite(requested) ? Math.floor(requested) : 300));
}

export class S3PrivateStorageProvider implements StorageProvider {
  readonly name = "s3" as const;
  private readonly client = new S3Client({ region: process.env.AWS_REGION ?? "ap-northeast-1" });

  async upload(input: StorageObjectInput): Promise<StoredObject> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: requiredBucket(),
        Key: input.objectKey,
        Body: input.body,
        ContentType: input.contentType,
        ContentLength: input.contentLength,
        ChecksumSHA256: input.checksumSha256,
        ServerSideEncryption: "AES256",
        Metadata: input.metadata,
        CacheControl: "private, max-age=0, no-store"
      })
    );

    return {
      objectKey: input.objectKey,
      reference: `${S3_REFERENCE_PREFIX}${input.objectKey}`
    };
  }

  async delete(reference: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: requiredBucket(),
        Key: objectKeyFromReference(reference)
      })
    );
  }

  async getReadUrl(reference: string, expiresInSeconds?: number) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: requiredBucket(),
        Key: objectKeyFromReference(reference)
      }),
      { expiresIn: signedUrlTtlSeconds(expiresInSeconds) }
    );
  }
}

export function isPrivateS3Reference(value: string | null | undefined): value is string {
  return Boolean(value?.startsWith(S3_REFERENCE_PREFIX));
}

export function privateS3ReferenceFromReadUrl(value: string) {
  if (isPrivateS3Reference(value)) return value;
  try {
    const bucket = requiredBucket();
    const url = new URL(value);
    if (!url.hostname.startsWith(`${bucket}.s3`)) return null;
    const objectKey = decodeURIComponent(url.pathname.replace(/^\//, ""));
    if (!objectKey.startsWith("private/customer-photos/") || objectKey.includes("..")) return null;
    return `${S3_REFERENCE_PREFIX}${objectKey}`;
  } catch {
    return null;
  }
}
