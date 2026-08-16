const fs = require("node:fs");
const path = require("node:path");

const root = process.env.RUNTIME_ROOT || "/app";
const reportChunk = fs.readFileSync(path.join(root, ".next/server/chunks/6006.js"), "utf8");
const tenantClient = fs.readFileSync(path.join(root, "tenant-setup-client.js"), "utf8");

const assertions = [
  [reportChunk.includes(': e?.manufacturer ?? "",'), "all-manufacturer default is installed"],
  [!reportChunk.includes(': e?.manufacturer || "ミルボン",'), "Milbon default was removed"],
  [
    reportChunk.split("...(e ? { manufacturerName: e } : {}),").length - 1 >= 3
      && !reportChunk.includes("manufacturerName: e,\n              ...(t ? { organizationId: t } : {}),"),
    "all three report queries accept an empty manufacturer",
  ],
  [tenantClient.includes("allOption.textContent = 'すべてのメーカー'"), "all-manufacturer label is installed"],
  [tenantClient.includes("if (complete) { document.querySelectorAll('.ts-launcher')"), "completed setup launcher is hidden"],
  [tenantClient.includes("document.querySelectorAll('[data-ts-add-staff], .ts-shift-action')"), "staff button cleanup is installed"],
  [tenantClient.includes(".ts-community-detail{max-width:1180px!important}"), "desktop community layout is installed"],
  [tenantClient.includes("polishDemoExperience()\n    polishSidebarControl()"), "route polish hook is active"],
];

for (const [passed, message] of assertions) {
  if (!passed) throw new Error(`Runtime verification failed: ${message}`);
}

console.log(JSON.stringify({ verified: true, assertions: assertions.length }));
