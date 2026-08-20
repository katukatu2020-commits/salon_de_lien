import fs from "node:fs";

const chunkPaths = [
  "/app/.next/server/chunks/2616.js",
  "/app/.next/server/chunks/8043.js",
  "/app/.next/server/chunks/9542.js",
];

const helperPattern = /function ([a-z])\(e\)\{let t=e\.visits\[0\];if\(t\)return`前回担当: \$\{([a-z])\(t\.stylistName\)\?\?"フリー"\}`;.*?return`前回担当: \$\{[a-z]\?\?"フリー"\}`\}/s;

for (const chunkPath of chunkPaths) {
  const source = fs.readFileSync(chunkPath, "utf8");
  const matches = [...source.matchAll(new RegExp(helperPattern.source, "gs"))];
  if (matches.length !== 1) {
    throw new Error(`Expected one duplicate helper in ${chunkPath}, found ${matches.length}`);
  }
  const [, helperName, normalizeName] = matches[0];
  const after = `function ${helperName}(e){let t=e.serviceSales?.[0],a=${normalizeName}(t?.appointment?.staffName);return\`前回担当: \${a??"未登録"}\`}`;
  fs.writeFileSync(chunkPath, source.replace(helperPattern, after));
}
