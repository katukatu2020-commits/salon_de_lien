import fs from "node:fs";
import path from "node:path";

const root = process.env.RUNTIME_ROOT || "/app";
const reportChunkPath = path.join(root, ".next/server/chunks/6006.js");
const tenantClientPath = path.join(root, "tenant-setup-client.js");

function replaceExpected(source, before, after, expectedCount, label) {
  const count = source.split(before).length - 1;
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} occurrence(s), found ${count}`);
  }
  return source.split(before).join(after);
}

let reportChunk = fs.readFileSync(reportChunkPath, "utf8");
let tenantClient = fs.readFileSync(tenantClientPath, "utf8");

reportChunk = replaceExpected(
  reportChunk,
  ': e?.manufacturer || "ミルボン",',
  ': e?.manufacturer ?? "",',
  1,
  "manufacturer default",
);

reportChunk = replaceExpected(
  reportChunk,
  [
    "              manufacturerName: e,",
    "              ...(t ? { organizationId: t } : {}),",
  ].join("\n"),
  [
    "              ...(e ? { manufacturerName: e } : {}),",
    "              ...(t ? { organizationId: t } : {}),",
  ].join("\n"),
  3,
  "optional manufacturer filters",
);

tenantClient = replaceExpected(
  tenantClient,
  [
    "  function addLauncher(status) {",
    "    if (status.role !== 'ADMIN' || document.querySelector('.ts-launcher')) return",
    "    const complete = status.staffCount > 0 && status.menuCount > 0 && Boolean(status.inbound?.address)",
  ].join("\n"),
  [
    "  function addLauncher(status) {",
    "    const complete = status.staffCount > 0 && status.menuCount > 0 && Boolean(status.inbound?.address)",
    "    if (complete) { document.querySelectorAll('.ts-launcher').forEach(node => node.remove()); return }",
    "    if (status.role !== 'ADMIN' || document.querySelector('.ts-launcher')) return",
  ].join("\n"),
  1,
  "completed setup launcher",
);

tenantClient = replaceExpected(
  tenantClient,
  "  function addShiftStaffButton() {\n    if (!isShiftRoute()) return",
  [
    "  function addShiftStaffButton() {",
    "    document.querySelectorAll('[data-ts-add-staff], .ts-shift-action').forEach(node => node.remove())",
    "    return",
    "    if (!isShiftRoute()) return",
  ].join("\n"),
  1,
  "shift staff button removal",
);

const experiencePolish = `  function polishDemoExperience() {
    document.querySelectorAll('[data-ts-add-staff], .ts-shift-action').forEach(node => node.remove())

    if (/^\\/admin\\/(?:reports\\/manufacturer-products|products)(?:\\/|$)/.test(location.pathname)) {
      const manufacturer = document.querySelector('select[name="manufacturer"]')
      const allOption = manufacturer?.querySelector('option[value=""]')
      if (allOption && allOption.textContent !== 'すべてのメーカー') allOption.textContent = 'すべてのメーカー'
    }

    if (/^\\/admin\\/community\\/[^/]+\\/?$/.test(location.pathname)) {
      const root = document.querySelector('main .mx-auto.grid.w-full.max-w-3xl')
      if (root) root.classList.add('ts-community-detail')
      if (!document.getElementById('lien-community-detail-polish')) {
        const style = document.createElement('style')
        style.id = 'lien-community-detail-polish'
        style.textContent = \`
          .ts-community-detail{max-width:1180px!important}
          .ts-community-detail>div.grid.gap-5{grid-template-columns:minmax(0,1fr)!important}
          @media(min-width:1440px){
            .ts-community-detail article{display:grid!important;grid-template-columns:minmax(0,1.16fr) minmax(360px,.84fr)!important;align-items:stretch!important;overflow:hidden!important}
            .ts-community-detail article>header{grid-column:1/-1!important}
            .ts-community-detail article>header+div{grid-column:1!important;grid-row:2!important;min-height:560px!important}
            .ts-community-detail article>header+div>a{display:block!important;height:100%!important;min-height:560px!important;aspect-ratio:auto!important}
            .ts-community-detail article>header+div>a img{height:100%!important;min-height:560px!important;object-fit:cover!important}
            .ts-community-detail article>header+div+div{grid-column:2!important;grid-row:2!important;align-self:stretch!important;border-left:1px solid var(--lien-border,#eaded7)!important}
          }
        \`
        document.head.appendChild(style)
      }
    }
  }

`;

tenantClient = replaceExpected(
  tenantClient,
  "  function enhanceCurrentRoute() {",
  `${experiencePolish}  function enhanceCurrentRoute() {`,
  1,
  "demo experience polish function",
);

tenantClient = replaceExpected(
  tenantClient,
  "    addStyles()\n    polishSidebarControl()",
  "    addStyles()\n    polishDemoExperience()\n    polishSidebarControl()",
  1,
  "demo experience polish hook",
);

fs.writeFileSync(reportChunkPath, reportChunk, "utf8");
fs.writeFileSync(tenantClientPath, tenantClient, "utf8");

console.log(JSON.stringify({
  patched: true,
  reportChunkPath,
  tenantClientPath,
}));
