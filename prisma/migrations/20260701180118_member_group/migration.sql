-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "groupId" TEXT;

-- CreateIndex
CREATE INDEX "Member_groupId_idx" ON "Member"("groupId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
