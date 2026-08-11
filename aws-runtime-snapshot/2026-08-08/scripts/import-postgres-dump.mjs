import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parseS3Uri(value) {
  const match = /^s3:\/\/([^/]+)\/(.+)$/.exec(value);
  if (!match) throw new Error("Expected an s3://bucket/key dump URI");
  return { bucket: match[1], key: match[2] };
}

function sha256File(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(path);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function runRestore(path) {
  const args = [
    "--exit-on-error",
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "--host",
    required("DB_HOST"),
    "--port",
    required("DB_PORT"),
    "--username",
    required("DB_USER"),
    "--dbname",
    required("DB_NAME"),
    path
  ];

  return new Promise((resolve, reject) => {
    const child = spawn("pg_restore", args, {
      stdio: "inherit",
      env: {
        ...process.env,
        PGPASSWORD: required("DB_PASSWORD"),
        PGSSLMODE: process.env.DB_SSL_MODE ?? "require"
      }
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_restore failed with exit code ${code ?? "unknown"}`));
    });
  });
}

async function main() {
  if (process.env.ALLOW_DATABASE_RESTORE !== "true") {
    throw new Error("Database restore is disabled. Set ALLOW_DATABASE_RESTORE=true for the one-off task.");
  }
  if (process.env.APP_ENV === "production" && process.env.ALLOW_PRODUCTION_DATABASE_RESTORE !== "true") {
    throw new Error("Production restore requires ALLOW_PRODUCTION_DATABASE_RESTORE=true");
  }

  const dumpUri = process.argv[2];
  if (!dumpUri) throw new Error("Dump URI argument is required");
  const { bucket, key } = parseS3Uri(dumpUri);
  if (!key.startsWith("private/migrations/")) {
    throw new Error("Database dumps must be stored under private/migrations/");
  }

  const localPath = "/tmp/salon-de-lien.restore.dump";
  const client = new S3Client({ region: process.env.AWS_REGION });
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body) throw new Error("S3 dump response did not contain a body");

  try {
    await pipeline(result.Body, createWriteStream(localPath, { mode: 0o600 }));
    const actualSha256 = await sha256File(localPath);
    const expectedSha256 = process.env.DATABASE_DUMP_SHA256?.trim().toLowerCase();
    if (expectedSha256 && actualSha256 !== expectedSha256) {
      throw new Error("Database dump checksum mismatch");
    }
    await runRestore(localPath);
    process.stdout.write(JSON.stringify({ restored: true, bucket, key, sha256: actualSha256 }) + "\n");
  } finally {
    await rm(localPath, { force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
