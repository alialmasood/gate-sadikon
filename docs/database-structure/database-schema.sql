-- =============================================================================
-- Gate Sadikon (بوابة صادقون) — Database Structure Only
-- Engine: PostgreSQL 16
-- Source: prisma/schema.prisma (via `prisma migrate diff --from-empty --to-schema-datamodel`)
--          + applied migration index Transaction_createdByUserId_idx
-- Generated: structure/schema only — NO DATA (no INSERT / COPY / UPDATE)
-- =============================================================================

-- CreateEnum
CREATE TYPE "Role" AS ENUM (
    'SUPER_ADMIN',
    'ADMIN',
    'USER',
    'AUDITOR',
    'COORDINATOR',
    'RECEPTION',
    'SORTING',
    'DOCUMENTATION',
    'PARLIAMENT_MEMBER',
    'SUPERVISION'
);

-- CreateEnum
CREATE TYPE "ComplaintType" AS ENUM (
    'SECRET',
    'PUBLIC'
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "avatarUrl" TEXT,
    "ministry" TEXT,
    "department" TEXT,
    "assignmentDate" TIMESTAMP(3),
    "serialNumber" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "officeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "rating" INTEGER,
    "notes" TEXT,
    "evaluatedById" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "managerId" TEXT,
    "managerName" TEXT,
    "managerPhone" TEXT,
    "managerAvatarUrl" TEXT,
    "assignmentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delegate" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "userId" TEXT,
    "officeId" TEXT,
    "formationIds" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delegate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelegateFormationAssignment" (
    "id" TEXT NOT NULL,
    "delegateId" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "subDeptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DelegateFormationAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormationSubDept" (
    "id" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormationSubDept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT,
    "citizenName" TEXT,
    "citizenPhone" TEXT,
    "citizenAddress" TEXT,
    "citizenIsEmployee" BOOLEAN,
    "citizenEmployeeSector" TEXT,
    "citizenMinistry" TEXT,
    "citizenDepartment" TEXT,
    "citizenOrganization" TEXT,
    "officeId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "delegateId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "type" TEXT,
    "transactionType" TEXT,
    "transactionTitle" TEXT,
    "submissionDate" TIMESTAMP(3),
    "formationId" TEXT,
    "subDeptId" TEXT,
    "serialNumber" TEXT,
    "attachments" JSONB,
    "delegateActions" JSONB,
    "completedAt" TIMESTAMP(3),
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "cannotComplete" BOOLEAN NOT NULL DEFAULT false,
    "cannotCompleteReason" TEXT,
    "reachedSorting" BOOLEAN NOT NULL DEFAULT false,
    "completedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "assignedFromSection" TEXT,
    "sourceSection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "type" "ComplaintType" NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormFieldOption" (
    "id" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormFieldOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_serialNumber_key" ON "User"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_entityType_entityId_period_key" ON "Evaluation"("entityType", "entityId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "DelegateFormationAssignment_delegateId_formationId_subDeptI_key" ON "DelegateFormationAssignment"("delegateId", "formationId", "subDeptId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_serialNumber_key" ON "Transaction"("serialNumber");

-- CreateIndex
-- Present in applied migration 20260526031500_add_transaction_creator (not declared in schema.prisma)
CREATE INDEX "Transaction_createdByUserId_idx" ON "Transaction"("createdByUserId");

-- CreateIndex
CREATE INDEX "FormFieldOption_fieldKey_enabled_sortOrder_idx" ON "FormFieldOption"("fieldKey", "enabled", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FormFieldOption_fieldKey_value_key" ON "FormFieldOption"("fieldKey", "value");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_evaluatedById_fkey" FOREIGN KEY ("evaluatedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Office" ADD CONSTRAINT "Office_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegateFormationAssignment" ADD CONSTRAINT "DelegateFormationAssignment_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "Delegate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegateFormationAssignment" ADD CONSTRAINT "DelegateFormationAssignment_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegateFormationAssignment" ADD CONSTRAINT "DelegateFormationAssignment_subDeptId_fkey" FOREIGN KEY ("subDeptId") REFERENCES "FormationSubDept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormationSubDept" ADD CONSTRAINT "FormationSubDept_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "Delegate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
