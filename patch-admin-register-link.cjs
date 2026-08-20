const fs = require("node:fs");

const pagePath = "/app/.next/server/app/admin/login/page.js";
const source = fs.readFileSync(pagePath, "utf8");

if (source.includes('href:"/admin/register"')) {
  console.log("Admin registration link is already present.");
  process.exit(0);
}

const passwordResetLink =
  's.jsx(n.default,{href:"/admin/password-reset",className:"mt-3 inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold text-[#8f4f42] hover:text-[#5b332c]",children:"ID・パスワードを忘れた方"})';

const registrationLink =
  's.jsx(n.default,{href:"/admin/register",className:"mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#d8b3aa] bg-[#fff8f5] px-5 text-sm font-semibold text-[#8f4f42] transition hover:border-[#8f4f42] hover:bg-[#f8e7e1] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]",children:"新規店舗登録はこちら"})';

const occurrences = source.split(passwordResetLink).length - 1;
if (occurrences !== 1) {
  throw new Error(`Expected one admin password-reset link, found ${occurrences}.`);
}

fs.writeFileSync(
  pagePath,
  source.replace(passwordResetLink, `${registrationLink},${passwordResetLink}`),
  "utf8"
);

console.log("Added the admin registration link to the login page.");

if (process.env.PATCH_LOCAL_BILLING_URL === "true") {
  const billingPath = "/app/billing.js";
  const billingSource = fs.readFileSync(billingPath, "utf8");
  const productionHttpsGuard =
    "if (!/^https:\\/\\//i.test(appUrl) && env.NODE_ENV === 'production') errors.push('APP_URL must use HTTPS')";
  const localAwareHttpsGuard =
    "if (!/^https:\\/\\//i.test(appUrl) && env.NODE_ENV === 'production' && !/^http:\\/\\/(localhost|127\\.0\\.0\\.1)(:\\d+)?$/i.test(appUrl)) errors.push('APP_URL must use HTTPS')";

  if (billingSource.includes(localAwareHttpsGuard)) {
    console.log("Local loopback billing URL support is already present.");
  } else {
    const guardOccurrences = billingSource.split(productionHttpsGuard).length - 1;
    if (guardOccurrences !== 1) {
      throw new Error(`Expected one production HTTPS guard, found ${guardOccurrences}.`);
    }
    fs.writeFileSync(
      billingPath,
      billingSource.replace(productionHttpsGuard, localAwareHttpsGuard),
      "utf8"
    );
    console.log("Allowed the local loopback URL for Stripe Test Mode onboarding.");
  }
}
