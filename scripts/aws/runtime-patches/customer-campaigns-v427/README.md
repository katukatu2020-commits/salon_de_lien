# Customer campaigns v427

Separates advertising campaigns from the existing customer notification inbox.

- `/u/news` remains the notification and chat inbox.
- `/u/campaigns` shows only active campaigns explicitly delivered to the signed-in customer.
- `/admin/customers/messages` remains the normal announcement and coupon delivery form.
- `/admin/customers/messages/campaigns` creates targeted, dated campaigns with optional private S3 advertising images.
- Campaign and recipient records use dedicated database tables and tenant-scoped authorization.

The release is an immutable child of the reviewed AWS task 426 image. The formal Prisma migration is stored with the repository; runtime `CREATE TABLE IF NOT EXISTS` guards deployment ordering without modifying existing records.
