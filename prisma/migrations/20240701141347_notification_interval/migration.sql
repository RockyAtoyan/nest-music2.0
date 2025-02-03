-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "expires" SET DEFAULT NOW() + interval '1 day';
