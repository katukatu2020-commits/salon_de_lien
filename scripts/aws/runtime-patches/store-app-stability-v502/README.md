# Store app cache activation v502

This protected child patch cache-busts the shared Next.js layout runtime used to start the v501 store workflow fixes.

The v501 browser runtime was present in production, but an installed PWA or a browser with the previous `layout-runtime-v450.js` cached could continue using that older file. Those clients never loaded the new runtime until their cache expired.

v502:

- publishes the reviewed layout runtime as `layout-runtime-v502.js`;
- updates the app build and client reference manifests to use the new URL;
- embeds the delayed v501 client logic directly in that guaranteed Next.js chunk;
- keeps all v501 workflow logic unchanged;
- exposes a separate readiness marker for production verification.
