import fs from "node:fs";

const routePath = "/app/.next/server/app/api/customer-auth/registration-link/request/route.js";
let route = fs.readFileSync(routePath, "utf8");
const before = 'r.searchParams.set("sent", "1");';
const after = 'r.searchParams.set("sent", "1"),r.searchParams.set("retryAfter","60");';
if (!route.includes(before)) throw new Error("successful registration redirect marker not found");
route = route.replace(before, after);
fs.writeFileSync(routePath, route);
