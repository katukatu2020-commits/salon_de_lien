# Store app stability v501

This protected runtime patch fixes six store-side workflows without replacing the production database or persistent assets:

- preserves React hydration before applying ORIMIA DOM branding;
- restores the responsive mobile admin shell and adds an in-app back command;
- keeps the LINE reservation `L` marker stable;
- removes duplicate mobile customer cards by canonical customer URL;
- collapses long chat messages with an explicit expand command;
- presents broadcasts as three ordered steps and reveals coupon fields only when enabled;
- submits product image data as string form fields only.

Local image integration check:

```powershell
$env:TEST_IMAGE_PATH = (Resolve-Path '..\orimia-branding-v500\assets\orimia-icon-192.png')
node integration-test.mjs
```
