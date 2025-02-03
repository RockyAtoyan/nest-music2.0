/*
  Warnings:

  - You are about to drop the `_NotificationToPerson` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userId` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_NotificationToPerson" DROP CONSTRAINT "_NotificationToPerson_A_fkey";

-- DropForeignKey
ALTER TABLE "_NotificationToPerson" DROP CONSTRAINT "_NotificationToPerson_B_fkey";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "_NotificationToPerson";

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
