import fs from "node:fs";
import path from "node:path";

const staticDirectory = "/app/.next/static/chunks/app/admin/appointments";
const oldName = "page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-drag-v334.js";
const newName = "page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-empty-cell-v338.js";
const oldPath = path.join(staticDirectory, oldName);
const newPath = path.join(staticDirectory, newName);
const referenceFiles = [
  "/app/.next/app-build-manifest.json",
  "/app/.next/server/app/admin/appointments/page_client-reference-manifest.js",
];

let source = fs.readFileSync(oldPath, "utf8");

function replaceSection(start, end, replacement, label) {
  const startIndex = source.indexOf(start);
  if (startIndex < 0 || source.indexOf(start, startIndex + start.length) >= 0) {
    throw new Error(`Section start is not unique: ${label}`);
  }
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(`Section end is missing: ${label}`);
  source = source.slice(0, startIndex) + replacement + source.slice(endIndex);
}

replaceSection(
  "        function B(e) {",
  "        function G(e) {",
  `        function ee(e, n, l) {
          let r = (function (e) {
              let t =
                arguments.length > 1 && void 0 !== arguments[1]
                  ? arguments[1]
                  : 15;
              return Math.round(e / t) * t;
            })((e.clientX - n.originClientX) / O, 15),
            a = v(
              n.originStartMinutes + r,
              __businessOpen,
              __businessClose - l.durationMinutes,
            ),
            i = Array.from(
              document.querySelectorAll(".shift-lane[data-staff-name]"),
            )
              .map((t) => {
                let n = t.getBoundingClientRect(),
                  r =
                    e.clientY < n.top
                      ? n.top - e.clientY
                      : e.clientY > n.bottom
                        ? e.clientY - n.bottom
                        : 0;
                return { element: t, rect: n, distance: r };
              })
              .filter((e) => e.rect.width > 0 && e.rect.height > 0)
              .sort((e, t) => e.distance - t.distance)[0],
            o = (null == i ? void 0 : i.element.dataset.staffName) || n.originStaffName,
            s = {
              ...l,
              scheduledAt: ""
                .concat(t, "T")
                .concat(String(Math.floor(a / 60)).padStart(2, "0"), ":")
                .concat(String(a % 60).padStart(2, "0"), ":00+09:00"),
              staffName: o,
            };
          return { appointment: s, staffName: o, startMinutes: a };
        }
        function et(e, n, l) {
          let r = ee(e, n, l);
          ((n.previewAppointment = r.appointment),
            window.dispatchEvent(
              new CustomEvent("lien:shift-drag-move", {
                detail: {
                  appointmentId: l.id,
                  customerName:
                    l.customerName || l.customerRealName || "お客様",
                  staffName: r.staffName,
                  startMinutes: r.startMinutes,
                  durationMinutes: l.durationMinutes,
                  clientX: e.clientX,
                  clientY: e.clientY,
                },
              }),
            ));
          return r;
        }
        function B(e) {
          let n = D.current;
          if (!n || n.pointerId !== e.pointerId) return;
          if (!n.moved && "touch" !== n.pointerType && (1 & e.buttons) == 0)
            return;
          let r = e.clientX - n.originClientX,
            a = e.clientY - n.originClientY;
          if ("touch" !== n.pointerType || n.moved) {
            if (!n.moved && Math.hypot(r, a) <= 5) return;
          } else {
            let t = Math.abs(r),
              n = Math.abs(a);
            if (n >= 6 && n > t) {
              ((D.current = null), (I.current = null));
              return;
            }
            if (t < 8 || t <= n) return;
            n.sourceElement.setPointerCapture(e.pointerId);
          }
          e.preventDefault();
          let i = (function (e) {
              let t =
                arguments.length > 1 && void 0 !== arguments[1]
                  ? arguments[1]
                  : 15;
              return Math.round(e / t) * t;
            })(r / O, "resize" === n.mode ? 10 : 15),
            l = A.current.find((e) => e.id === n.appointmentId);
          if (!l) return;
          if (!n.moved) {
            n.moved = !0;
            window.dispatchEvent(
              new CustomEvent("lien:shift-drag-start", {
                detail: {
                  appointmentId: l.id,
                  mode: n.mode,
                  customerName:
                    l.customerName || l.customerRealName || "お客様",
                  staffName: l.staffName,
                  startMinutes: g(l.scheduledAt),
                  durationMinutes: l.durationMinutes,
                  clientX: e.clientX,
                  clientY: e.clientY,
                  sourceElement: n.sourceElement,
                },
              }),
            );
          }
          window.dispatchEvent(
            new CustomEvent("lien:shift-drag-pointer", {
              detail: {
                appointmentId: l.id,
                clientX: e.clientX,
                clientY: e.clientY,
              },
            }),
          );
          if ("resize" === n.mode) {
            let e = v(
              n.originDurationMinutes + i,
              10,
              __businessClose - n.originStartMinutes,
            );
            X(l.id, { durationMinutes: e });
            return;
          }
          et(e, n, l);
        }
`,
  "coordinate-based empty-cell drag preview",
);

replaceSection(
  "        function G(e) {",
  "        function $(e) {",
  `        function G(e) {
          let n = D.current;
          if (
            n &&
            n.pointerId === e.pointerId &&
            n.moved &&
            "move" === n.mode
          ) {
            let t = A.current.find((e) => e.id === n.appointmentId);
            t && et(e, n, t);
          }
          J(e);
        }
`,
  "pointer-up landing recalculation",
);

fs.writeFileSync(newPath, source);

for (const referenceFile of referenceFiles) {
  const manifest = fs.readFileSync(referenceFile, "utf8");
  const matches = manifest.split(oldName).length - 1;
  if (matches < 1) throw new Error(`Missing old chunk reference in ${referenceFile}`);
  fs.writeFileSync(referenceFile, manifest.replaceAll(oldName, newName));
}
