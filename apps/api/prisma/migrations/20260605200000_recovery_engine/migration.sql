-- CreateEnum: Recovery Engine enums
CREATE TYPE "RecoveryTrend"    AS ENUM ('IMPROVING', 'STABLE', 'DECLINING', 'INSUFFICIENT_DATA');
CREATE TYPE "OverreachingRisk" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "EngineAction"     AS ENUM ('PROCEED', 'CAUTION', 'HOLD', 'DELOAD');

-- AlterEnum: add PROGRESSION_HELD to AdjustmentType
ALTER TYPE "AdjustmentType" ADD VALUE 'PROGRESSION_HELD';

-- CreateTable: RecoverySnapshot
CREATE TABLE "recovery_snapshots" (
  "id"                 TEXT         NOT NULL,
  "userId"             TEXT         NOT NULL,
  "windowDays"         INTEGER      NOT NULL,
  "avgScore"           DOUBLE PRECISION NOT NULL,
  "minScore"           DOUBLE PRECISION NOT NULL,
  "maxScore"           DOUBLE PRECISION NOT NULL,
  "logCount"           INTEGER      NOT NULL,
  "consecutiveLowDays" INTEGER      NOT NULL,
  "trendDirection"     "RecoveryTrend"    NOT NULL,
  "overreachingRisk"   "OverreachingRisk" NOT NULL,
  "engineAction"       "EngineAction"     NOT NULL,
  "computedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "recovery_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recovery_snapshots_userId_computedAt_idx" ON "recovery_snapshots"("userId", "computedAt");
CREATE INDEX "recovery_snapshots_userId_windowDays_idx" ON "recovery_snapshots"("userId", "windowDays");

ALTER TABLE "recovery_snapshots"
  ADD CONSTRAINT "recovery_snapshots_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
