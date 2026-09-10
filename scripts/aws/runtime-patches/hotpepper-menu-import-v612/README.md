# Hot Pepper menu import v612

Adds a guarded bulk importer to the existing store-side `New menu` dialog.

## Behavior

- Accepts only `https://beauty.hotpepper.jp/slnH#########/coupon/CT00/` pages.
- Parses regular menu-table rows, excluding coupon-only blocks.
- Shows the full count and editable preview before confirmation.
- Marks existing names and Hot Pepper menu IDs as duplicates.
- Imports selected rows one at a time with visible progress and retry support.
- Keeps the original manual menu form unchanged when import mode is off.
- Treats duration as an editable estimate because Hot Pepper's menu table does not provide duration.

## Verification

```powershell
docker build --build-arg BASE_IMAGE=salon-de-lien:style-community-rerender-v611-local `
  -t salon-de-lien:hotpepper-menu-import-v612-local `
  scripts/aws/runtime-patches/hotpepper-menu-import-v612

$env:SMOKE_BASE_URL='http://localhost:3613'
node scripts/aws/runtime-patches/hotpepper-menu-import-v612/browser-regression.mjs
```

Set `HOTPEPPER_MENU_LIVE_SMOKE=1` when running `integration.mjs` to verify the live page parser without importing records.
