import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDirectory, "..");
const standaloneRoot = join(appRoot, ".next", "standalone");
const serverPath = join(standaloneRoot, "server.js");

if (!existsSync(serverPath)) {
  throw new Error("Production build not found. Run npm.cmd run build first.");
}

process.env.NODE_ENV = "production";
loadEnvConfig(appRoot, false);
process.env.HOSTNAME ||= "0.0.0.0";
process.env.PORT ||= "3000";

function copyDirectoryContents(source, destination) {
  if (!existsSync(source)) return;
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    cpSync(join(source, entry.name), join(destination, entry.name), {
      recursive: entry.isDirectory(),
      force: true
    });
  }
}

copyDirectoryContents(join(appRoot, ".next", "static"), join(standaloneRoot, ".next", "static"));
copyDirectoryContents(join(appRoot, "public"), join(standaloneRoot, "public"));

process.chdir(standaloneRoot);
require(serverPath);
