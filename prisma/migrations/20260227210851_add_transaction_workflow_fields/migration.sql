-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "cannotComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reachedSorting" BOOLEAN NOT NULL DEFAULT false;
