# Three-app browser QA v680

Immutable child of the reviewed v679 production image:
`sha256:1570bd86d11dd433b513e779a6b638ce934eaf764768bd3e6a8ba58667e1f30b`.

## Changes

- Start DOM-enhancing legacy clients after the root React commit. Native pages announce readiness from the root shell effect; non-React pages still start immediately. No hydration errors are suppressed and no timeout pretends that hydration succeeded.
- Match the salon shell's first script element between SSR and the client render.
- Preserve the parent immutable assets and generate new asset URLs and references.
- Correct the registration login-ID pattern for HTML UnicodeSets (`v`) mode. Invalid or absent credentials redirect back to an inline validation message instead of throwing a server error.
- Rename the old registered-store link to the current salon-directory label.

## Verification

`verify-runtime.mjs` checks syntax, hydration gates, repeat events, static pages, SSR parity and registration validation. The protected deployment workflow also runs inherited billing, dealer ERP, team and affiliated-salon regressions and read-only production smoke checks.

Browser QA scripts are in `scripts/aws/qa/three-app-v680`. They are intentionally restricted to the isolated local clone. Never point lifecycle/setup scripts at production. The app is on an internal-only Docker network, with a loopback proxy on port 3188. Mail is captured locally and SMS uses the development console provider. The QA image is not the release image.

Screenshots, HTML, email payloads and temporary credentials remain in local `artifacts/` or QA containers, not in Git. See `QA_REPORT.md` for actual coverage and limitations.
