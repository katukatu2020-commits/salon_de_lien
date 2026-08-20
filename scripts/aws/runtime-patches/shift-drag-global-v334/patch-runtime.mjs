import fs from "node:fs";

const shiftPath = "/app/.next/static/chunks/app/admin/appointments/page-shift-layout-20260812-02.capacity-persist-v44.business-schedule-v294.js";
let source = fs.readFileSync(shiftPath, "utf8");

function replaceOnce(before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing patch target: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Patch target is not unique: ${label}`);
  }
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

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
            window.dispatchEvent(new CustomEvent("lien:shift-drag-end", { detail: { appointmentId: r.appointmentId, cancelled: n } })),
            (D.current = null));
          let a = r.sourceElement;
          if (a && a.hasPointerCapture(e.pointerId))
            try { a.releasePointerCapture(e.pointerId); } catch (e) {}
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
          let s = A.current.find((e) => e.id === r.appointmentId);
          if (s) {
            let a = r.previewAppointment || s;
            X(a.id, a);
            Y(a);
          }
        }
`,
  "global drag cleanup and commit",
);

replaceSection(
  "        function K(e, t, n) {",
  "        function B(e) {",
  `        function K(e, t, n) {
          if (!(!j(t) || S.includes(t.id)) && 0 === e.button) {
            if (D.current) {
              var r;
              let e = D.current;
              (window.removeEventListener("pointermove", e.globalMove, !0),
                window.removeEventListener("pointerup", e.globalUp, !0),
                window.removeEventListener("pointercancel", e.globalCancel, !0),
                window.removeEventListener("blur", e.globalBlur, !0),
                (null === (r = I.current) || void 0 === r ? void 0 : r.id) ===
                  e.appointmentId && X(e.appointmentId, I.current),
                (D.current = null),
                (I.current = null));
            }
            let a = e.currentTarget,
              i = (e) => B(e),
              l = (e) => G(e),
              o = (e) => $(e),
              s = () => J({ pointerId: e.pointerId }, !0);
            ("touch" !== e.pointerType && a.setPointerCapture(e.pointerId),
              (I.current = { ...t }),
              (D.current = {
                appointmentId: t.id,
                pointerId: e.pointerId,
                pointerType: e.pointerType,
                mode: n,
                originClientX: e.clientX,
                originClientY: e.clientY,
                originStartMinutes: g(t.scheduledAt),
                originDurationMinutes: t.durationMinutes,
                originStaffName: t.staffName,
                previewAppointment: null,
                moved: !1,
                sourceElement: a,
                globalMove: i,
                globalUp: l,
                globalCancel: o,
                globalBlur: s,
              }),
              window.addEventListener("pointermove", i, !0),
              window.addEventListener("pointerup", l, !0),
              window.addEventListener("pointercancel", o, !0),
              window.addEventListener("blur", s, !0));
          }
        }
`,
  "window-level pointer tracking",
);

replaceOnce(
  `          if ("touch" !== n.pointerType && (1 & e.buttons) == 0) {
            J(e, !0);
            return;
          }`,
  `          if ("touch" !== n.pointerType && (1 & e.buttons) == 0) return;`,
  "ignore transient buttonless pointermove",
);

replaceOnce(
  `            e.currentTarget.setPointerCapture(e.pointerId);`,
  `            n.sourceElement.setPointerCapture(e.pointerId);`,
  "touch capture source",
);

replaceOnce(
  `sourceElement: e.currentTarget } }));`,
  `sourceElement: n.sourceElement } }));`,
  "stable drag source element",
);

replaceOnce(
  `                                    onPointerMove: B,
                                    onPointerUp: G,
                                    onPointerCancel: $,
                                    onLostPointerCapture: (e) => J(e, !0),`,
  `                                    onPointerMove: () => {},
                                    onPointerUp: () => {},
                                    onPointerCancel: () => {},
                                    onLostPointerCapture: () => {},`,
  "single global pointer event stream",
);

replaceOnce(
  `                                            onPointerMove: B,
                                            onPointerUp: G,
                                            onPointerCancel: $,
                                            onLostPointerCapture: (e) => J(e, !0),`,
  `                                            onPointerMove: () => {},
                                            onPointerUp: () => {},
                                            onPointerCancel: () => {},
                                            onLostPointerCapture: () => {},`,
  "single global resize pointer event stream",
);

fs.writeFileSync(shiftPath, source);
