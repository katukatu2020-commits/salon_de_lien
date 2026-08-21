# community-publish-header-v337

- Makes the desktop header page label keyboard- and pointer-clickable, linking to the current section root.
- Adds a commercial-quality `新しいスタイルを投稿` action to `/admin/community`.
- Staff choose an organization-owned customer visit, upload up to four normalized images, confirm customer publication consent, and publish through the existing `VisitCommunityPost` model.
- Images are normalized with Sharp and stored in the existing private S3 bucket with AES256 server-side encryption.
- All customer/visit queries and writes are scoped to the authenticated organization.
