# Customer profile auto upload v545

Makes the customer profile image flow a single, complete interaction.

- Keeps the existing square crop dialog.
- Uploads the cropped image as soon as the crop is confirmed.
- Removes the redundant manual upload button.
- Shows accessible updating, success, and error status beside the picker.
- Suppresses the obsolete "save again" crop message on `/u/profile` only.
- Leaves staff, campaign, store, and other image crop flows unchanged.

## Local verification

```powershell
docker build --build-arg BASE_IMAGE=salon-de-lien:customer-registration-single-loader-v544-local -t salon-de-lien:customer-profile-auto-upload-v545-local scripts/aws/runtime-patches/customer-profile-auto-upload-v545
docker run --rm -d --name orimia-v545-local -p 127.0.0.1:3122:3000 --env-file .env.production.local salon-de-lien:customer-profile-auto-upload-v545-local
$env:VERIFY_BASE_URL='http://127.0.0.1:3122'; node scripts/aws/runtime-patches/customer-profile-auto-upload-v545/local-integration.mjs
$env:VERIFY_BASE_URL='http://127.0.0.1:3122'; node scripts/aws/runtime-patches/customer-profile-auto-upload-v545/browser-regression.mjs
```
