import fs from "node:fs";

const chunkDirectory = "/app/.next/server/chunks";
const expectedCount = Number(fs.readFileSync("/app/.customer-photo-resilience-v433-count", "utf8"));
const expectedCustomerAccessCount = Number(fs.readFileSync("/app/.customer-detail-not-found-v433-count", "utf8"));
let markerCount = 0;
let legacyResolverCount = 0;
let customerAccessMarkerCount = 0;
let legacyCustomerAccessCount = 0;

for (const entry of fs.readdirSync(chunkDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
  const source = fs.readFileSync(`${chunkDirectory}/${entry.name}`, "utf8");
  markerCount += source.split("[customer-photo] Failed to resolve a private photo reference").length - 1;
  legacyResolverCount += (source.match(/return e \? \(\(0, [a-z]\._f\)\(e\) \? new [a-z]\.S_\(\)\.getReadUrl\(e\) : e\) : null;/g) || []).length;
  customerAccessMarkerCount += source.split('"AuthorizationError" === t?.name && 404 === t?.status').length - 1;
  legacyCustomerAccessCount += (source.match(/let \{ session: [A-Za-z_$][\w$]* \} = await \(0, [A-Za-z_$][\w$]*\.zH\)\(e\.id\);/g) || []).length;
}

if (expectedCount !== 2 || markerCount !== expectedCount) {
  throw new Error(`customer photo fallback verification failed: expected=${expectedCount} markers=${markerCount}`);
}
if (legacyResolverCount !== 0) {
  throw new Error(`legacy private photo resolvers remain: ${legacyResolverCount}`);
}
if (expectedCustomerAccessCount !== 1 || customerAccessMarkerCount !== expectedCustomerAccessCount) {
  throw new Error(
    `customer detail not-found verification failed: expected=${expectedCustomerAccessCount} markers=${customerAccessMarkerCount}`
  );
}
if (legacyCustomerAccessCount !== 0) {
  throw new Error(`legacy customer detail access guard remains: ${legacyCustomerAccessCount}`);
}

console.log("Customer photo resilience v433 verification passed");
