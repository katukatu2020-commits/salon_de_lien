import fs from "node:fs";
import path from "node:path";

const root = process.env.RUNTIME_ROOT || "/app";
const commercialAdmin = fs.readFileSync(path.join(root, "commercial-admin-v101.js"), "utf8");
const customerLink = fs.readFileSync(path.join(root, "customer-link-ui-v293.js"), "utf8");

const checks = [
  [commercialAdmin.includes("const cropperManaged ="), "cropper-managed inputs bypass the legacy square guard"],
  [commercialAdmin.includes("input.dataset.lienCropped === '1'"), "cropped redispatch bypasses the legacy guard"],
  [commercialAdmin.includes("location.pathname.includes('staffManagement')"), "staff profile uploads use the cropper"],
  [commercialAdmin.includes("input.closest('.ca-store-icon-card')"), "store icon uploads use the cropper"],
  [!commercialAdmin.includes("みんなのスタイル投稿だけは縦横比を維持できます"), "obsolete upload note removed"],
  [customerLink.includes("modal('画像を正方形に調整'"), "square crop dialog remains available"],
  [customerLink.includes("finish(new File([blob]"), "cropped file is passed to the existing upload flow"],
];

for (const [ok, label] of checks) {
  if (!ok) throw new Error(`runtime verification failed: ${label}`);
}

console.log(JSON.stringify({ verified: true, checks: checks.map(([, label]) => label) }));
