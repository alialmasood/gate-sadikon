UPDATE "Transaction" AS t
SET "createdByUserId" = u."id"
FROM "User" AS u
WHERE t."createdByUserId" IS NULL
  AND u."officeId" = t."officeId"
  AND u."role" = 'RECEPTION'
  AND NOT EXISTS (
    SELECT 1
    FROM "User" AS u2
    WHERE u2."officeId" = t."officeId"
      AND u2."role" = 'RECEPTION'
      AND u2."id" <> u."id"
  );
