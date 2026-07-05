-- CreateTable
CREATE TABLE "Parcel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderName" TEXT NOT NULL,
    "senderPhone" TEXT NOT NULL,
    "receiverName" TEXT NOT NULL,
    "receiverPhone" TEXT NOT NULL,
    "departure" TEXT NOT NULL,
    "arrival" TEXT NOT NULL,
    "weight" REAL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "tripId" TEXT,
    "createdAt" TEXT NOT NULL,
    "deliveredAt" TEXT,
    CONSTRAINT "Parcel_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Parcel_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
