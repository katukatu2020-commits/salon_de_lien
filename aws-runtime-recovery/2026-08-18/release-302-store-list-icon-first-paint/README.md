# Release 302: active store-list icon first-paint stability

Release 301 fixed the customer header icon and a fallback store-list renderer.
The active `/u/stores` route is rendered by `customer-links-v293.js`, which
still emitted store icons without intrinsic dimensions. This fail-closed child
image patch gives that active renderer fixed 52 x 52 intrinsic and inline
dimensions, preventing the source image from filling the viewport before CSS
is available.

The parent must be the exact release 301 image. A source hash mismatch stops
the build before an image can be produced.
