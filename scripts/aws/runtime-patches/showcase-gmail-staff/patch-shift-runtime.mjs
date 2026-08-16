import fs from "node:fs";
import path from "node:path";

const root = process.env.RUNTIME_ROOT || "/app";
const appointmentsPagePath = path.join(root, ".next/server/app/admin/appointments/page.js");

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: patch anchor was not found`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${label}: patch anchor is not unique`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

let source = fs.readFileSync(appointmentsPagePath, "utf8");

source = replaceOnce(
  source,
  `              : _.map((e) => ({
                  key: e.staffKey,
                  name: e.staffName,`,
  `              : [..._.map((e) => ({
                  key: e.staffKey,
                  name: e.staffName,`,
  "tenant staff array opening",
);

source = replaceOnce(
  source,
  `                  workEndMinutes: e.workEndMinutes,
                }));
          function J(e) {`,
  `                  workEndMinutes: e.workEndMinutes,
                })), {
                  key: w.jb.key,
                  name: w.jb.name,
                  role: w.jb.role,
                  maxConcurrentAppointments: 1,
                  workStartMinutes: 600,
                  workEndMinutes: 1140,
                }];
          function J(e) {`,
  "tenant free staff row",
);

source = replaceOnce(
  source,
  `r = t && (0, w.Cp)(t) ? t : w.jb.name;`,
  `r = t && G.some((entry) => entry.name === t) ? t : w.jb.name;`,
  "tenant staff appointment assignment",
);

fs.writeFileSync(appointmentsPagePath, source, "utf8");
console.log(JSON.stringify({ patchedShiftRuntime: true, appointmentsPagePath }));
