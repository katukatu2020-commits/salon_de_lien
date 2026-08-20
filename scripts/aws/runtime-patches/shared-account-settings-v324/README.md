# Shared account settings v324

This image patch keeps the store shared account card inside the canonical account
settings layout, removes it from query-panel variants such as attendance, and
accepts the public Salon de Lien origin when requests arrive through CloudFront.

Build from the runtime-patches directory so the canonical v318 service and client
files remain the single source of truth:

```powershell
docker build --build-arg BASE_IMAGE=salon-de-lien:attendance-notification-product-v323 `
  -f shared-account-settings-v324/Dockerfile `
  -t salon-de-lien:shared-account-settings-v324 .
```
