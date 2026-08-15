import { spawn } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(root, ".gmail-oauth-setup.out.log");
const errorPath = join(root, ".gmail-oauth-setup.err.log");
const output = openSync(outputPath, "w");
const error = openSync(errorPath, "w");

const child = spawn(process.execPath, ["scripts/setup-gmail-oauth.mjs"], {
  cwd: root,
  windowsHide: true,
  stdio: ["ignore", output, error]
});

child.unref();
closeSync(output);
closeSync(error);

console.log(`Gmail OAuth setup started (PID ${child.pid}).`);
console.log(`Authorization URL: ${outputPath}`);
console.log(`Errors: ${errorPath}`);
