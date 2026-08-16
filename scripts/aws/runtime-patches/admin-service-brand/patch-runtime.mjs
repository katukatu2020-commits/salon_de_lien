import fs from "node:fs";
import path from "node:path";

const root = process.env.RUNTIME_ROOT || "/app";
const serverPath = path.join(root, "server.js");
const runtimeClientPath = path.join(root, "commercial-admin-v101.js");
const serverLayoutPath = path.join(root, ".next/server/chunks/1425.js");
const clientLayoutPath = path.join(
  root,
  ".next/static/chunks/app/layout-sidebar-boundary-20260812-01.customertabs.sms-compliance-v1.admin-mobile-v38.staff-unified-v48.tenant-runtime-v153.js",
);

const previousSubtitle = "既存客を動かす美容室CRM";
const nextSubtitle = "Salon customer servitomer service";
const serviceMarkUrl = "/brand/salon-customer-service-mark.svg";

function replaceExpected(source, before, after, expectedCount, label) {
  const count = source.split(before).length - 1;
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} occurrence(s), found ${count}`);
  }
  return source.split(before).join(after);
}

let server = fs.readFileSync(serverPath, "utf8");
let runtimeClient = fs.readFileSync(runtimeClientPath, "utf8");
let serverLayout = fs.readFileSync(serverLayoutPath, "utf8");
let clientLayout = fs.readFileSync(clientLayoutPath, "utf8");

serverLayout = replaceExpected(serverLayout, previousSubtitle, nextSubtitle, 1, "server layout subtitle");
clientLayout = replaceExpected(clientLayout, previousSubtitle, nextSubtitle, 1, "client layout subtitle");
server = replaceExpected(server, previousSubtitle, nextSubtitle, 1, "commercial chat subtitle");

const serverMarkBefore = [
  "          style: e ? { backgroundImage: `url(${e})` } : void 0,",
  "          children: e",
  "            ? r.jsx(\"span\", { className: \"sr-only\", children: \"Salon de Lien\" })",
  "            : \"L\",",
].join("\n");
const serverMarkAfter = [
  `          style: { backgroundImage: \"url(${serviceMarkUrl})\" },`,
  `          children: r.jsx(\"span\", { className: \"sr-only\", children: \"${nextSubtitle}\" }),`,
].join("\n");
serverLayout = replaceExpected(serverLayout, serverMarkBefore, serverMarkAfter, 1, "server fixed service mark");

const clientMarkBefore = [
  '          style: t ? { backgroundImage: "url(".concat(t, ")") } : void 0,',
  "          children: t",
  '            ? (0, a.jsx)("span", {',
  '                className: "sr-only",',
  '                children: "Salon de Lien",',
  "              })",
  '            : "L",',
].join("\n");
const clientMarkAfter = [
  `          style: { backgroundImage: \"url(${serviceMarkUrl})\" },`,
  '          children: (0, a.jsx)("span", {',
  '            className: "sr-only",',
  `            children: \"${nextSubtitle}\",`,
  "          }),",
].join("\n");
clientLayout = replaceExpected(clientLayout, clientMarkBefore, clientMarkAfter, 1, "client fixed service mark");

server = replaceExpected(
  server,
  'src="/_next/image?url=%2Fbrand%2Fsalon-interior-illustrated.png&w=3840&q=75"',
  `src="${serviceMarkUrl}"`,
  1,
  "commercial chat service mark",
);

const styleAnchor = "      :root{--ca-ink:#2c211d;--ca-muted:#806f68;--ca-line:#ead8cf;--ca-paper:#fffdfb;--ca-soft:#fbf5f1;--ca-rose:#cf4f72;--ca-primary:#9d5546;--ca-success:#42765e}";
const sidebarStyles = `
      body .admin-desktop-sidebar span[role="img"][aria-label="店舗アイコン"],body .admin-mobile-sidebar span[role="img"][aria-label="店舗アイコン"]{border-radius:50%!important;background-color:#fffdf9!important;background-image:url("${serviceMarkUrl}")!important;background-position:center!important;background-size:cover!important}
      body .admin-desktop-sidebar a[href="/admin/customers"]>span.min-w-0>span:last-child,body .admin-mobile-sidebar a[href="/admin/customers"]>span.min-w-0>span:last-child{overflow:visible!important;font-size:9px!important;letter-spacing:0!important;line-height:1.15!important;white-space:normal!important;text-overflow:clip!important;text-wrap:balance!important}
      body .admin-brand .brand-logo{border-radius:50%!important;background:#fffdf9!important;object-fit:contain!important}
      @media(min-width:768px){body button.ca-sidebar-control,body button.ts-sidebar-toggle.ca-sidebar-control{display:grid!important;width:38px!important;height:38px!important;min-width:38px!important;min-height:38px!important;place-items:center!important;overflow:hidden!important;border:1px solid #dfcec6!important;border-radius:13px!important;background:linear-gradient(145deg,#fff,#fff8f5)!important;padding:0!important;color:#865044!important;font-size:0!important;line-height:0!important;box-shadow:0 8px 22px rgba(77,42,33,.13),inset 0 1px 0 #fff!important}body button.ca-sidebar-control::before,body button.ca-sidebar-control::after,body button.ts-sidebar-toggle::before,body button.ts-sidebar-toggle::after{display:none!important;width:0!important;height:0!important;content:none!important;mask-image:none!important}body button.ca-sidebar-control>svg.ca-sidebar-chevron,body button.ca-sidebar-control>svg.ts-sidebar-chevron{display:block!important;width:18px!important;height:18px!important;flex:0 0 18px!important;pointer-events:none!important}}
`;
runtimeClient = replaceExpected(
  runtimeClient,
  styleAnchor,
  `${styleAnchor}${sidebarStyles}`,
  1,
  "responsive sidebar styles",
);

const sidebarNormalizerAnchor = `  async function handleCatalogCreateSubmit(event) {`;
const serviceBrandNormalizer = `  function normalizeServiceBrand() {
    document.querySelectorAll('.admin-desktop-sidebar a[href="/admin/customers"],.admin-mobile-sidebar a[href="/admin/customers"]').forEach(link => {
      const mark = link.querySelector('span[role="img"]')
      if (mark && mark.style.backgroundImage !== 'url("${serviceMarkUrl}")') {
        mark.style.backgroundImage = 'url("${serviceMarkUrl}")'
      }
      const textGroup = link.querySelector(':scope > span.min-w-0')
      const subtitle = textGroup?.lastElementChild
      if (subtitle && subtitle.textContent !== '${nextSubtitle}') subtitle.textContent = '${nextSubtitle}'
    })
  }

`;
runtimeClient = replaceExpected(
  runtimeClient,
  sidebarNormalizerAnchor,
  `${serviceBrandNormalizer}${sidebarNormalizerAnchor}`,
  1,
  "service brand DOM normalizer",
);
runtimeClient = replaceExpected(
  runtimeClient,
  "    styles(); applyAdminTheme(savedAdminTheme()); normalizeSidebarControl(); removeCommandPalette();",
  "    styles(); applyAdminTheme(savedAdminTheme()); normalizeServiceBrand(); normalizeSidebarControl(); removeCommandPalette();",
  1,
  "service brand enhancement hook",
);

fs.writeFileSync(serverPath, server, "utf8");
fs.writeFileSync(runtimeClientPath, runtimeClient, "utf8");
fs.writeFileSync(serverLayoutPath, serverLayout, "utf8");
fs.writeFileSync(clientLayoutPath, clientLayout, "utf8");

console.log(JSON.stringify({
  patched: true,
  serverPath,
  runtimeClientPath,
  serverLayoutPath,
  clientLayoutPath,
  serviceMarkUrl,
}));
