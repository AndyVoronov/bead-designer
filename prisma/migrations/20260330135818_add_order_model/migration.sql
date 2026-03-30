-- CreateTable
CREATE TABLE "Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "designCode" TEXT NOT NULL,
    "designState" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "beadCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_designCode_key" ON "Order"("designCode");
