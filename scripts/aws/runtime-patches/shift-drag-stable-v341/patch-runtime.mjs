import fs from "node:fs";
import path from "node:path";

const staticDirectory = "/app/.next/static/chunks/app/admin/appointments";
const oldName = "page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-empty-cell-v338.js";
const newName = "page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.shift-stable-v341.js";
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
  "        function J(e) {",
  "        function K(e, t, n) {",
  `        function J(e) {
          var t;
          let n =
              arguments.length > 1 && void 0 !== arguments[1] && arguments[1],
            r = D.current;
          if (!r || r.pointerId !== e.pointerId) return;
          (window.removeEventListener("pointermove", r.globalMove, !0),
            window.removeEventListener("pointerup", r.globalUp, !0),
            window.removeEventListener("pointercancel", r.globalCancel, !0),
            window.removeEventListener("blur", r.globalBlur, !0),
            document.removeEventListener("selectstart", r.preventNative, !0),
            document.removeEventListener("dragstart", r.preventNative, !0),
            window.dispatchEvent(new CustomEvent("lien:shift-drag-end", { detail: { appointmentId: r.appointmentId, cancelled: n } })),
            (D.current = null));
          if (n) {
            ((null === (t = I.current) || void 0 === t ? void 0 : t.id) ===
              r.appointmentId && X(r.appointmentId, I.current),
              (I.current = null),
              r.moved && (_.current = Date.now()));
            return;
          }
          if (!r.moved) {
            I.current = null;
            return;
          }
          _.current = Date.now();
          let a = r.previewAppointment;
          a && (X(a.id, a), Y(a));
        }
`,
  "pointerup-only final commit",
);

replaceSection(
  "        function K(e, t, n) {",
  "        function ee(e, n, l) {",
  `        function K(e, t, n) {
          if (!(!j(t) || S.includes(t.id)) && 0 === e.button && !1 !== e.isPrimary) {
            if (D.current) {
              let t = D.current;
              J({ pointerId: t.pointerId }, !0);
            }
            let r = e.currentTarget,
              a = r.closest(".shift-lane[data-staff-name]"),
              i = null == a ? void 0 : a.getBoundingClientRect(),
              l = g(t.scheduledAt),
              o = i && i.width > 0 ? __businessOpen + (e.clientX - i.left) / O - l : 0,
              s = (e) => B(e),
              c = (e) => G(e),
              u = (e) => $(e),
              d = () => J({ pointerId: e.pointerId }, !0),
              p = (e) => e.preventDefault();
            ((I.current = { ...t }),
              (D.current = {
                appointmentId: t.id,
                pointerId: e.pointerId,
                pointerType: e.pointerType,
                mode: n,
                originClientX: e.clientX,
                originClientY: e.clientY,
                originStartMinutes: l,
                originDurationMinutes: t.durationMinutes,
                originStaffName: t.staffName,
                grabOffsetMinutes: o,
                lastClientX: e.clientX,
                lastClientY: e.clientY,
                previewAppointment: null,
                moved: !1,
                sourceElement: r,
                globalMove: s,
                globalUp: c,
                globalCancel: u,
                globalBlur: d,
                preventNative: p,
              }),
              window.addEventListener("pointermove", s, !0),
              window.addEventListener("pointerup", c, !0),
              window.addEventListener("pointercancel", u, !0),
              window.addEventListener("blur", d, !0),
              document.addEventListener("selectstart", p, !0),
              document.addEventListener("dragstart", p, !0));
          }
        }
`,
  "uncaptured global pointer start",
);

replaceSection(
  "        function ee(e, n, l) {",
  "        function et(e, n, l) {",
  `        function ee(e, n, l) {
          let r = Array.from(
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
            a = null == r ? void 0 : r.rect,
            i = a && a.width > 0
              ? __businessOpen + (e.clientX - a.left) / O - n.grabOffsetMinutes
              : n.originStartMinutes + (e.clientX - n.originClientX) / O,
            o = Math.round(i / 15) * 15,
            s = v(o, __businessOpen, __businessClose - l.durationMinutes),
            c = (null == r ? void 0 : r.element.dataset.staffName) || n.originStaffName,
            u = {
              ...l,
              scheduledAt: ""
                .concat(t, "T")
                .concat(String(Math.floor(s / 60)).padStart(2, "0"), ":")
                .concat(String(s % 60).padStart(2, "0"), ":00+09:00"),
              staffName: c,
            };
          return { appointment: u, staffName: c, startMinutes: s };
        }
`,
  "live lane geometry landing",
);

replaceSection(
  "        function B(e) {",
  "        function G(e) {",
  `        function B(e) {
          let n = D.current;
          if (!n || n.pointerId !== e.pointerId || !1 === e.isPrimary) return;
          let r = "function" == typeof e.getCoalescedEvents ? e.getCoalescedEvents() : null,
            a = r && r.length ? r[r.length - 1] : e;
          if (!n.moved && "touch" !== n.pointerType && (1 & a.buttons) == 0) return;
          let i = a.clientX - n.originClientX,
            o = a.clientY - n.originClientY;
          if ("touch" !== n.pointerType || n.moved) {
            if (!n.moved && Math.hypot(i, o) <= 5) return;
          } else {
            let e = Math.abs(i),
              t = Math.abs(o);
            if (t >= 6 && t > e) {
              J({ pointerId: n.pointerId }, !0);
              return;
            }
            if (e < 8 || e <= t) return;
          }
          (e.preventDefault(),
            (n.lastClientX = a.clientX),
            (n.lastClientY = a.clientY));
          let s = (function (e) {
              let t =
                arguments.length > 1 && void 0 !== arguments[1]
                  ? arguments[1]
                  : 15;
              return Math.round(e / t) * t;
            })(i / O, "resize" === n.mode ? 10 : 15),
            c = A.current.find((e) => e.id === n.appointmentId);
          if (!c) return;
          if (!n.moved) {
            n.moved = !0;
            window.dispatchEvent(
              new CustomEvent("lien:shift-drag-start", {
                detail: {
                  appointmentId: c.id,
                  mode: n.mode,
                  customerName: c.customerName || c.customerRealName || "予約",
                  staffName: c.staffName,
                  startMinutes: g(c.scheduledAt),
                  durationMinutes: c.durationMinutes,
                  clientX: a.clientX,
                  clientY: a.clientY,
                  sourceElement: n.sourceElement,
                },
              }),
            );
          }
          window.dispatchEvent(
            new CustomEvent("lien:shift-drag-pointer", {
              detail: {
                appointmentId: c.id,
                clientX: a.clientX,
                clientY: a.clientY,
              },
            }),
          );
          if ("resize" === n.mode) {
            let e = v(
              n.originDurationMinutes + s,
              10,
              __businessClose - n.originStartMinutes,
            );
            X(c.id, { durationMinutes: e });
            n.previewAppointment = { ...c, durationMinutes: e };
            return;
          }
          et(a, n, c);
        }
`,
  "single coalesced pointer movement",
);

replaceSection(
  "        function G(e) {",
  "        function $(e) {",
  `        function G(e) {
          let n = D.current;
          if (!n || n.pointerId !== e.pointerId || !1 === e.isPrimary || (void 0 !== e.button && 0 !== e.button)) return;
          if (n.moved && "move" === n.mode) {
            let t = A.current.find((e) => e.id === n.appointmentId),
              r = Number.isFinite(e.clientX) && Number.isFinite(e.clientY)
                ? e
                : { ...e, clientX: n.lastClientX, clientY: n.lastClientY };
            t && et(r, n, t);
          }
          J(e);
        }
`,
  "validated primary pointer release",
);

new Function(source);
fs.writeFileSync(newPath, source);

for (const referenceFile of referenceFiles) {
  const manifest = fs.readFileSync(referenceFile, "utf8");
  const matches = manifest.split(oldName).length - 1;
  if (matches < 1) throw new Error(`Missing old chunk reference in ${referenceFile}`);
  fs.writeFileSync(referenceFile, manifest.replaceAll(oldName, newName));
}

const commercialPath = "/app/commercial-admin-v101.js";
let commercial = fs.readFileSync(commercialPath, "utf8");
const oldSourceRule = ".ca-shift-drag-source{opacity:0!important;visibility:visible!important;pointer-events:auto!important;contain:layout style paint!important}";
const newSourceRule = ".ca-shift-drag-source{opacity:0!important;visibility:visible!important;pointer-events:none!important;contain:layout style paint!important}.lien-shift-drag-active .shift-lane button{pointer-events:none!important;user-select:none!important}";
if ((commercial.split(oldSourceRule).length - 1) !== 1) {
  throw new Error("Expected one source-card pointer rule");
}
commercial = commercial.replace(oldSourceRule, newSourceRule);
new Function(commercial);
fs.writeFileSync(commercialPath, commercial);
