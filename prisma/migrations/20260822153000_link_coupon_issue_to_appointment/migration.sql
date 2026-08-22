ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "couponIssueId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_couponIssueId_key"
ON "Appointment"("couponIssueId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_couponIssueId_fkey'
  ) THEN
    ALTER TABLE "Appointment"
      ADD CONSTRAINT "Appointment_couponIssueId_fkey"
      FOREIGN KEY ("couponIssueId") REFERENCES "CouponIssue"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE "Product"
SET "imageUrl" = CASE
  WHEN "category" = 'シャンプー' THEN '/images/products/yohaku/shampoo.png'
  WHEN "category" = 'トリートメント' THEN '/images/products/yohaku/treatment.png'
  WHEN "category" = 'スタイリング剤' THEN '/images/products/yohaku/styling.png'
  WHEN "category" = 'アウトバス' THEN '/images/products/yohaku/leave-in.png'
  ELSE '/images/products/yohaku/scalp.png'
END
WHERE "organizationId" = 'org_showcase_yohaku'
  AND "active" = true
  AND ("imageUrl" IS NULL OR BTRIM("imageUrl") = '');
