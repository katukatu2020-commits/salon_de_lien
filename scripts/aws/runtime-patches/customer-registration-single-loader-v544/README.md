# Customer registration single loader v544

Prevents the legacy customer-booking first-paint mark from appearing at the
same time as the enhanced page-transition loader.

- Keeps one lightweight mark for the pre-runtime first paint.
- Gives the enhanced v536 loader exclusive ownership after it mounts.
- Covers cold `/u/register` loads and client navigation from `/u/login`.
- Verifies that the logo and `ORIMIA for Salon` wordmark do not overlap.

## Local verification

```powershell
docker build --build-arg BASE_IMAGE=salon-de-lien:wholesale-ordering-v543-local -t salon-de-lien:customer-registration-single-loader-v544-local scripts/aws/runtime-patches/customer-registration-single-loader-v544
docker run --rm -d --name orimia-v544-local -p 127.0.0.1:3120:3000 --env-file .env.production.local salon-de-lien:customer-registration-single-loader-v544-local
$env:VERIFY_BASE_URL='http://127.0.0.1:3120'; node scripts/aws/runtime-patches/customer-registration-single-loader-v544/local-integration.mjs
$env:VERIFY_BASE_URL='http://127.0.0.1:3120'; node scripts/aws/runtime-patches/customer-registration-single-loader-v544/browser-regression.mjs
```
