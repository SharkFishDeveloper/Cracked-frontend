/*
  Warnings:

  - You are about to drop the column `remainingMinutes` on the `Subscription` table. All the data in the column will be lost.
  - Added the required column `remainingSeconds` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Subscription" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "planName" TEXT NOT NULL,
    "remainingSeconds" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Subscription" ("createdAt", "currency", "expiresAt", "planName", "price", "razorpayOrderId", "razorpayPaymentId", "userId") SELECT "createdAt", "currency", "expiresAt", "planName", "price", "razorpayOrderId", "razorpayPaymentId", "userId" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
