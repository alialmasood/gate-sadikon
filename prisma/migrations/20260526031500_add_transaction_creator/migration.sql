ALTER TABLE "Transaction"
ADD COLUMN "createdByUserId" TEXT;

CREATE INDEX "Transaction_createdByUserId_idx"
ON "Transaction"("createdByUserId");

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
