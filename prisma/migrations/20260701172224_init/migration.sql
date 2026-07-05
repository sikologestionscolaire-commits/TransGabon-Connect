-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "packName" TEXT NOT NULL DEFAULT 'Starter',
    "activeBuses" INTEGER NOT NULL DEFAULT 0,
    "commissionRate" REAL NOT NULL DEFAULT 1.0,
    "monthlyFee" INTEGER NOT NULL DEFAULT 15000,
    "logo" TEXT NOT NULL DEFAULT '🚌',
    "joinedDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "password" TEXT NOT NULL DEFAULT 'gabon2026'
);

-- CreateTable
CREATE TABLE "Bus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    CONSTRAINT "Bus_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    CONSTRAINT "Driver_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tariff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "agencyName" TEXT NOT NULL,
    "departure" TEXT NOT NULL,
    "arrival" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    CONSTRAINT "Tariff_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "agencyName" TEXT NOT NULL,
    "departure" TEXT NOT NULL,
    "arrival" TEXT NOT NULL,
    "departureTime" TEXT NOT NULL,
    "arrivalTime" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "busCapacity" INTEGER NOT NULL,
    "availableSeats" INTEGER NOT NULL,
    "busNumber" TEXT NOT NULL,
    "checkpoints" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverPhone" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "travelerName" TEXT NOT NULL,
    "travelerPhone" TEXT NOT NULL,
    "travelerCni" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentPhone" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "transactionId" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "boardedAt" TEXT,
    CONSTRAINT "Booking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agencyId" TEXT NOT NULL,
    "tripId" TEXT,
    "reviewerName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "Review_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GabonRouteInfo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "departure" TEXT NOT NULL,
    "arrival" TEXT NOT NULL,
    "distance" INTEGER NOT NULL,
    "roadCondition" TEXT NOT NULL,
    "estimatedDuration" TEXT NOT NULL,
    "checkpoints" TEXT NOT NULL
);
