import fs from "node:fs";

const page = fs.readFileSync("/app/.next/server/app/u/register/page.js", "utf8");
const server = fs.readFileSync("/app/server.js", "utf8");
const client = fs.readFileSync("/app/customer-registration-resend-v347.js", "utf8");
if (!page.includes("/customer-registration-resend-v347.js")) throw new Error("cache-busted page asset missing");
if (!server.includes("customer-registration-resend-v347")) throw new Error("cache-busted server asset route missing");
if (!client.includes("serverRetryAfter")) throw new Error("server retry countdown support missing");
console.log("Customer registration resend v347 verification passed");
