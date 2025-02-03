-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "expires" SET DEFAULT NOW() + interval '1 day';

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
