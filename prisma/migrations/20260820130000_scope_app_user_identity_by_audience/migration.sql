-- Customer and store-side accounts are separate authentication audiences.
-- The same address/login ID may exist once in each audience, while duplicates
-- inside either audience remain prohibited case-insensitively.
DROP INDEX IF EXISTS "AppUser_email_key";
DROP INDEX IF EXISTS "AppUser_loginId_key";

CREATE INDEX IF NOT EXISTS "AppUser_email_idx" ON "AppUser"("email");
CREATE INDEX IF NOT EXISTS "AppUser_loginId_idx" ON "AppUser"("loginId");

CREATE UNIQUE INDEX IF NOT EXISTS "AppUser_customer_email_ci_key"
  ON "AppUser" (LOWER("email"))
  WHERE "role" = 'CUSTOMER';

CREATE UNIQUE INDEX IF NOT EXISTS "AppUser_backoffice_email_ci_key"
  ON "AppUser" (LOWER("email"))
  WHERE "role" IN ('ADMIN', 'STAFF', 'MANUFACTURER');

CREATE UNIQUE INDEX IF NOT EXISTS "AppUser_customer_login_id_ci_key"
  ON "AppUser" (LOWER("loginId"))
  WHERE "role" = 'CUSTOMER' AND "loginId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "AppUser_backoffice_login_id_ci_key"
  ON "AppUser" (LOWER("loginId"))
  WHERE "role" IN ('ADMIN', 'STAFF', 'MANUFACTURER') AND "loginId" IS NOT NULL;
