-- CreateTable
CREATE TABLE "VisitCommunityPost" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitCommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitCommunityLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitCommunityLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitCommunityComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "appUserId" TEXT,
    "authorDisplayName" TEXT NOT NULL,
    "authorRole" "AppRole" NOT NULL,
    "isStylistComment" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitCommunityComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisitCommunityPost_visitId_key" ON "VisitCommunityPost"("visitId");
CREATE INDEX "VisitCommunityPost_organizationId_published_publishedAt_idx" ON "VisitCommunityPost"("organizationId", "published", "publishedAt");
CREATE INDEX "VisitCommunityPost_customerId_publishedAt_idx" ON "VisitCommunityPost"("customerId", "publishedAt");
CREATE UNIQUE INDEX "VisitCommunityLike_postId_appUserId_key" ON "VisitCommunityLike"("postId", "appUserId");
CREATE INDEX "VisitCommunityLike_appUserId_createdAt_idx" ON "VisitCommunityLike"("appUserId", "createdAt");
CREATE INDEX "VisitCommunityComment_postId_deletedAt_createdAt_idx" ON "VisitCommunityComment"("postId", "deletedAt", "createdAt");
CREATE INDEX "VisitCommunityComment_appUserId_createdAt_idx" ON "VisitCommunityComment"("appUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "VisitCommunityPost" ADD CONSTRAINT "VisitCommunityPost_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisitCommunityPost" ADD CONSTRAINT "VisitCommunityPost_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisitCommunityPost" ADD CONSTRAINT "VisitCommunityPost_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisitCommunityLike" ADD CONSTRAINT "VisitCommunityLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "VisitCommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisitCommunityLike" ADD CONSTRAINT "VisitCommunityLike_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisitCommunityComment" ADD CONSTRAINT "VisitCommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "VisitCommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisitCommunityComment" ADD CONSTRAINT "VisitCommunityComment_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
