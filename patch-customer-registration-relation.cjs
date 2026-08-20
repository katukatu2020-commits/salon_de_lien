const fs = require("node:fs");

const filePath = "/app/.next/server/chunks/2241.js";
const source = fs.readFileSync(filePath, "utf8");
const invalidFilter = "appUsers:{is:null}";
const occurrences = source.split(invalidFilter).length - 1;

if (occurrences !== 1) {
  throw new Error(`Expected one invalid customer relation filter, found ${occurrences}`);
}

const updated = source.replace(invalidFilter, "appUsers:{none:{}}");
if (updated.includes(invalidFilter) || !updated.includes("appUsers:{none:{}}")) {
  throw new Error("Customer registration relation filter was not corrected");
}

new Function(updated);
fs.writeFileSync(filePath, updated, "utf8");
console.log("Customer registration relation filter corrected.");
