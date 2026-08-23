# Customer profile image v401

Narrow runtime patch built on the immutable production v400 image.

- Raises the Next.js Server Action request limit from the 1 MB default to 6 MB.
- Stops appending a second query string to private S3 signed image URLs.
- Adds a dependency-free square crop dialog before customer profile image upload.
- Keeps the v400 tenant/session isolation and all unrelated production runtime files unchanged.

The Dockerfile is pinned to the exact v400 ECR digest. `patch-runtime.mjs` fails unless every expected source marker matches exactly once.
