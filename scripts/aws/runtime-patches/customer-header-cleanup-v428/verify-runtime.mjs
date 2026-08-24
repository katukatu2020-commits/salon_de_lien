import fs from "node:fs";
import path from "node:path";

const appRoot = "/app";
const clientLayout = path.join(
  appRoot,
  ".next/static/chunks/app/u/(account)/layout-customer-mobile-nav-v425.js"
);
const serverChunks = path.join(appRoot, ".next/server/chunks");
const oldClass = "sticky top-0 z-40 border-b border-[#eadfd4] bg-[#fffdf9]/95 backdrop-blur md:hidden";
const removedMarker = "customer-account-mobile-header-removed hidden";
const bottomNavMarkers = [
  "customer-mobile-nav-v425 customer-mobile-nav-next",
  'id:"customer-mobile-bottom-nav"',
  "customer-mobile-nav-v425-link",
  "customer-mobile-nav-v425-icon"
];

function verify(filePath, label) {
  const source = fs.readFileSync(filePath, "utf8");
  if (source.includes(oldClass)) throw new Error(`${label}: duplicate mobile header is still active`);
  if (!source.includes(removedMarker)) throw new Error(`${label}: removed header marker is missing`);
  for (const marker of bottomNavMarkers) {
    if (!source.includes(marker)) throw new Error(`${label}: bottom navigation changed (${marker})`);
  }
}

verify(clientLayout, "client layout");

const serverMatches = fs.readdirSync(serverChunks)
  .filter((name) => name.endsWith(".js"))
  .map((name) => path.join(serverChunks, name))
  .filter((filePath) => fs.readFileSync(filePath, "utf8").includes(removedMarker));

if (serverMatches.length !== 1) {
  throw new Error(`server layout: expected one patched chunk, found ${serverMatches.length}`);
}
verify(serverMatches[0], "server layout");

console.log("Customer header cleanup v428 verified; canonical bottom navigation is unchanged.");
