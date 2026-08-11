-- Add customer service and staff preferences without changing existing records.
ALTER TABLE "Customer"
ADD COLUMN "servicePreference" TEXT,
ADD COLUMN "staffAssignmentType" TEXT,
ADD COLUMN "assignedStaffName" TEXT;

-- Keep curl separate from hair texture so both can be recorded independently.
ALTER TABLE "HairProfile"
ADD COLUMN "hairCurl" TEXT;
