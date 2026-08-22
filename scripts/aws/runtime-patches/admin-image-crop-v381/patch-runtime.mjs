import fs from "node:fs";
import path from "node:path";

const root = process.env.RUNTIME_ROOT || "/app";
const commercialAdminPath = path.join(root, "commercial-admin-v101.js");

function replaceExpected(source, before, after, expectedCount, label) {
  const count = source.split(before).length - 1;
  if (count !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} occurrence(s), found ${count}`);
  }
  return source.split(before).join(after);
}

let commercialAdmin = fs.readFileSync(commercialAdminPath, "utf8");

commercialAdmin = replaceExpected(
  commercialAdmin,
  `      if (location.pathname.includes('/community')) return
      const file = input.files[0]`,
  `      if (location.pathname.includes('/community')) return
      // Profile and store-brand inputs are handled by the square cropper. Do not
      // reject the original non-square file before that cropper can open.
      const cropperManaged =
        input.dataset.lienCropped === '1' ||
        location.pathname === '/u/profile' ||
        location.pathname === '/admin/settings' ||
        location.pathname === '/admin/account' ||
        location.pathname.includes('staffManagement') ||
        input.closest('.ca-store-icon-card') ||
        /icon|avatar|profile/i.test(\`${'${input.name} ${input.id} ${input.getAttribute(\'aria-label\') || \'\'}'}\`)
      if (cropperManaged) return
      const file = input.files[0]`,
  1,
  "let cropper-managed uploads accept non-square source images",
);

commercialAdmin = replaceExpected(
  commercialAdmin,
  "正方形の画像を選択してください。みんなのスタイル投稿だけは縦横比を維持できます。",
  "正方形の画像を選択してください。",
  1,
  "remove obsolete community-only upload note",
);

fs.writeFileSync(commercialAdminPath, commercialAdmin);
console.log("admin image crop v381 runtime patch applied");
