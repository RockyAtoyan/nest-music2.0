-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "expires" SET DEFAULT NOW() + interval '1 day';

-- AlterTable
ALTER TABLE "Playlist" ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
