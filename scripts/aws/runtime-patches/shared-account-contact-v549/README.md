# Shared account and public contact v549

- Makes the store-shared account save operation update an existing account or create the missing initial account in one server-side transaction.
- Rejects login IDs that collide with either another account's login ID or email, while allowing the current shared account to be updated.
- Returns the persisted account state to the settings UI and confirms that the saved ID can be used for store login.
- Updates the public ORIMIA contact number, including the telephone link, to `070-9444-6007` on the home, privacy, and terms pages.

Local build:

```powershell
docker build --build-arg BASE_IMAGE=salon-de-lien:dealer-auth-self-service-v548-local -t salon-de-lien:shared-account-contact-v549-local scripts/aws/runtime-patches/shared-account-contact-v549
```
