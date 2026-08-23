ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "publicCode" TEXT;
ALTER TABLE "AppUser" ADD COLUMN IF NOT EXISTS "nickname" TEXT;

ALTER TABLE "StaffBookingSetting" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "StaffBookingSetting" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "StaffBookingSetting" ADD COLUMN IF NOT EXISTS "onLeave" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "StaffProfileSetting" ADD COLUMN IF NOT EXISTS "profileImageKey" TEXT;
ALTER TABLE "StaffProfileSetting" ADD COLUMN IF NOT EXISTS "roleLabel" TEXT;
ALTER TABLE "StaffProfileSetting" ADD COLUMN IF NOT EXISTS "specialties" TEXT;

UPDATE "Organization"
SET "publicCode" = CASE
  WHEN "id" = 'org_salon_de_lien' THEN 'LIEN-SALON'
  WHEN "id" = 'org_showcase_yohaku' THEN 'LIEN-YOHAKU'
  ELSE 'STORE-' || UPPER(SUBSTRING(MD5("id") FROM 1 FOR 8))
END
WHERE "publicCode" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_publicCode_key"
  ON "Organization"("publicCode")
  WHERE "publicCode" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "StaffBookingSetting_org_active_leave_idx"
  ON "StaffBookingSetting"("organizationId", "active", "onLeave");
CREATE INDEX IF NOT EXISTS "StaffBookingSetting_org_user_idx"
  ON "StaffBookingSetting"("organizationId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "StaffBookingSetting_org_user_unique"
  ON "StaffBookingSetting"("organizationId", "userId")
  WHERE "userId" IS NOT NULL;

INSERT INTO "StaffBookingSetting" (
  "id", "organizationId", "staffKey", "staffName", "maxConcurrentAppointments",
  "workStartMinutes", "workEndMinutes", "active", "onLeave", "createdAt", "updatedAt"
)
VALUES
  ('staff-setting-lien-tanizaki', 'org_salon_de_lien', 'tanizaki', '谷崎 太二', 2, 600, 1140, TRUE, FALSE, NOW(), NOW()),
  ('staff-setting-lien-watanabe', 'org_salon_de_lien', 'watanabe', '渡邊 浩明', 1, 600, 1140, TRUE, FALSE, NOW(), NOW()),
  ('staff-setting-lien-asano', 'org_salon_de_lien', 'asano', '浅野 清美', 1, 600, 1140, TRUE, FALSE, NOW(), NOW()),
  ('staff-setting-lien-kobayashi', 'org_salon_de_lien', 'kobayashi', '小林 美奈子', 1, 600, 1140, TRUE, FALSE, NOW(), NOW()),
  ('staff-setting-lien-kaori', 'org_salon_de_lien', 'kaori', 'kaori', 1, 600, 1140, TRUE, FALSE, NOW(), NOW())
ON CONFLICT ("organizationId", "staffKey") DO NOTHING;

UPDATE "StaffBookingSetting" AS setting
SET "userId" = (
  SELECT account."id"
  FROM "AppUser" AS account
  WHERE account."organizationId" = setting."organizationId"
    AND account."role" IN ('ADMIN', 'STAFF')
    AND account."active" = TRUE
    AND (
      REGEXP_REPLACE(COALESCE(account."displayName", ''), '[[:space:]　]', '', 'g') =
        REGEXP_REPLACE(setting."staffName", '[[:space:]　]', '', 'g')
      OR LOWER(COALESCE(account."loginId", '')) = setting."staffKey"
      OR (setting."staffKey" = 'tanizaki' AND LOWER(COALESCE(account."loginId", '')) = 'lien')
    )
  ORDER BY CASE WHEN account."role" = 'STAFF' THEN 0 ELSE 1 END, account."createdAt"
  LIMIT 1
)
WHERE setting."userId" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "AppUser" AS account
    WHERE account."organizationId" = setting."organizationId"
      AND account."role" IN ('ADMIN', 'STAFF')
      AND account."active" = TRUE
      AND (
        REGEXP_REPLACE(COALESCE(account."displayName", ''), '[[:space:]　]', '', 'g') =
          REGEXP_REPLACE(setting."staffName", '[[:space:]　]', '', 'g')
        OR LOWER(COALESCE(account."loginId", '')) = setting."staffKey"
        OR (setting."staffKey" = 'tanizaki' AND LOWER(COALESCE(account."loginId", '')) = 'lien')
      )
  );

INSERT INTO "StaffProfileSetting" (
  "id", "organizationId", "userId", "introduction", "roleLabel", "createdAt", "updatedAt"
)
SELECT
  'staff-profile-' || SUBSTRING(MD5(setting."organizationId" || ':' || setting."userId") FROM 1 FOR 24),
  setting."organizationId",
  setting."userId",
  '',
  CASE WHEN account."role" = 'ADMIN' THEN 'オーナー・スタイリスト' ELSE 'スタイリスト' END,
  NOW(),
  NOW()
FROM "StaffBookingSetting" AS setting
JOIN "AppUser" AS account ON account."id" = setting."userId"
WHERE setting."userId" IS NOT NULL
ON CONFLICT ("organizationId", "userId") DO NOTHING;
