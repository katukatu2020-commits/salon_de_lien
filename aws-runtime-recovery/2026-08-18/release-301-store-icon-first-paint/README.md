# Release 301: store icon first-paint stability

This fail-closed child-image patch fixes oversized store icons during a
customer store switch.

The current AWS runtime relied only on CSS to size `/api/lien-store-icon`
images. Before the stylesheet was applied, the browser could paint the source
image at its intrinsic 512 x 512 size. The header icon now has intrinsic and
inline 34 x 34 dimensions, and registered-store icons have intrinsic and
inline 52 x 52 dimensions.

The parent must be the exact release 300 image. A source hash mismatch stops
the build before an image can be produced.
