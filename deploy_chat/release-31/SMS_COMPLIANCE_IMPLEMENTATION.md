# AWS SMS compliance implementation

## Implemented behavior

- Account verification and appointment notifications are separate SMS purposes.
- The registration page calls the OTP request endpoint only when the customer presses **認証コードを送信**. Page display and phone entry do not send SMS.
- OTP SMS does not read or require `smsTransactionalOptIn`.
- Japanese mobile numbers are normalized to `+81` E.164 before lookup and storage.
- `CustomerPhoneIdentity` enforces one phone identity per organization and phone number.
- OTP codes are stored as HMAC hashes, expire after 10 minutes, and allow at most five verification attempts.
- OTP delivery is limited to three sends per phone/hour, ten sends per request IP/hour, and one send per phone/minute.
- Appointment SMS consent defaults to OFF and is changed only from the authenticated customer portal.
- Appointment SMS is sent only after server-side checks for a phone identity, verification timestamp, active opt-in, and no opt-out timestamp.
- The appointment SMS types are confirmation, reminder, changed, and cancelled.
- Generic bulk/marketing SMS is blocked server-side. App and email broadcasts remain available.
- The sender configuration remains AWS SNS with Sender ID `SalonLien`.
- OTP values are never written to `SmsSendLog`.

## Main files

- `patch-sms-compliance.js`: runtime UI, OTP audit integration, consent endpoint/page, appointment event observer, server-side SMS gate, admin read-only status, and bulk-SMS block.
- `sms-compliance-migration.sql`: consent fields, verification timestamps, OTP send metadata, send log, constraints, verification trigger, and appointment observer state.
- `verify-sms-compliance.js`: build-time compliance assertions.
- `Dockerfile.sms-compliance` / `buildspec.yml`: reproducible image build and deployment artifact.

## AWS appeal summary

**Account verification OTP use case:** We use SMS to verify that a customer controls the Japanese mobile number entered during account registration.

**How the user requests the OTP:** The registration page clearly explains that the phone number is used for identity verification. No SMS is sent on page load or phone-number entry. An OTP is sent only after the customer presses the “Send verification code” button, which calls the OTP request endpoint.

**Why the OTP is required:** Registration cannot be completed without a successfully verified, unexpired OTP challenge and registration token.

**How duplicate accounts are prevented:** Mobile numbers are normalized to E.164 before comparison. A database unique constraint on organization and normalized phone number prevents the same number from being attached to multiple customer accounts in the salon organization. The duplicate check and phone-identity creation also run inside the registration transaction.

**Appointment notification use case:** We send reservation confirmation, reminder, change, and cancellation messages. We do not use this consent for marketing or bulk SMS.

**How users opt in:** In the authenticated customer portal, users may select an unchecked-by-default checkbox labeled “Receive reservation confirmations, changes/cancellations, and reminders by SMS.” Phone verification does not enable this checkbox automatically.

**How consent is recorded:** We store the current opt-in boolean, opt-in timestamp, opt-out timestamp, and consent source (`customer_portal`). Existing customers were migrated with opt-in set to false.

**How users opt out:** Users can turn the setting off in the same authenticated page. The system immediately records opt-in as false and saves the opt-out timestamp.

**How non-consenting sends are prevented:** A shared server-side sender checks for a verified phone identity, `smsTransactionalOptIn === true`, and no opt-out timestamp before invoking AWS SNS. Failed eligibility checks are logged as skipped and never call SNS. Generic bulk SMS is blocked server-side.

**SMS message types:** `ACCOUNT_VERIFICATION_OTP`, `RESERVATION_CONFIRMATION`, `RESERVATION_REMINDER`, `RESERVATION_CHANGED`, and `RESERVATION_CANCELLED`.
