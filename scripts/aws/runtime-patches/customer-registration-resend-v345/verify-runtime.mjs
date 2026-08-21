import fs from "node:fs";

const checks = [
  ["/app/server.js", "customer-registration-resend-v345"],
  ["/app/.next/server/app/u/register/page.js", "/customer-registration-resend-v345.js"],
  ["/app/.next/server/app/api/customer-auth/registration-link/request/route.js", "latestInvite&&Date.now()"],
  ["/app/customer-registration-resend-v345.js", "再送まで ${remaining}秒"],
  ["/app/customer-registration-resend-v345.js", "COOLDOWN_MS = 60_000"]
];

for (const [file, marker] of checks) {
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes(marker)) throw new Error(`missing ${marker} in ${file}`);
}
console.log("Customer registration resend v345 verification passed");
