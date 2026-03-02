-- Add period column (nullable first)
ALTER TABLE "Evaluation" ADD COLUMN "period" TEXT;

-- Populate period from evaluatedAt for existing rows
UPDATE "Evaluation" SET "period" = to_char("evaluatedAt", 'YYYY-MM') WHERE "period" IS NULL;

-- Make period NOT NULL
ALTER TABLE "Evaluation" ALTER COLUMN "period" SET NOT NULL;

-- Drop old unique constraint
DROP INDEX IF EXISTS "Evaluation_entityType_entityId_key";

-- Create new unique constraint (entityType, entityId, period)
CREATE UNIQUE INDEX "Evaluation_entityType_entityId_period_key" ON "Evaluation"("entityType", "entityId", "period");
