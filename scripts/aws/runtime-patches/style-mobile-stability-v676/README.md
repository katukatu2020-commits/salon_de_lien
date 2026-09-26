# Style mobile stability v676

Parent: protected v675, digest `sha256:1c503e2f14a080a02e094a365b81347e40d02603824e957d2174782a1bc2ec3f`.

The v615 legacy list repair selects the new v618 result section by its summary
text and replaces its children. The v618 observer restores the paginated list,
which triggers v615 again. The full application reproduced 32 complete list
rebuilds in roughly three seconds. The old focus-restoration patch masked the
lost input, but did not stop the alternating renderers or image flicker.

The legacy renderer now yields to the modern client/shell before fetching and
again after awaiting its response. Detail/comment/chat functions are unchanged.
No additional observer, repaint timer or forced scroll is introduced.

The No. compound field retains one accessible focus indicator on its label.
The native input no longer inherits the separate global border/outline; mobile
padding and number spinners no longer obscure multi-digit values. Desktop layout
is otherwise unchanged. Server-rendered asset URLs are refreshed.

Verification:
- Actual v675 application fails the new browser regression with a replaced input.
- Actual patched application and the packaged multi-script fixture pass at
  360px, 390px and 1440px: no idle list DOM writes, stable draft/focus, one focus
  treatment, reorder, visibility, delete confirmation and page-2 scroll.
- A delayed legacy response cannot overwrite a newly mounted modern list.
- Browser actions use intercepted fixture data, never production writes.
- Protected deployment verifies the parent digest and supports rollback.

Tests use Chromium mobile emulation, not a physical iPhone/Safari device.
