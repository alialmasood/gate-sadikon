# Database Structure Package — Verification Notes

Structure-only deliverable for Gate Sadikon (بوابة صادقون).  
No database was modified. No migration was executed. No production data was exported.

## Audit summary

| Check | Result |
|--------|--------|
| `prisma validate` | Valid |
| Provider | PostgreSQL (`migration_lock.toml`) |
| Models in `schema.prisma` | 10 tables + 2 enums |
| Tables created across migrations | User, Office, Delegate, Formation, FormationSubDept, Transaction, Evaluation, DelegateFormationAssignment, FormFieldOption |
| App usage of Complaint | Present (`prisma.complaint` in API routes) |

## Findings (schema vs migrations)

1. **`Complaint` + `ComplaintType`**  
   Declared in `prisma/schema.prisma` and used by the application, but **no migration file** creates them. They are included in this package because they are part of the current Prisma schema / application model. Likely applied historically via `db push` or an out-of-band change.

2. **`Transaction_createdByUserId_idx`**  
   Created in migration `20260526031500_add_transaction_creator`, but **not declared** in `schema.prisma`. Included in `database-schema.sql` and `database.dbml` to reflect the applied migration structure.

3. **Logical fields without FK** (intentional in schema)  
   - `Delegate.userId`  
   - `Delegate.officeId`  
   - `Transaction.subDeptId`  

4. **Data-only migrations (excluded from structure SQL)**  
   - `20260227031910_reset_transaction_serial_numbers` — `UPDATE` only  
   - `20260526033500_backfill_transaction_creator_for_unique_reception` — `UPDATE` only  

## File sources

| File | Source |
|------|--------|
| `schema.prisma` | Exact copy of `prisma/schema.prisma` |
| `database-schema.sql` | `prisma migrate diff --from-empty --to-schema-datamodel` + index from migration `20260526031500` |
| `database.dbml` | Derived from the same structure (for dbdiagram.io) |
| `erd.mmd` | Mermaid ER diagram of the same relations |
| `VERIFICATION.md` | This audit note |

## What was intentionally omitted

- No `INSERT` / `COPY` / seed data  
- No `DATABASE_URL`, passwords, or secrets  
- No citizen / user / transaction row data  
