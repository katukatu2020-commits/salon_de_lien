# Dealer auth self-service v548

Adds commercial authentication flows to the dealer portal while preserving the existing salon-issued invitation setup.

- `/dealer/register` sends a 30-minute, single-use email verification link before creating a dealer account.
- `/dealer/password-reset` sends the registered login ID and a 30-minute, single-use password reset link.
- Password changes increment the dealer authentication version, invalidating existing dealer sessions.
- The dealer login page exposes both flows with the same visual structure as the salon and customer applications.
- Salon-issued dealer invitations require and preserve a recovery email address, so invited accounts can also reset their password.

Local build:

```powershell
docker build --build-arg BASE_IMAGE=salon-de-lien:customer-chat-send-only-v547-local -t salon-de-lien:dealer-auth-self-service-v548-local scripts/aws/runtime-patches/dealer-auth-self-service-v548
```
