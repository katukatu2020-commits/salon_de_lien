const fs = require("node:fs");

function patchOnce(filePath, before, after, label) {
  const source = fs.readFileSync(filePath, "utf8");
  const matches = source.split(before).length - 1;
  if (matches !== 1) {
    throw new Error(`${label}: expected one match in ${filePath}, found ${matches}`);
  }
  fs.writeFileSync(filePath, source.replace(before, after), "utf8");
  console.log(`Patched ${label}: ${filePath}`);
}

patchOnce(
  "/app/billing.js",
  "MessageStream: String(input.messageStream || config.transactionalStream),\n  }",
  "MessageStream: String(input.messageStream || config.transactionalStream),\n    TrackOpens: false,\n    TrackLinks: 'None',\n  }",
  "store registration links"
);

for (const routePath of [
  "/app/.next/server/app/api/auth/password-reset/request/route.js",
  "/app/.next/server/app/api/customer-auth/registration-link/request/route.js",
]) {
  patchOnce(
    routePath,
    "TextBody:String(e.body||\"\"),MessageStream:stream}",
    "TextBody:String(e.body||\"\"),MessageStream:stream,TrackOpens:false,TrackLinks:\"None\"}",
    "transactional links"
  );
}

const broadcastChunk = "/app/.next/server/chunks/9845.js";
patchOnce(
  broadcastChunk,
  "MessageStream: stream,\n        };\n        if (replyTo)",
  "MessageStream: stream,\n        };\n        if (stream !== String(process.env.POSTMARK_BROADCAST_STREAM || \"broadcast\").trim()) {\n          payload.TrackOpens = false;\n          payload.TrackLinks = \"None\";\n        }\n        if (replyTo)",
  "transactional shared sender links"
);

for (const filePath of [
  "/app/billing.js",
  "/app/.next/server/app/api/auth/password-reset/request/route.js",
  "/app/.next/server/app/api/customer-auth/registration-link/request/route.js",
]) {
  const source = fs.readFileSync(filePath, "utf8");
  if (!source.includes("TrackLinks") || !source.includes("None")) {
    throw new Error(`${filePath}: link tracking override is missing`);
  }
}

console.log("Postmark link tracking is disabled for transactional and security emails.");
