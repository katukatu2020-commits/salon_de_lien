import { del, put } from "@vercel/blob";
import type { StorageObjectInput, StorageProvider, StoredObject } from "@/lib/storage/types";

export class VercelBlobStorageProvider implements StorageProvider {
  readonly name = "vercel-blob" as const;

  async upload(input: StorageObjectInput): Promise<StoredObject> {
    const blob = await put(input.objectKey, input.body, {
      access: "public",
      addRandomSuffix: false,
      contentType: input.contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    return { objectKey: input.objectKey, reference: blob.url };
  }

  async delete(reference: string) {
    if (reference.startsWith("http://") || reference.startsWith("https://")) {
      await del(reference, { token: process.env.BLOB_READ_WRITE_TOKEN });
    }
  }

  async getReadUrl(reference: string) {
    return reference;
  }
}
