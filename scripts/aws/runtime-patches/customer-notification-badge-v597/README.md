# Customer notification badge v597

## Cause

The native customer layout renders the correct unread count, but uses arbitrary
Tailwind classes absent from its deployed CSS: `bg-[#c54843]`, `h-[18px]`,
`min-w-[18px]` and `ring-[#fffdf9]`. The resulting badge has white text on a
transparent background, a 10px height, and Tailwind's fallback blue ring.
Legacy customer pages use separate, working styles, so the failure appears
intermittent when moving between routes.

Both copies of the desktop shell also looked only for the legacy badge, not the
native layout's count span. Their existing synchronization now accepts both
markup variants, regardless of script load order.

## Scope

- Add narrowly scoped badge rules to the existing render-blocking shared shell
  CSS, rather than wait for the post-load customer enhancement script.
- Stable 20px height, content-sized width, opaque rose background, white digits,
  white border, and no inherited ring. Empty/hidden badges stay hidden.
- Preserve the native `0 => no badge`, `100+ => 99+` count logic and aria labels.
- Cache-bust the stylesheet and desktop script; no notification APIs, read state,
  authentication, booking, receipt printing, or report printing are changed.
- Reverse-patch hashes verify all 850 parent runtime/public/Next files. Only
  `server.js`, `public/shell-consistency-v518.css`, and
  `customer-experience-v508.js`, and `customer-experience-v503.js` have approved
  changes. The immutable native layout gets a new chunk filename, differing only
  in the external customer script cache key; the original chunk stays intact.

## Verification

`browser-regression.mjs` uses the demo customer and intercepts only browser-side
HTML/RSC responses to set count fixtures. It does not create notifications, mark
them read, switch stores, or submit forms other than demo login.

Test counts: 0, 1, 9, 10, 99, 100, 1000, back to 0. Viewports: 320, 390, 768,
1440px. Assert color, height, text containment, position, native/desktop count
synchronization, history/back navigation, and critical CSS without JavaScript.
Native history navigation at tablet width uses a direct page visit when the
existing bottom navigation is not visible. Unrelated badges must be unaffected.

Set `SMOKE_BASE_URL`, `SMOKE_DEPENDENCIES_PACKAGE`, `CHROME_PATH`, and
`SCREENSHOT_DIR` as needed. `SMOKE_BROWSER=webkit` runs the same checks with
Playwright WebKit and mobile touch/device-scale settings.

Known parent hydration errors (React 418/423) are recorded in test results.
They predate this CSS-only rendering fix; this release does not claim to resolve
the application's unrelated hydration issues.
