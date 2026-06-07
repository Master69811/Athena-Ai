-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM (
  'WEIGHT_INCREASE', 'WEIGHT_DECREASE',
  'REPS_INCREASE', 'REPS_DECREASE',
  'SETS_INCREASE', 'SETS_DECREASE',
  'DELOAD', 'DELOAD_END',
  'EXERCISE_SWAP', 'RPE_ADJUST'
);

-- AlterTable: WorkoutExercise
ALTER TABLE "workout_exercises"
  ADD COLUMN "recommendedWeightKg" DOUBLE PRECISION,
  ADD COLUMN "deloadActive"        BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: AIProgressionDecision
ALTER TABLE "ai_progression_decisions"
  ADD COLUMN "isApplied"          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "appliedToVersionId" TEXT;

CREATE INDEX "ai_progression_decisions_userId_isApplied_idx"
  ON "ai_progression_decisions"("userId", "isApplied");

-- CreateTable: ProgramVersion
CREATE TABLE "program_versions" (
  "id"            TEXT        NOT NULL,
  "userId"        TEXT        NOT NULL,
  "planId"        TEXT        NOT NULL,
  "versionNumber" INTEGER     NOT NULL,
  "snapshot"      JSONB       NOT NULL,
  "triggerReason" TEXT        NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "program_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "program_versions_planId_idx"  ON "program_versions"("planId");
CREATE INDEX "program_versions_userId_idx"  ON "program_versions"("userId");

ALTER TABLE "program_versions"
  ADD CONSTRAINT "program_versions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "program_versions_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "workout_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: ProgramAdjustment
CREATE TABLE "program_adjustments" (
  "id"              TEXT         NOT NULL,
  "userId"          TEXT         NOT NULL,
  "planId"          TEXT         NOT NULL,
  "planExerciseId"  TEXT,
  "versionId"       TEXT         NOT NULL,
  "decisionId"      TEXT,
  "type"            "AdjustmentType" NOT NULL,
  "field"           TEXT         NOT NULL,
  "oldValue"        JSONB        NOT NULL,
  "newValue"        JSONB        NOT NULL,
  "rationale"       TEXT         NOT NULL,
  "isReverted"      BOOLEAN      NOT NULL DEFAULT false,
  "revertedAt"      TIMESTAMP(3),
  "revertAfterDate" TIMESTAMP(3),
  "appliedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "program_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "program_adjustments_planId_idx"         ON "program_adjustments"("planId");
CREATE INDEX "program_adjustments_planExerciseId_idx" ON "program_adjustments"("planExerciseId");
CREATE INDEX "program_adjustments_decisionId_idx"     ON "program_adjustments"("decisionId");
CREATE INDEX "program_adjustments_revertAfterDate_idx"
  ON "program_adjustments"("revertAfterDate")
  WHERE "isReverted" = false;

ALTER TABLE "program_adjustments"
  ADD CONSTRAINT "program_adjustments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "program_adjustments_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "workout_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "program_adjustments_planExerciseId_fkey"
    FOREIGN KEY ("planExerciseId") REFERENCES "workout_exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "program_adjustments_versionId_fkey"
    FOREIGN KEY ("versionId") REFERENCES "program_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "program_adjustments_decisionId_fkey"
    FOREIGN KEY ("decisionId") REFERENCES "ai_progression_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
