import fs from "node:fs";

const route = fs.readFileSync("/app/.next/server/app/api/customer-auth/registration-link/request/route.js", "utf8");
const client = fs.readFileSync("/app/customer-registration-resend-v345.js", "utf8");
if (!route.includes('r.searchParams.set("retryAfter","60")')) throw new Error("server retryAfter marker missing");
if (!client.includes("serverRetryAfter")) throw new Error("client serverRetryAfter marker missing");
console.log("Customer registration resend v346 verification passed");
