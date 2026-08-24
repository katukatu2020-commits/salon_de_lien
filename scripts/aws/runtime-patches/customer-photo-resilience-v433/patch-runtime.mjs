import fs from "node:fs";

const chunkDirectory = "/app/.next/server/chunks";
const resolverPattern = /async function ([a-z])\(e\) \{\s*return e \? \(\(0, ([a-z])\._f\)\(e\) \? new \2\.S_\(\)\.getReadUrl\(e\) : e\) : null;\s*\}/g;
let replacementCount = 0;
let customerAccessReplacementCount = 0;

for (const entry of fs.readdirSync(chunkDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
  const filePath = `${chunkDirectory}/${entry.name}`;
  const source = fs.readFileSync(filePath, "utf8");
  const matches = [...source.matchAll(resolverPattern)];
  const customerAccessPattern = /let \{ session: ([A-Za-z_$][\w$]*) \} = await \(0, ([A-Za-z_$][\w$]*)\.zH\)\(e\.id\);/g;
  const customerAccessMatches = [...source.matchAll(customerAccessPattern)];
  if (matches.length === 0 && customerAccessMatches.length === 0) continue;

  const patched = source.replace(resolverPattern, (_match, functionName, storageModule) => `async function ${functionName}(e) {
            if (!e) return null;
            if (!(0, ${storageModule}._f)(e)) return e;
            try {
              return await new ${storageModule}.S_().getReadUrl(e);
            } catch (t) {
              return console.error("[customer-photo] Failed to resolve a private photo reference", {
                errorName: t instanceof Error ? t.name : "UnknownError",
              }), null;
            }
          }`);
  const customerAccessPatched = patched.replace(
    customerAccessPattern,
    (_match, sessionName, authorizationModule) => `let ${sessionName};
            try {
              ({ session: ${sessionName} } = await (0, ${authorizationModule}.zH)(e.id));
            } catch (t) {
              if ("AuthorizationError" === t?.name && 404 === t?.status) (0, l.notFound)();
              throw t;
            }`
  );
  fs.writeFileSync(filePath, customerAccessPatched);
  replacementCount += matches.length;
  customerAccessReplacementCount += customerAccessMatches.length;
}

if (replacementCount !== 2) {
  throw new Error(`private photo resolver: expected 2 replacements, found ${replacementCount}`);
}
if (customerAccessReplacementCount !== 1) {
  throw new Error(`customer detail access guard: expected 1 replacement, found ${customerAccessReplacementCount}`);
}

fs.writeFileSync("/app/.customer-photo-resilience-v433-count", String(replacementCount));
fs.writeFileSync("/app/.customer-detail-not-found-v433-count", String(customerAccessReplacementCount));
console.log("Customer photo resilience v433 runtime patched");
