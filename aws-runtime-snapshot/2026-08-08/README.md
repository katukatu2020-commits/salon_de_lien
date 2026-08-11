# AWS runtime snapshot — 2026-08-08

This directory is a recovery snapshot extracted from the exact container image deployed to the Salon de Lien staging ECS service.

- ECR repository: `salon-de-lien-staging-app`
- Image tag: `owner-broadcasts-20260808-01`
- Image digest: `sha256:63093d356753aa3cc3f0185441569e049064fb4b8666f726c0452de0201ba7de`
- Pushed: `2026-08-08T15:14:18.539+09:00`
- Platform: `linux/amd64`

## Included

- Compiled Next.js client and server output (`.next`)
- Prisma schema and all migrations present in the image
- Public assets
- Runtime scripts present in the final image
- Runtime `package.json`, `server.js`, and the small source asset directory retained by the image

## Not included

- `node_modules` (reinstall from `package.json`)
- Environment variables, AWS Secrets Manager values, credentials, customer data, or database contents
- Base operating-system files from the container

## Recovery limitation

The final production container does not contain the original TypeScript application source or Git history. The `.next` directory is compiled output and preserves the deployed application logic, but it is not a maintainable substitute for the original source tree. The original development checkout used to build this image is still required for normal feature development.

