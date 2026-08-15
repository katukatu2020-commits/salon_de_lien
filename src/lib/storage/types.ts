export type StorageObjectInput = {
  objectKey: string;
  body: Buffer;
  contentType: string;
  contentLength: number;
  checksumSha256: string;
  metadata?: Record<string, string>;
};

export type StoredObject = {
  reference: string;
  objectKey: string;
};

export interface StorageProvider {
  readonly name: "s3" | "vercel-blob";
  upload(input: StorageObjectInput): Promise<StoredObject>;
  delete(reference: string): Promise<void>;
  getReadUrl(reference: string, expiresInSeconds?: number): Promise<string>;
}
