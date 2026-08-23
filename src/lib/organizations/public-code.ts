import { createHash } from "node:crypto";

export function organizationPublicCode(organizationId: string) {
  const suffix = createHash("md5")
    .update(organizationId, "utf8")
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();

  return `STORE-${suffix}`;
}
