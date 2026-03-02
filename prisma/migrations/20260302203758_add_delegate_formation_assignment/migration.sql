-- CreateTable
CREATE TABLE "DelegateFormationAssignment" (
    "id" TEXT NOT NULL,
    "delegateId" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "subDeptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DelegateFormationAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DelegateFormationAssignment_delegateId_formationId_subDeptI_key" ON "DelegateFormationAssignment"("delegateId", "formationId", "subDeptId");

-- AddForeignKey
ALTER TABLE "DelegateFormationAssignment" ADD CONSTRAINT "DelegateFormationAssignment_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "Delegate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegateFormationAssignment" ADD CONSTRAINT "DelegateFormationAssignment_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegateFormationAssignment" ADD CONSTRAINT "DelegateFormationAssignment_subDeptId_fkey" FOREIGN KEY ("subDeptId") REFERENCES "FormationSubDept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
