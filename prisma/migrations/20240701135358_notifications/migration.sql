-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "link" TEXT,
    "text" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_NotificationToPerson" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_NotificationToPerson_AB_unique" ON "_NotificationToPerson"("A", "B");

-- CreateIndex
CREATE INDEX "_NotificationToPerson_B_index" ON "_NotificationToPerson"("B");

-- AddForeignKey
ALTER TABLE "_NotificationToPerson" ADD CONSTRAINT "_NotificationToPerson_A_fkey" FOREIGN KEY ("A") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NotificationToPerson" ADD CONSTRAINT "_NotificationToPerson_B_fkey" FOREIGN KEY ("B") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
