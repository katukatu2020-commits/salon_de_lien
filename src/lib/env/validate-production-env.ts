function isLocalHost(value: string) {
  return /(?:localhost|127\.0\.0\.1|\[::1\])/i.test(value);
}

export function validateProductionEnvironment() {
  if (process.env.APP_ENV !== "production") return;

  const failures: string[] = [];
  const appUrl = process.env.APP_URL?.trim() ?? "";
  const databaseTarget = process.env.DATABASE_URL?.trim() || process.env.DB_HOST?.trim() || "";

  if (!appUrl.startsWith("https://")) failures.push("APP_URL must use HTTPS");
  if (!process.env.ADMIN_AUTH_SECRET || process.env.ADMIN_AUTH_SECRET.length < 32) {
    failures.push("ADMIN_AUTH_SECRET must be at least 32 characters");
  }
  if (!process.env.CUSTOMER_AUTH_SECRET || process.env.CUSTOMER_AUTH_SECRET.length < 32) {
    failures.push("CUSTOMER_AUTH_SECRET must be at least 32 characters");
  }
  if (process.env.CUSTOMER_AUTH_SECRET === process.env.ADMIN_AUTH_SECRET) {
    failures.push("customer and admin auth secrets must be different");
  }
  if (!databaseTarget || isLocalHost(databaseTarget)) failures.push("production database target is invalid");
  if (process.env.STORAGE_PROVIDER !== "s3") failures.push("STORAGE_PROVIDER must be s3");
  if (!process.env.S3_PRIVATE_ASSETS_BUCKET?.trim()) failures.push("S3 private bucket is required");
  if (process.env.ALLOW_DEMO_DATA === "true") failures.push("demo data must be disabled");
  if (process.env.ALLOW_LEGACY_CUSTOMER_ID_PORTAL === "true") failures.push("legacy customer ID portal must be disabled");

  if (failures.length > 0) {
    throw new Error(`Production environment validation failed: ${failures.join("; ")}`);
  }
}
