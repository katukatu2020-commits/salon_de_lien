import fs from "node:fs";
import path from "node:path";

const appRoot = "/app";
const clientLayout = path.join(
  appRoot,
  ".next/static/chunks/app/u/(account)/layout-customer-mobile-nav-v425.js"
);
const serverChunks = path.join(appRoot, ".next/server/chunks");
const oldClass = "sticky top-0 z-40 border-b border-[#eadfd4] bg-[#fffdf9]/95 backdrop-blur md:hidden";
const newClass = "customer-account-mobile-header-removed hidden";
const bottomNavMarker = "customer-mobile-nav-v425 customer-mobile-nav-next";

function replaceHeader(filePath, label) {
  const source = fs.readFileSync(filePath, "utf8");
  const matches = source.split(oldClass).length - 1;
  if (matches !== 1) {
    throw new Error(`${label}: expected one customer account mobile header, found ${matches}`);
  }
  if (!source.includes(bottomNavMarker)) {
    throw new Error(`${label}: canonical customer bottom navigation marker is missing`);
  }
  fs.writeFileSync(filePath, source.replace(oldClass, newClass));
}

replaceHeader(clientLayout, "client layout");

const serverMatches = fs.readdirSync(serverChunks)
  .filter((name) => name.endsWith(".js"))
  .map((name) => path.join(serverChunks, name))
  .filter((filePath) => fs.readFileSync(filePath, "utf8").includes(oldClass));

if (serverMatches.length !== 1) {
  throw new Error(`server layout: expected one matching chunk, found ${serverMatches.length}`);
}
replaceHeader(serverMatches[0], "server layout");

console.log(`Removed only the duplicate customer mobile header from ${path.basename(serverMatches[0])}.`);
