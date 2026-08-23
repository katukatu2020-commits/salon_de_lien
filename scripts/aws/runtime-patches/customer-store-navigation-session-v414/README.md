# Customer store navigation session v414

This immutable runtime patch fixes the customer-app redirect to `/u/login`
after selecting a registered store and navigating to another page.

The store switch already issued a per-browser signed session and the custom
server already authorized `CustomerStoreLink`. The bundled Next.js account
layout still accepted only the account's canonical store, so its authorization
result disagreed with the custom server on the next request.

This patch updates all three bundled copies of the customer-session resolver to
accept either the canonical customer record or a registered `CustomerStoreLink`.
It deliberately does not mutate `AppUser.organizationId` or `AppUser.customerId`,
so two devices can select different registered stores without invalidating one
another.

The parent image is pinned to the approved task 413 digest. No local application
build or unrelated runtime file is copied into the release.
