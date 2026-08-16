const fs = require("node:fs");
const path = require("node:path");

const root = process.env.RUNTIME_ROOT || "/app";
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
const runtimeClient = fs.readFileSync(path.join(root, "commercial-admin-v101.js"), "utf8");
const serverLayout = fs.readFileSync(path.join(root, ".next/server/chunks/1425.js"), "utf8");
const clientLayout = fs.readFileSync(
  path.join(root, ".next/static/chunks/app/layout-sidebar-boundary-20260812-01.customertabs.sms-compliance-v1.admin-mobile-v38.staff-unified-v48.tenant-runtime-v153.js"),
  "utf8",
);
const serviceMarkPath = path.join(root, "public/brand/salon-customer-service-mark.svg");

const checks = {
  subtitleChangedEverywhere:
    server.includes("Salon customer servitomer service")
    && serverLayout.includes("Salon customer servitomer service")
    && clientLayout.includes("Salon customer servitomer service")
    && !server.includes("既存客を動かす美容室CRM")
    && !serverLayout.includes("既存客を動かす美容室CRM")
    && !clientLayout.includes("既存客を動かす美容室CRM"),
  fixedServiceMarkRenderedByServer:
    serverLayout.includes('backgroundImage: "url(/brand/salon-customer-service-mark.svg)"')
    && server.includes('src="/brand/salon-customer-service-mark.svg"'),
  fixedServiceMarkHydratesOnClient:
    clientLayout.includes('backgroundImage: "url(/brand/salon-customer-service-mark.svg)"'),
  duplicatePseudoChevronDisabled:
    runtimeClient.includes("body button.ca-sidebar-control::before")
    && runtimeClient.includes("content:none!important")
    && runtimeClient.includes("mask-image:none!important"),
  canonicalChevronPreserved:
    runtimeClient.includes("body button.ca-sidebar-control>svg.ca-sidebar-chevron")
    && runtimeClient.includes("body button.ca-sidebar-control>svg.ts-sidebar-chevron"),
  subtitleWrapsWithoutClipping:
    runtimeClient.includes("white-space:normal!important")
    && runtimeClient.includes("text-wrap:balance!important"),
  serviceMarkExists: fs.existsSync(serviceMarkPath) && fs.statSync(serviceMarkPath).size > 500,
};

for (const [name, ok] of Object.entries(checks)) {
  if (!ok) throw new Error(`admin service brand verification failed: ${name}`);
}

console.log(JSON.stringify({ ok: true, checks }));
