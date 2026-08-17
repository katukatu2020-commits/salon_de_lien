# Release 293: customer-store linking

This is a runtime-only child image of the exact AWS release 292 image. It keeps the compiled Next.js application unchanged and adds only the following bounded behavior:

- square crop dialog for profile and store icon uploads;
- Code 39 membership barcode on the customer home;
- member-code lookup and customer linking from the admin customer list;
- store QR lookup, confirmation, and linking from the customer app;
- organization-specific store QR display in store settings;
- duplicate-safe writes through `CustomerStoreLink`.

The parent runtime hashes are asserted before patching. The image build fails if the AWS parent no longer matches the audited release 292 runtime.
