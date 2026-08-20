import fs from "node:fs";

const chunkPaths = [
  "/app/.next/server/chunks/2616.js",
  "/app/.next/server/chunks/3491.js",
  "/app/.next/server/chunks/8043.js",
  "/app/.next/server/chunks/9542.js",
];

for (const chunkPath of chunkPaths) {
  const source = fs.readFileSync(chunkPath, "utf8");
  if (!source.includes("e.serviceSales?.[0]")) {
    throw new Error(`${chunkPath} does not use paid sales for previous staff`);
  }
  if (source.includes('let t=e.visits[0];if(t)return`前回担当')) {
    throw new Error(`${chunkPath} still contains the visit-based helper`);
  }
}

console.log("paid-previous-staff-v332 duplicate runtime verification passed");
