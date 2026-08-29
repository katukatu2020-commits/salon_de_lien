# Asset persistence and banner v462

This protected runtime release makes two narrowly scoped corrections on top of the reviewed v461 production image.

- Removes the obsolete `EVENT & CAMPAIGN` cross-page banner injector.
- Resolves staff and campaign image authorization by the requesting surface (`/admin` or `/u`) instead of always preferring a concurrently present customer cookie.
- Streams authorized private S3 objects through the same-origin API instead of redirecting staff images to expiring S3 URLs.
- Preserves the existing private S3 object keys, block-public-access model, bucket versioning, and retention policy. No image is moved to container storage.

The runtime tests reproduce simultaneous staff/customer sessions and assert tenant-correct image lookup for both applications.
