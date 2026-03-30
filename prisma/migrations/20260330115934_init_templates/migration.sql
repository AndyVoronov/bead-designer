-- CreateTable
CREATE TABLE "Bead" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "shape" TEXT NOT NULL,
    "size" REAL NOT NULL,
    "material" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Template" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "designCode" TEXT NOT NULL,
    "beadCount" INTEGER NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "isUserSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Template_designCode_key" ON "Template"("designCode");
