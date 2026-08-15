import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";
import {
  deleteCustomerPhotoReference,
  storeCustomerPhotoBuffer
} from "../src/lib/storage/customer-photo-core";
import { isPrivateS3Reference } from "../src/lib/storage/s3-private-storage-core";

type PhotoField = "profileImageUrl" | "aiFrontImageUrl" | "aiSideImageUrl" | "aiBackImageUrl";
type JsonPhotoField = "aiFrontImageUrlsJson" | "aiSideImageUrlsJson" | "aiBackImageUrlsJson";
type PhotoKind = "profile" | "ai-reference";

const apply = process.argv.includes("--apply");
const allowProduction = process.env.ALLOW_STORAGE_MIGRATION === "true";

if (process.env.APP_ENV === "production" && !allowProduction) {
  throw new Error("Production migration is disabled. Run against a restored staging database first.");
}
if (apply && process.env.STORAGE_PROVIDER !== "s3") {
  throw new Error("--apply requires STORAGE_PROVIDER=s3");
}

function parseJsonArray(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function loadSource(reference: string) {
  if (/^https?:\/\//i.test(reference)) {
    const response = await fetch(reference, { redirect: "follow" });
    if (!response.ok) throw new Error(`Source download failed: HTTP ${response.status}`);
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > 5 * 1024 * 1024) throw new Error("Source exceeds 5MB");
    return Buffer.from(await response.arrayBuffer());
  }

  const localPath = reference.startsWith("/")
    ? resolve(process.cwd(), "public", reference.replace(/^\/+/, ""))
    : resolve(process.cwd(), reference);
  return readFile(localPath);
}

async function migrateReference({
  reference,
  organizationId,
  customerId,
  kind
}: {
  reference: string;
  organizationId: string;
  customerId: string;
  kind: PhotoKind;
}) {
  if (isPrivateS3Reference(reference)) return { reference, changed: false };
  if (!apply) return { reference, changed: true };
  const body = await loadSource(reference);
  const stored = await storeCustomerPhotoBuffer({ body, organizationId, customerId, kind });
  return { reference: stored.reference, changed: true };
}

async function main() {
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      organizationId: true,
      profileImageUrl: true,
      aiFrontImageUrl: true,
      aiSideImageUrl: true,
      aiBackImageUrl: true,
      aiFrontImageUrlsJson: true,
      aiSideImageUrlsJson: true,
      aiBackImageUrlsJson: true
    }
  });

  let candidates = 0;
  let migrated = 0;
  const failures: Array<{ customerId: string; field: string; error: string }> = [];
  const scalarFields: Array<{ field: PhotoField; kind: PhotoKind }> = [
    { field: "profileImageUrl", kind: "profile" },
    { field: "aiFrontImageUrl", kind: "ai-reference" },
    { field: "aiSideImageUrl", kind: "ai-reference" },
    { field: "aiBackImageUrl", kind: "ai-reference" }
  ];
  const jsonFields: JsonPhotoField[] = ["aiFrontImageUrlsJson", "aiSideImageUrlsJson", "aiBackImageUrlsJson"];

  for (const customer of customers) {
    const data: Partial<Record<PhotoField | JsonPhotoField, string>> = {};
    const uploadedReferences: string[] = [];

    try {
      for (const { field, kind } of scalarFields) {
        const source = customer[field];
        if (!source || isPrivateS3Reference(source)) continue;
        candidates += 1;
        const result = await migrateReference({
          reference: source,
          organizationId: customer.organizationId,
          customerId: customer.id,
          kind
        });
        if (result.changed && apply) {
          data[field] = result.reference;
          uploadedReferences.push(result.reference);
          migrated += 1;
        }
      }

      for (const field of jsonFields) {
        const sources = parseJsonArray(customer[field]);
        if (sources.length === 0) continue;
        let changed = false;
        const next: string[] = [];
        for (const source of sources) {
          if (isPrivateS3Reference(source)) {
            next.push(source);
            continue;
          }
          candidates += 1;
          const result = await migrateReference({
            reference: source,
            organizationId: customer.organizationId,
            customerId: customer.id,
            kind: "ai-reference"
          });
          next.push(result.reference);
          if (result.changed && apply) {
            changed = true;
            uploadedReferences.push(result.reference);
            migrated += 1;
          }
        }
        if (changed) data[field] = JSON.stringify(next);
      }

      if (apply && Object.keys(data).length > 0) {
        await prisma.customer.update({ where: { id: customer.id }, data });
      }
    } catch (error) {
      await Promise.all(uploadedReferences.map((reference) => deleteCustomerPhotoReference(reference).catch(() => undefined)));
      failures.push({
        customerId: customer.id,
        field: Object.keys(data).join(",") || "source",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", customers: customers.length, candidates, migrated, failures }, null, 2));
  if (failures.length > 0) process.exitCode = 1;
}

main().finally(async () => {
  await prisma.$disconnect();
});
