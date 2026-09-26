CREATE TABLE IF NOT EXISTS "PlatformFeeProfile" (
  "accountType" TEXT NOT NULL CHECK ("accountType" IN ('SALON','DEALER')),
  "targetId" TEXT NOT NULL,
  "firstMonth" TEXT NOT NULL CHECK ("firstMonth" ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  "lastMonth" TEXT,
  "monthlyAmount" INTEGER NOT NULL CHECK ("monthlyAmount" BETWEEN 0 AND 100000000),
  "dueDay" INTEGER CHECK ("dueDay" BETWEEN 0 AND 31),
  "debitReady" BOOLEAN NOT NULL DEFAULT FALSE,
  "note" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("accountType","targetId"),
  CHECK ("lastMonth" IS NULL OR ("lastMonth" ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' AND "lastMonth">="firstMonth"))
);
CREATE TABLE IF NOT EXISTS "PlatformFeeMonth" (
  "accountType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "month" TEXT NOT NULL CHECK ("month" ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  "amount" INTEGER NOT NULL CHECK ("amount" BETWEEN 0 AND 100000000),
  "dueDate" DATE,
  "method" TEXT NOT NULL CHECK ("method" IN ('TRANSFER','DEBIT')),
  "status" TEXT NOT NULL CHECK ("status" IN ('UNPAID','PAID','PARTIAL','FAILED','EXEMPT')),
  "paidAmount" INTEGER NOT NULL DEFAULT 0 CHECK ("paidAmount">=0 AND "paidAmount"<="amount"),
  "paidDate" DATE,
  "actualMethod" TEXT CHECK ("actualMethod" IN ('TRANSFER','DEBIT')),
  "note" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedBy" TEXT NOT NULL,
  PRIMARY KEY ("accountType","targetId","month"),
  FOREIGN KEY ("accountType","targetId") REFERENCES "PlatformFeeProfile" ("accountType","targetId"),
  CHECK (("status"='PAID' AND "paidAmount"="amount" AND "paidDate" IS NOT NULL AND "actualMethod" IS NOT NULL)
    OR ("status"='PARTIAL' AND "paidAmount">0 AND "paidAmount"<"amount" AND "paidDate" IS NOT NULL AND "actualMethod" IS NOT NULL)
    OR ("status" IN ('UNPAID','FAILED','EXEMPT') AND "paidAmount"=0 AND "paidDate" IS NULL AND "actualMethod" IS NULL)),
  CHECK ("status"<>'FAILED' OR "method"='DEBIT')
);
CREATE TABLE IF NOT EXISTS "PlatformFeeAudit" (
  "id" TEXT PRIMARY KEY,
  "accountType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "month" TEXT,
  "action" TEXT NOT NULL,
  "operatorEmail" TEXT NOT NULL,
  "beforeJson" JSONB,
  "afterJson" JSONB NOT NULL,
  "reason" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "PlatformFeeAudit_target_idx" ON "PlatformFeeAudit" ("accountType","targetId","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "PlatformFeeMonth_month_idx" ON "PlatformFeeMonth" ("month","status");
