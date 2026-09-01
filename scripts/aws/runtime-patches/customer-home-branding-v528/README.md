# Customer home branding v528

This protected runtime child release improves the customer home services and adds store-owned home branding.

## Changes

- Replaces the nine generic home service symbols with distinct, consistent line icons and restrained category colors.
- Renders the store-specific home image and phrase in the initial customer HTML, avoiding a post-navigation visual swap.
- Adds a `顧客アプリのホーム表示` editor to `店舗運用設定 > 店舗情報`.
- Includes a 16:9 drag-and-zoom image cropper, live preview, phrase editor, save, and reset controls.
- Stores the setting per organization and serves private images only to staff or customers in the same organization.
- Restricts changes and image uploads to store owners.

## Local verification

```powershell
node --check scripts/aws/runtime-patches/customer-home-branding-v528/customer-home-branding-v528.js
node --check scripts/aws/runtime-patches/customer-home-branding-v528/customer-home-branding-client-v528.js
node scripts/aws/runtime-patches/customer-home-branding-v528/test-service.cjs
node scripts/aws/runtime-patches/customer-home-branding-v528/browser-regression.mjs
node scripts/aws/runtime-patches/customer-home-branding-v528/local-integration.mjs
```
